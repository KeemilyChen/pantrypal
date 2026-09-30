-- Community tags + Explore. Additive; does not drop inventory or auth tables.

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.recipes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%source%';
  if constraint_name is not null then
    execute format('alter table public.recipes drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.recipes
  add column if not exists is_public boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.recipes
  add constraint recipes_source_check check (source in ('system', 'user', 'ai'));

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'other' check (kind in ('cuisine', 'diet', 'ingredient', 'meal', 'method', 'other')),
  created_at timestamptz not null default now(),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 64)
);

create index if not exists tags_kind_idx on public.tags (kind);

create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  source text not null default 'ai' check (source in ('ai', 'user', 'ingredient')),
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id)
);

create index if not exists recipe_tags_tag_id_idx on public.recipe_tags (tag_id);

alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )),
    ''
  );
$$;

create or replace function public.upsert_tag(p_name text, p_kind text default 'other')
returns public.tags
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.tags;
  v_slug text;
  v_kind text;
  v_name text;
begin
  v_name := trim(both from regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_slug := public.slugify(v_name);
  if v_slug is null then
    raise exception 'invalid tag';
  end if;
  v_kind := case
    when p_kind in ('cuisine', 'diet', 'ingredient', 'meal', 'method', 'other') then p_kind
    else 'other'
  end;

  insert into public.tags (slug, name, kind)
  values (v_slug, left(v_name, 48), v_kind)
  on conflict (slug) do nothing;

  select * into result from public.tags where slug = v_slug;
  return result;
end;
$$;

create or replace view public.profile_interests
with (security_invoker = true) as
select
  r.user_id,
  rt.tag_id,
  count(*)::int as weight,
  max(r.published_at) as last_published_at
from public.recipes r
join public.recipe_tags rt on rt.recipe_id = r.id
where r.is_public = true and r.user_id is not null
group by r.user_id, rt.tag_id;

drop policy if exists "read public recipes" on public.recipes;
create policy "read public recipes" on public.recipes
  for select using (is_public = true);

drop policy if exists "read recipe ingredients" on public.recipe_ingredients;
create policy "read recipe ingredients" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.source = 'system' or r.is_public = true or r.user_id = auth.uid())
    )
  );

drop policy if exists "authenticated read tags" on public.tags;
create policy "authenticated read tags" on public.tags
  for select to authenticated
  using (true);

drop policy if exists "authenticated insert tags" on public.tags;
create policy "authenticated insert tags" on public.tags
  for insert to authenticated
  with check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 64);

drop policy if exists "read recipe tags" on public.recipe_tags;
create policy "read recipe tags" on public.recipe_tags
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.source = 'system' or r.is_public = true or r.user_id = auth.uid())
    )
  );

drop policy if exists "write own recipe tags" on public.recipe_tags;
create policy "write own recipe tags" on public.recipe_tags
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create or replace function public.explore_recipes(
  search text default '',
  tag_slugs text[] default '{}'::text[]
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  description text,
  instructions jsonb,
  prep_time integer,
  cook_time integer,
  servings integer,
  source text,
  image_url text,
  published_at timestamptz,
  score integer,
  tags jsonb,
  ingredients jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select trim(coalesce(search, '')) as q
  ),
  wanted as (
    select distinct public.slugify(s) as slug
    from unnest(coalesce(tag_slugs, '{}'::text[])) as s
    where public.slugify(s) is not null
  ),
  interests as (
    select pi.tag_id, pi.weight
    from public.profile_interests pi
    where pi.user_id = auth.uid()
  ),
  scored as (
    select
      r.*,
      coalesce((
        select sum(i.weight)::int
        from public.recipe_tags rt
        join interests i on i.tag_id = rt.tag_id
        where rt.recipe_id = r.id
      ), 0) as score
    from public.recipes r
    where r.is_public = true
      and r.user_id is distinct from auth.uid()
      and (
        not exists (select 1 from wanted)
        or exists (
          select 1
          from public.recipe_tags rt
          join public.tags t on t.id = rt.tag_id
          join wanted w on w.slug = t.slug
          where rt.recipe_id = r.id
        )
      )
      and (
        (select q from q) = ''
        or r.name ilike '%' || (select q from q) || '%'
        or r.description ilike '%' || (select q from q) || '%'
        or exists (
          select 1
          from public.recipe_tags rt
          join public.tags t on t.id = rt.tag_id
          where rt.recipe_id = r.id
            and (
              t.name ilike '%' || (select q from q) || '%'
              or t.slug ilike '%' || (select q from q) || '%'
            )
        )
      )
  )
  select
    s.id,
    s.user_id,
    s.name,
    s.description,
    s.instructions,
    s.prep_time,
    s.cook_time,
    s.servings,
    s.source,
    s.image_url,
    s.published_at,
    s.score,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'name', t.name,
        'kind', t.kind,
        'source', rt.source
      ) order by t.name)
      from public.recipe_tags rt
      join public.tags t on t.id = rt.tag_id
      where rt.recipe_id = s.id
    ), '[]'::jsonb) as tags,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ri.id,
        'ingredientName', ri.ingredient_name,
        'quantity', ri.quantity,
        'unit', ri.unit,
        'optional', ri.optional
      ) order by ri.ingredient_name)
      from public.recipe_ingredients ri
      where ri.recipe_id = s.id
    ), '[]'::jsonb) as ingredients
  from scored s
  order by s.score desc, s.published_at desc nulls last, s.created_at desc
  limit 50;
$$;

grant select, insert on public.tags to authenticated;
grant select, insert, delete, update on public.recipe_tags to authenticated;
grant select on public.profile_interests to authenticated;
grant execute on function public.slugify(text) to authenticated;
grant execute on function public.upsert_tag(text, text) to authenticated;
grant execute on function public.explore_recipes(text, text[]) to authenticated;
