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
  source text not null default 'user' check (source in ('system', 'user')),
  image_url text,
  created_at timestamptz not null default now()
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

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_list enable row level security;

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

create policy "write own recipes" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read recipe ingredients" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and (r.source = 'system' or r.user_id = auth.uid())
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
