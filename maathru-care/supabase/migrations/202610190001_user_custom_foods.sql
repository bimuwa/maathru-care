begin;

create or replace function public.custom_food_other_nutrients_valid(p_values jsonb)
returns boolean
language sql immutable strict set search_path = '' as $$
  select case when jsonb_typeof(p_values) <> 'object' then false else not exists (
      select 1 from jsonb_each(p_values) as nutrient(key, value)
      where nutrient.key !~ '^[a-z][a-z0-9_]{0,60}$'
         or nutrient.key in ('carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg', 'gi_index')
         or jsonb_typeof(nutrient.value) not in ('number', 'null')
         or (jsonb_typeof(nutrient.value) = 'number' and (nutrient.value #>> '{}')::numeric < 0)
    ) end;
$$;
revoke all on function public.custom_food_other_nutrients_valid(jsonb) from public, anon;
grant execute on function public.custom_food_other_nutrients_valid(jsonb) to authenticated, service_role;

create table public.user_custom_foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id text not null unique default ('custom_' || gen_random_uuid()::text),
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  english_name text null check (english_name is null or length(english_name) <= 100),
  sinhala_name text null check (sinhala_name is null or length(sinhala_name) <= 100),
  category text null check (category is null or length(category) <= 100),
  serving_unit text null check (serving_unit is null or length(serving_unit) <= 100),
  carbs_g numeric null constraint user_custom_foods_carbs_g_nonnegative check (carbs_g is null or (carbs_g >= 0 and carbs_g < 'Infinity'::numeric)),
  sugar_g numeric null constraint user_custom_foods_sugar_g_nonnegative check (sugar_g is null or (sugar_g >= 0 and sugar_g < 'Infinity'::numeric)),
  fiber_g numeric null constraint user_custom_foods_fiber_g_nonnegative check (fiber_g is null or (fiber_g >= 0 and fiber_g < 'Infinity'::numeric)),
  fat_g numeric null constraint user_custom_foods_fat_g_nonnegative check (fat_g is null or (fat_g >= 0 and fat_g < 'Infinity'::numeric)),
  iron_mg numeric null constraint user_custom_foods_iron_mg_nonnegative check (iron_mg is null or (iron_mg >= 0 and iron_mg < 'Infinity'::numeric)),
  calcium_mg numeric null constraint user_custom_foods_calcium_mg_nonnegative check (calcium_mg is null or (calcium_mg >= 0 and calcium_mg < 'Infinity'::numeric)),
  gi_index integer null constraint user_custom_foods_gi_index_range check (gi_index is null or gi_index between 0 and 100),
  other_nutrients jsonb not null default '{}'::jsonb
    constraint user_custom_foods_other_nutrients_valid check (public.custom_food_other_nutrients_valid(other_nutrients)),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_custom_foods_food_id_prefix check (food_id like 'custom\_%' escape '\'),
  constraint user_custom_foods_nutrition_serving_basis check (
    (serving_unit is not null and length(btrim(serving_unit)) > 0)
    or (carbs_g is null and sugar_g is null and fiber_g is null and fat_g is null
        and iron_mg is null and calcium_mg is null and gi_index is null and other_nutrients = '{}'::jsonb)
  )
);

create index user_custom_foods_owner_name_idx on public.user_custom_foods(owner_id, display_name);
create unique index user_custom_foods_owner_normalized_name_key
  on public.user_custom_foods(owner_id, lower(btrim(display_name)));
alter table public.user_custom_foods enable row level security;
revoke all on public.user_custom_foods from public, anon, authenticated;
grant select on public.user_custom_foods to authenticated;
grant insert (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
  on public.user_custom_foods to authenticated;
grant update (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
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
  with check (owner_id = (select auth.uid()));
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
     or new.created_at is distinct from old.created_at then
    raise exception 'Custom food identity and verification fields are immutable';
  end if;
  if current_user not in ('postgres', 'service_role') then
    if new.verification_status is distinct from old.verification_status
       and not (new.verification_status = 'unverified' and old.verification_status in ('verified', 'rejected')) then
      raise exception 'Only a privileged verification workflow can change verification status';
    end if;
    if old.verification_status <> 'unverified' and (
      new.display_name is distinct from old.display_name
      or new.english_name is distinct from old.english_name
      or new.sinhala_name is distinct from old.sinhala_name
      or new.category is distinct from old.category
      or new.serving_unit is distinct from old.serving_unit
      or new.carbs_g is distinct from old.carbs_g
      or new.sugar_g is distinct from old.sugar_g
      or new.fiber_g is distinct from old.fiber_g
      or new.fat_g is distinct from old.fat_g
      or new.iron_mg is distinct from old.iron_mg
      or new.calcium_mg is distinct from old.calcium_mg
      or new.gi_index is distinct from old.gi_index
      or new.other_nutrients is distinct from old.other_nutrients
    ) then
      new.verification_status := 'unverified';
    end if;
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
  'Private owner-scoped food labels. Nutrition is user supplied and unverified unless a privileged review workflow changes status.';

commit;
