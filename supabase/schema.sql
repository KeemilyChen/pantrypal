-- PantryPal schema. Run in the Supabase SQL editor.
-- Enable required extensions
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Friend',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'other',
  quantity numeric not null default 1,
  unit text not null default 'count',
  storage_location text not null check (storage_location in ('fridge', 'freezer', 'pantry')),
  purchase_date date,
  expiration_date date,
  status text not null default 'available' check (status in ('available', 'used', 'expired', 'discarded')),
  source text not null default 'manual' check (source in ('manual', 'receipt', 'recipe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  store_name text,
  purchase_date date,
  total_amount numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  price numeric,
  category text,
  matched_inventory_item_id uuid references public.inventory_items (id) on delete set null
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions jsonb not null default '[]'::jsonb,
  prep_time integer not null default 0,
  cook_time integer not null default 0,
  servings integer not null default 2,
  source text not null default 'user' check (source in ('system', 'user', 'ai')),
  image_url text,
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_name text not null,
  quantity numeric,
  unit text,
  optional boolean not null default false
);

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  status text not null default 'planned' check (status in ('planned', 'cooked', 'skipped')),
  unique (user_id, date, meal_type)
);

create table if not exists public.shopping_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  category text not null default 'other',
  checked boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'meal_plan', 'low_inventory')),
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'other' check (kind in ('cuisine', 'diet', 'ingredient', 'meal', 'method', 'other')),
  created_at timestamptz not null default now(),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 64)
);

create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  source text not null default 'ai' check (source in ('ai', 'user', 'ingredient')),
  created_at timestamptz not null default now(),
  primary key (recipe_id, tag_id)
);

create index if not exists tags_kind_idx on public.tags (kind);
create index if not exists recipe_tags_tag_id_idx on public.recipe_tags (tag_id);

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_list enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own inventory" on public.inventory_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own receipts" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "receipt items via receipt" on public.receipt_items
  for all using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  );

create policy "read system or own recipes" on public.recipes
  for select using (source = 'system' or auth.uid() = user_id);

create policy "read public recipes" on public.recipes
  for select using (is_public = true);

create policy "write own recipes" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read recipe ingredients" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.source = 'system' or r.is_public = true or r.user_id = auth.uid())
    )
  );

create policy "write own recipe ingredients" on public.recipe_ingredients
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

create policy "own meal plans" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own shopping list" on public.shopping_list
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Friend'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from anon, public, authenticated;

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

create policy "authenticated read tags" on public.tags
  for select to authenticated
  using (true);

create policy "authenticated insert tags" on public.tags
  for insert to authenticated
  with check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 64);

create policy "read recipe tags" on public.recipe_tags
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.source = 'system' or r.is_public = true or r.user_id = auth.uid())
    )
  );

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

-- Community Explore (nutrition, likes, meal-plan templates, RPCs)
-- Community Explore: nutrition, likes/saves/interactions, meal-plan templates, profile read, explore feed.

alter table public.recipes
  add column if not exists calories numeric,
  add column if not exists protein_g numeric,
  add column if not exists carbs_g numeric,
  add column if not exists fat_g numeric,
  add column if not exists nutrition_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'recipes_nutrition_source_check'
  ) then
    alter table public.recipes
      add constraint recipes_nutrition_source_check
      check (nutrition_source is null or nutrition_source in ('ai_estimate', 'user'));
  end if;
end $$;

create table if not exists public.community_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('recipe', 'meal_plan')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index if not exists community_likes_target_idx on public.community_likes (target_type, target_id);

create table if not exists public.community_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('recipe', 'meal_plan')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index if not exists community_saves_target_idx on public.community_saves (target_type, target_id);

create table if not exists public.community_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('recipe', 'meal_plan')),
  target_id uuid not null,
  kind text not null check (kind in ('cook', 'open', 'tag_click', 'plan')),
  tag_id uuid references public.tags (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists community_interactions_user_idx on public.community_interactions (user_id, created_at desc);

create table if not exists public.meal_plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plan_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.meal_plan_templates (id) on delete cascade,
  day_offset integer not null default 0 check (day_offset >= 0 and day_offset < 21),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  unique (template_id, day_offset, meal_type)
);

create table if not exists public.meal_plan_template_tags (
  template_id uuid not null references public.meal_plan_templates (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  source text not null default 'user' check (source in ('ai', 'user', 'ingredient')),
  created_at timestamptz not null default now(),
  primary key (template_id, tag_id)
);

alter table public.community_likes enable row level security;
alter table public.community_saves enable row level security;
alter table public.community_interactions enable row level security;
alter table public.meal_plan_templates enable row level security;
alter table public.meal_plan_template_items enable row level security;
alter table public.meal_plan_template_tags enable row level security;

drop policy if exists "read public profile names" on public.profiles;
create policy "read public profile names" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "own likes" on public.community_likes;
create policy "own likes" on public.community_likes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "read like counts" on public.community_likes;
create policy "read like counts" on public.community_likes
  for select to authenticated
  using (true);

drop policy if exists "own saves" on public.community_saves;
create policy "own saves" on public.community_saves
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "read save counts" on public.community_saves;
create policy "read save counts" on public.community_saves
  for select to authenticated
  using (true);

drop policy if exists "own interactions" on public.community_interactions;
create policy "own interactions" on public.community_interactions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "read public meal plan templates" on public.meal_plan_templates;
create policy "read public meal plan templates" on public.meal_plan_templates
  for select using (is_public = true or auth.uid() = user_id);

drop policy if exists "write own meal plan templates" on public.meal_plan_templates;
create policy "write own meal plan templates" on public.meal_plan_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read meal plan template items" on public.meal_plan_template_items;
create policy "read meal plan template items" on public.meal_plan_template_items
  for select using (
    exists (
      select 1 from public.meal_plan_templates t
      where t.id = template_id and (t.is_public = true or t.user_id = auth.uid())
    )
  );

drop policy if exists "write own meal plan template items" on public.meal_plan_template_items;
create policy "write own meal plan template items" on public.meal_plan_template_items
  for all using (
    exists (select 1 from public.meal_plan_templates t where t.id = template_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meal_plan_templates t where t.id = template_id and t.user_id = auth.uid())
  );

drop policy if exists "read meal plan template tags" on public.meal_plan_template_tags;
create policy "read meal plan template tags" on public.meal_plan_template_tags
  for select using (
    exists (
      select 1 from public.meal_plan_templates t
      where t.id = template_id and (t.is_public = true or t.user_id = auth.uid())
    )
  );

drop policy if exists "write own meal plan template tags" on public.meal_plan_template_tags;
create policy "write own meal plan template tags" on public.meal_plan_template_tags
  for all using (
    exists (select 1 from public.meal_plan_templates t where t.id = template_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.meal_plan_templates t where t.id = template_id and t.user_id = auth.uid())
  );

create or replace function public.community_interest_tags()
returns table (tag_id uuid, weight integer)
language sql
stable
security invoker
set search_path = public
as $$
  with weights as (
    select rt.tag_id, 3 as w
    from public.recipes r
    join public.recipe_tags rt on rt.recipe_id = r.id
    where r.is_public and r.user_id = auth.uid()
    union all
    select mtt.tag_id, 3
    from public.meal_plan_templates m
    join public.meal_plan_template_tags mtt on mtt.template_id = m.id
    where m.is_public and m.user_id = auth.uid()
    union all
    select rt.tag_id, 3
    from public.community_saves s
    join public.recipe_tags rt on s.target_type = 'recipe' and rt.recipe_id = s.target_id
    where s.user_id = auth.uid()
    union all
    select mtt.tag_id, 3
    from public.community_saves s
    join public.meal_plan_template_tags mtt on s.target_type = 'meal_plan' and mtt.template_id = s.target_id
    where s.user_id = auth.uid()
    union all
    select rt.tag_id, 2
    from public.community_likes l
    join public.recipe_tags rt on l.target_type = 'recipe' and rt.recipe_id = l.target_id
    where l.user_id = auth.uid()
    union all
    select mtt.tag_id, 2
    from public.community_likes l
    join public.meal_plan_template_tags mtt on l.target_type = 'meal_plan' and mtt.template_id = l.target_id
    where l.user_id = auth.uid()
    union all
    select rt.tag_id, case i.kind when 'cook' then 4 when 'plan' then 4 else 1 end
    from public.community_interactions i
    join public.recipe_tags rt on i.target_type = 'recipe' and rt.recipe_id = i.target_id
    where i.user_id = auth.uid() and i.kind in ('cook', 'open', 'plan')
    union all
    select mtt.tag_id, case i.kind when 'plan' then 4 else 1 end
    from public.community_interactions i
    join public.meal_plan_template_tags mtt on i.target_type = 'meal_plan' and mtt.template_id = i.target_id
    where i.user_id = auth.uid() and i.kind in ('open', 'plan')
    union all
    select i.tag_id, 1
    from public.community_interactions i
    where i.user_id = auth.uid() and i.kind = 'tag_click' and i.tag_id is not null
  )
  select tag_id, sum(w)::int as weight
  from weights
  group by tag_id;
$$;

drop function if exists public.explore_recipes(text, text[]);

create or replace function public.explore_recipes(
  search text default '',
  tag_slugs text[] default '{}'::text[],
  p_mode text default 'foryou'
)
returns table (
  id uuid,
  user_id uuid,
  creator_name text,
  creator_avatar_url text,
  name text,
  description text,
  instructions jsonb,
  prep_time integer,
  cook_time integer,
  servings integer,
  source text,
  image_url text,
  published_at timestamptz,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  nutrition_source text,
  score integer,
  like_count integer,
  liked boolean,
  saved boolean,
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
    select * from public.community_interest_tags()
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
      and (
        coalesce(p_mode, 'foryou') = 'latest'
        or r.user_id is distinct from auth.uid()
      )
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
          select 1 from public.recipe_ingredients ri
          where ri.recipe_id = r.id and ri.ingredient_name ilike '%' || (select q from q) || '%'
        )
        or exists (
          select 1
          from public.recipe_tags rt
          join public.tags t on t.id = rt.tag_id
          where rt.recipe_id = r.id
            and (t.name ilike '%' || (select q from q) || '%' or t.slug ilike '%' || (select q from q) || '%')
        )
      )
  )
  select
    s.id,
    s.user_id,
    coalesce(p.name, 'Friend'),
    p.avatar_url,
    s.name,
    s.description,
    s.instructions,
    s.prep_time,
    s.cook_time,
    s.servings,
    s.source,
    s.image_url,
    s.published_at,
    s.calories,
    s.protein_g,
    s.carbs_g,
    s.fat_g,
    s.nutrition_source,
    s.score,
    coalesce((
      select count(*)::int from public.community_likes cl
      where cl.target_type = 'recipe' and cl.target_id = s.id
    ), 0),
    exists (
      select 1 from public.community_likes cl
      where cl.user_id = auth.uid() and cl.target_type = 'recipe' and cl.target_id = s.id
    ),
    exists (
      select 1 from public.community_saves cs
      where cs.user_id = auth.uid() and cs.target_type = 'recipe' and cs.target_id = s.id
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'slug', t.slug, 'name', t.name, 'kind', t.kind, 'source', rt.source
      ) order by t.name)
      from public.recipe_tags rt
      join public.tags t on t.id = rt.tag_id
      where rt.recipe_id = s.id
    ), '[]'::jsonb),
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
    ), '[]'::jsonb)
  from scored s
  left join public.profiles p on p.id = s.user_id
  order by
    case when coalesce(p_mode, 'foryou') = 'latest' then 0 else s.score end desc,
    s.published_at desc nulls last,
    s.created_at desc
  limit 80;
$$;

create or replace function public.explore_meal_plans(
  search text default '',
  tag_slugs text[] default '{}'::text[],
  p_mode text default 'foryou'
)
returns table (
  id uuid,
  user_id uuid,
  creator_name text,
  creator_avatar_url text,
  title text,
  description text,
  published_at timestamptz,
  meal_count integer,
  day_count integer,
  score integer,
  like_count integer,
  liked boolean,
  saved boolean,
  tags jsonb,
  recipes jsonb
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
    select * from public.community_interest_tags()
  ),
  scored as (
    select
      m.*,
      coalesce((
        select sum(i.weight)::int
        from public.meal_plan_template_tags mtt
        join interests i on i.tag_id = mtt.tag_id
        where mtt.template_id = m.id
      ), 0) as score
    from public.meal_plan_templates m
    where m.is_public = true
      and (
        coalesce(p_mode, 'foryou') = 'latest'
        or m.user_id is distinct from auth.uid()
      )
      and (
        not exists (select 1 from wanted)
        or exists (
          select 1
          from public.meal_plan_template_tags mtt
          join public.tags t on t.id = mtt.tag_id
          join wanted w on w.slug = t.slug
          where mtt.template_id = m.id
        )
      )
      and (
        (select q from q) = ''
        or m.title ilike '%' || (select q from q) || '%'
        or m.description ilike '%' || (select q from q) || '%'
        or exists (
          select 1
          from public.meal_plan_template_items it
          join public.recipes r on r.id = it.recipe_id
          where it.template_id = m.id and r.name ilike '%' || (select q from q) || '%'
        )
        or exists (
          select 1
          from public.meal_plan_template_tags mtt
          join public.tags t on t.id = mtt.tag_id
          where mtt.template_id = m.id
            and (t.name ilike '%' || (select q from q) || '%' or t.slug ilike '%' || (select q from q) || '%')
        )
      )
  )
  select
    s.id,
    s.user_id,
    coalesce(p.name, 'Friend'),
    p.avatar_url,
    s.title,
    s.description,
    s.published_at,
    coalesce((select count(*)::int from public.meal_plan_template_items it where it.template_id = s.id), 0),
    coalesce((select (max(it.day_offset) + 1)::int from public.meal_plan_template_items it where it.template_id = s.id), 0),
    s.score,
    coalesce((
      select count(*)::int from public.community_likes cl
      where cl.target_type = 'meal_plan' and cl.target_id = s.id
    ), 0),
    exists (
      select 1 from public.community_likes cl
      where cl.user_id = auth.uid() and cl.target_type = 'meal_plan' and cl.target_id = s.id
    ),
    exists (
      select 1 from public.community_saves cs
      where cs.user_id = auth.uid() and cs.target_type = 'meal_plan' and cs.target_id = s.id
    ),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'slug', t.slug, 'name', t.name, 'kind', t.kind
      ) order by t.name)
      from public.meal_plan_template_tags mtt
      join public.tags t on t.id = mtt.tag_id
      where mtt.template_id = s.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'dayOffset', it.day_offset,
        'mealType', it.meal_type,
        'calories', r.calories,
        'proteinG', r.protein_g,
        'carbsG', r.carbs_g,
        'fatG', r.fat_g,
        'nutritionSource', r.nutrition_source,
        'ingredients', coalesce((
          select jsonb_agg(jsonb_build_object(
            'ingredientName', ri.ingredient_name,
            'optional', ri.optional
          ))
          from public.recipe_ingredients ri where ri.recipe_id = r.id
        ), '[]'::jsonb)
      ) order by it.day_offset, it.meal_type)
      from public.meal_plan_template_items it
      join public.recipes r on r.id = it.recipe_id
      where it.template_id = s.id
    ), '[]'::jsonb)
  from scored s
  left join public.profiles p on p.id = s.user_id
  order by
    case when coalesce(p_mode, 'foryou') = 'latest' then 0 else s.score end desc,
    s.published_at desc nulls last,
    s.created_at desc
  limit 80;
$$;

grant select, insert, delete on public.community_likes to authenticated;
grant select, insert, delete on public.community_saves to authenticated;
grant select, insert on public.community_interactions to authenticated;
grant select, insert, update, delete on public.meal_plan_templates to authenticated;
grant select, insert, update, delete on public.meal_plan_template_items to authenticated;
grant select, insert, delete on public.meal_plan_template_tags to authenticated;
grant execute on function public.community_interest_tags() to authenticated;
grant execute on function public.explore_recipes(text, text[], text) to authenticated;
grant execute on function public.explore_meal_plans(text, text[], text) to authenticated;
