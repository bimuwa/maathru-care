begin;

create table public.user_custom_foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id text not null unique default ('custom_' || gen_random_uuid()::text),
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  english_name text null check (english_name is null or length(english_name) <= 100),
  sinhala_name text null check (sinhala_name is null or length(sinhala_name) <= 100),
  category text null check (category is null or length(category) <= 100),
  serving_unit text null check (serving_unit is null or length(serving_unit) <= 100),
  verification_status text not null default 'unverified' check (verification_status = 'unverified'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_custom_foods_food_id_prefix check (food_id like 'custom\_%' escape '\')
);

create index user_custom_foods_owner_name_idx on public.user_custom_foods(owner_id, display_name);
create unique index user_custom_foods_owner_normalized_name_key
  on public.user_custom_foods(owner_id, lower(btrim(display_name)));
alter table public.user_custom_foods enable row level security;
revoke all on public.user_custom_foods from public, anon, authenticated;
grant select on public.user_custom_foods to authenticated;
grant insert (display_name, english_name, sinhala_name, category, serving_unit)
  on public.user_custom_foods to authenticated;
grant update (display_name, english_name, sinhala_name, category, serving_unit)
  on public.user_custom_foods to authenticated;
grant delete on public.user_custom_foods to authenticated;

create policy user_custom_foods_select_owner on public.user_custom_foods
  for select to authenticated using (owner_id = (select auth.uid()));
create policy user_custom_foods_insert_owner on public.user_custom_foods
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and verification_status = 'unverified'
  );
create policy user_custom_foods_update_owner on public.user_custom_foods
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and verification_status = 'unverified');
create policy user_custom_foods_delete_owner on public.user_custom_foods
  for delete to authenticated using (owner_id = (select auth.uid()));

create function public.set_user_custom_food_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_custom_foods_updated_at
  before update on public.user_custom_foods
  for each row execute function public.set_user_custom_food_updated_at();

create function public.protect_user_custom_food_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.food_id is distinct from old.food_id
     or new.owner_id is distinct from old.owner_id
     or new.verification_status is distinct from old.verification_status
     or new.created_at is distinct from old.created_at then
    raise exception 'Custom food identity and verification fields are immutable';
  end if;
  return new;
end;
$$;

create function public.validate_user_custom_food_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.maternal_foods f where f.food_id = new.food_id) then
    raise exception 'Custom food ID conflicts with the built-in food catalog';
  end if;
  return new;
end;
$$;

create trigger user_custom_foods_validate_food_id
  before insert on public.user_custom_foods
  for each row execute function public.validate_user_custom_food_id();

create trigger user_custom_foods_protect_identity
  before update on public.user_custom_foods
  for each row execute function public.protect_user_custom_food_identity();

comment on table public.user_custom_foods is
  'Private owner-scoped food labels. No nutrient or medical suitability data is asserted.';

commit;
