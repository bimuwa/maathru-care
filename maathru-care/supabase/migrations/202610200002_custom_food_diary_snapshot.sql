begin;

-- Forward, non-destructive alignment: add/extend only the user's custom table.
-- Never changes maternal_foods or removes legacy custom-food data/columns.
create or replace function public.custom_food_other_nutrients_valid(p_values jsonb)
returns boolean language sql immutable strict set search_path = '' as $$
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

-- Make this forward migration safe to run even if the custom table has not
-- been created yet. Existing rows/tables are never dropped or replaced.
create table if not exists public.user_custom_foods (
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
  other_nutrients jsonb not null default '{}'::jsonb constraint user_custom_foods_other_nutrients_valid check (public.custom_food_other_nutrients_valid(other_nutrients)),
  verification_status text not null default 'unverified' constraint user_custom_foods_verification_status_allowed check (verification_status in ('unverified', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_custom_foods_food_id_prefix check (food_id like 'custom\_%' escape '\'),
  constraint user_custom_foods_nutrition_serving_basis check (
    (serving_unit is not null and length(btrim(serving_unit)) > 0)
    or (carbs_g is null and sugar_g is null and fiber_g is null and fat_g is null
        and iron_mg is null and calcium_mg is null and gi_index is null and other_nutrients = '{}'::jsonb)
  )
);
create index if not exists user_custom_foods_owner_name_idx
  on public.user_custom_foods(owner_id, display_name);
create index if not exists user_custom_foods_owner_normalized_name_search_idx
  on public.user_custom_foods(owner_id, lower(btrim(display_name)));

create or replace function public.set_user_custom_food_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create or replace function public.validate_user_custom_food_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.maternal_foods f where f.food_id = new.food_id) then
    raise exception 'Custom food ID conflicts with the built-in food catalog';
  end if;
  return new;
end;
$$;

alter table public.user_custom_foods
  add column if not exists carbs_g numeric null,
  add column if not exists sugar_g numeric null,
  add column if not exists fiber_g numeric null,
  add column if not exists fat_g numeric null,
  add column if not exists iron_mg numeric null,
  add column if not exists calcium_mg numeric null,
  add column if not exists gi_index integer null,
  add column if not exists other_nutrients jsonb not null default '{}'::jsonb;

alter table public.user_custom_foods
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- If the previous draft's generic map was already deployed, copy its values
-- forward without deleting that column or overwriting an existing known value.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_custom_foods' and column_name='nutrition_values'
  ) then
    execute $sql$
      update public.user_custom_foods
      set carbs_g = coalesce(carbs_g, nullif(nutrition_values->>'carbs_g', '')::numeric),
          sugar_g = coalesce(sugar_g, nullif(nutrition_values->>'sugar_g', '')::numeric),
          fiber_g = coalesce(fiber_g, nullif(nutrition_values->>'fiber_g', '')::numeric),
          fat_g = coalesce(fat_g, nullif(nutrition_values->>'fat_g', '')::numeric),
          iron_mg = coalesce(iron_mg, nullif(nutrition_values->>'iron_mg', '')::numeric),
          calcium_mg = coalesce(calcium_mg, nullif(nutrition_values->>'calcium_mg', '')::numeric),
          other_nutrients = coalesce(other_nutrients, '{}'::jsonb) ||
            (coalesce(nutrition_values, '{}'::jsonb) - array['carbs_g','sugar_g','fiber_g','fat_g','iron_mg','calcium_mg','gi_index']::text[])
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.user_custom_foods'::regclass and conname='user_custom_foods_nutrition_serving_basis') then
    alter table public.user_custom_foods add constraint user_custom_foods_nutrition_serving_basis
      check ((serving_unit is not null and length(btrim(serving_unit)) > 0)
        or (carbs_g is null and sugar_g is null and fiber_g is null and fat_g is null
            and iron_mg is null and calcium_mg is null and gi_index is null and other_nutrients = '{}'::jsonb)) not valid;
  end if;
end $$;

do $$
declare c record;
begin
  for c in select * from (values
    ('user_custom_foods_carbs_g_nonnegative', 'carbs_g is null or (carbs_g >= 0 and carbs_g < ''Infinity''::numeric)'),
    ('user_custom_foods_sugar_g_nonnegative', 'sugar_g is null or (sugar_g >= 0 and sugar_g < ''Infinity''::numeric)'),
    ('user_custom_foods_fiber_g_nonnegative', 'fiber_g is null or (fiber_g >= 0 and fiber_g < ''Infinity''::numeric)'),
    ('user_custom_foods_fat_g_nonnegative', 'fat_g is null or (fat_g >= 0 and fat_g < ''Infinity''::numeric)'),
    ('user_custom_foods_iron_mg_nonnegative', 'iron_mg is null or (iron_mg >= 0 and iron_mg < ''Infinity''::numeric)'),
    ('user_custom_foods_calcium_mg_nonnegative', 'calcium_mg is null or (calcium_mg >= 0 and calcium_mg < ''Infinity''::numeric)'),
    ('user_custom_foods_gi_index_range', 'gi_index is null or gi_index between 0 and 100'),
    ('user_custom_foods_other_nutrients_valid', 'public.custom_food_other_nutrients_valid(other_nutrients)')
  ) as definitions(name, expression)
  loop
    if not exists (select 1 from pg_constraint where conrelid='public.user_custom_foods'::regclass and conname=c.name) then
      execute format('alter table public.user_custom_foods add constraint %I check (%s)', c.name, c.expression);
    end if;
  end loop;
end $$;

-- Replace the old single-state check so future privileged review may use the
-- documented statuses. Normal users still cannot set this column (see grants,
-- RLS, and the identity trigger below).
alter table public.user_custom_foods drop constraint if exists user_custom_foods_verification_status_check;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.user_custom_foods'::regclass and conname='user_custom_foods_verification_status_allowed') then
    alter table public.user_custom_foods add constraint user_custom_foods_verification_status_allowed
      check (verification_status in ('unverified', 'verified', 'rejected'));
  end if;
end $$;

revoke all on public.user_custom_foods from public, anon, authenticated;
grant select, delete on public.user_custom_foods to authenticated;
grant insert (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
  on public.user_custom_foods to authenticated;
grant update (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
  on public.user_custom_foods to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_custom_foods' and policyname='user_custom_foods_select_owner') then
    create policy user_custom_foods_select_owner on public.user_custom_foods for select to authenticated using (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_custom_foods' and policyname='user_custom_foods_insert_owner') then
    create policy user_custom_foods_insert_owner on public.user_custom_foods for insert to authenticated
      with check (owner_id = (select auth.uid()) and verification_status = 'unverified');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_custom_foods' and policyname='user_custom_foods_update_owner') then
    create policy user_custom_foods_update_owner on public.user_custom_foods for update to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and verification_status = 'unverified');
  end if;
  -- Additive permissive policy lets an owner edit an already reviewed row;
  -- the trigger below automatically returns edited rows to unverified.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_custom_foods' and policyname='user_custom_foods_update_owner_content') then
    create policy user_custom_foods_update_owner_content on public.user_custom_foods for update to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_custom_foods' and policyname='user_custom_foods_delete_owner') then
    create policy user_custom_foods_delete_owner on public.user_custom_foods for delete to authenticated using (owner_id = (select auth.uid()));
  end if;
end $$;
alter table public.user_custom_foods enable row level security;

create or replace function public.protect_user_custom_food_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.food_id is distinct from old.food_id
     or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Custom food identity fields are immutable';
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

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid='public.user_custom_foods'::regclass and tgname='user_custom_foods_updated_at') then
    create trigger user_custom_foods_updated_at before update on public.user_custom_foods
      for each row execute function public.set_user_custom_food_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid='public.user_custom_foods'::regclass and tgname='user_custom_foods_validate_food_id') then
    create trigger user_custom_foods_validate_food_id before insert on public.user_custom_foods
      for each row execute function public.validate_user_custom_food_id();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid='public.user_custom_foods'::regclass and tgname='user_custom_foods_protect_identity') then
    create trigger user_custom_foods_protect_identity before update on public.user_custom_foods
      for each row execute function public.protect_user_custom_food_identity();
  end if;
end $$;

create index if not exists user_custom_foods_owner_name_idx
  on public.user_custom_foods(owner_id, display_name);
create index if not exists user_custom_foods_owner_food_id_idx
  on public.user_custom_foods(owner_id, food_id);

alter table if exists public.food_diary_items
  add column if not exists custom_food_nutrition_snapshot jsonb null,
  add column if not exists custom_food_verification_status text null;

do $$
begin
  if to_regclass('public.food_diary_items') is not null and not exists (
    select 1 from pg_constraint where conrelid='public.food_diary_items'::regclass and conname='food_diary_custom_food_verification_status_allowed'
  ) then
    alter table public.food_diary_items add constraint food_diary_custom_food_verification_status_allowed
      check (custom_food_verification_status is null or custom_food_verification_status in ('unverified', 'verified', 'rejected'));
  end if;
end $$;

-- The diary's existing consumed nutrient columns remain NULL for unknown
-- amounts. This snapshot separately preserves the owner's per-serving source.
create or replace function public.save_food_diary_meal(
  p_idempotency_key uuid,
  p_logged_date date,
  p_meal_type text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_meal_id uuid;
  v_item jsonb;
  v_provenance text;
  v_portion_amount numeric;
  v_portion_unit text;
  v_reference_amount numeric;
  v_reference_unit text;
  v_custom_snapshot jsonb;
  v_custom_status text;
begin
  if v_owner is null then raise exception 'Diary sign-in required'; end if;
  if not exists (select 1 from public.users u where u.auth_user_id = v_owner) then
    raise exception 'A linked Maathru Care profile is required before saving';
  end if;
  if p_idempotency_key is null then raise exception 'Missing save request key'; end if;
  if p_logged_date is null or p_logged_date < date '2000-01-01' or p_logged_date > current_date + 1 then
    raise exception 'Selected meal date is invalid';
  end if;
  if p_meal_type not in ('Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner') then
    raise exception 'Meal type is invalid';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Meal must contain between 1 and 30 food items';
  end if;

  insert into public.food_diary_meals(owner_id, logged_date, meal_type, idempotency_key)
  values (v_owner, p_logged_date, p_meal_type, p_idempotency_key)
  on conflict (owner_id, idempotency_key) do nothing returning id into v_meal_id;
  if v_meal_id is null then
    select id into v_meal_id from public.food_diary_meals
    where owner_id = v_owner and idempotency_key = p_idempotency_key;
    return v_meal_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Food item is invalid'; end if;
    v_provenance := v_item->>'portion_provenance';
    v_portion_amount := nullif(v_item->>'portion_amount', '')::numeric;
    v_portion_unit := v_item->>'portion_unit';
    v_reference_amount := nullif(v_item->>'reference_amount', '')::numeric;
    v_reference_unit := v_item->>'reference_unit';
    v_custom_snapshot := null;
    v_custom_status := null;

    if (v_item->>'food_id') is not null
       and not exists (select 1 from public.maternal_foods f where f.food_id = v_item->>'food_id') then
      select jsonb_build_object(
        'serving_unit', c.serving_unit,
        'carbs_g', c.carbs_g, 'sugar_g', c.sugar_g, 'fiber_g', c.fiber_g,
        'fat_g', c.fat_g, 'iron_mg', c.iron_mg, 'calcium_mg', c.calcium_mg,
        'gi_index', c.gi_index, 'other_nutrients', c.other_nutrients
      ), c.verification_status
      into v_custom_snapshot, v_custom_status
      from public.user_custom_foods c
      where c.food_id = v_item->>'food_id' and c.owner_id = v_owner;
      if not found then raise exception 'Selected food is no longer available to this account'; end if;
    end if;
    if v_provenance not in ('estimated_suggested', 'user_adjusted', 'user_confirmed', 'quantity_unknown') then
      raise exception 'Food quantity provenance is invalid';
    end if;
    if coalesce(v_item->>'calculation_version', '') = '' then raise exception 'Calculation version is required'; end if;

    insert into public.food_diary_items(
      meal_id, food_id, item_name, portion_amount, portion_unit,
      reference_amount, reference_unit, reference_description, portion_provenance,
      carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, calculation_version,
      custom_food_nutrition_snapshot, custom_food_verification_status
    ) values (
      v_meal_id, nullif(v_item->>'food_id', ''), v_item->>'item_name', v_portion_amount, v_portion_unit,
      v_reference_amount, v_reference_unit, v_item->>'reference_description', v_provenance,
      nullif(v_item->>'carbs_g', 'null')::numeric, nullif(v_item->>'sugar_g', 'null')::numeric,
      nullif(v_item->>'fiber_g', 'null')::numeric, nullif(v_item->>'fat_g', 'null')::numeric,
      nullif(v_item->>'iron_mg', 'null')::numeric, nullif(v_item->>'calcium_mg', 'null')::numeric,
      v_item->>'calculation_version', v_custom_snapshot, v_custom_status
    );
  end loop;
  return v_meal_id;
end;
$$;

revoke all on function public.save_food_diary_meal(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_food_diary_meal(uuid, date, text, jsonb) to authenticated;
comment on column public.food_diary_items.custom_food_nutrition_snapshot is
  'Per-serving values copied from the caller-owned custom food at save time; not consumed estimates and may contain unknown/null values.';

commit;
