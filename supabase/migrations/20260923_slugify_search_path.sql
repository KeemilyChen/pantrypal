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

revoke execute on function public.handle_new_user() from anon, public, authenticated;
