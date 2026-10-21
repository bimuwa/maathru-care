-- Phase 4B isolated diary storage. No legacy auth/table changes.
-- Apply in staging first; do not apply to production without owner approval.

begin;

create table if not exists public.food_diary_meals (
  id uuid primary key default gen_random_uuid(),
  -- Restrict auth-user deletion so a cleanup of credentials cannot erase research meals.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  logged_date date not null,
  meal_type text not null check (meal_type in ('Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner')),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  check (owner_id = auth.uid())
);

create table if not exists public.food_diary_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.food_diary_meals(id) on delete cascade,
  -- Intentionally no FK: preserve the exact food ID/name snapshot if catalog rows change.
  -- The authenticated save RPC validates every non-null ID against maternal_foods.
  food_id text null,
  item_name text not null check (length(btrim(item_name)) between 1 and 160),
  portion_amount numeric null check (portion_amount is null or (portion_amount > 0 and portion_amount < 'Infinity'::numeric)),
  portion_unit text null check (portion_unit is null or portion_unit in ('g', 'piece', 'cup')),
  reference_amount numeric null check (reference_amount is null or (reference_amount > 0 and reference_amount < 'Infinity'::numeric)),
  reference_unit text null check (reference_unit is null or reference_unit in ('g', 'piece', 'cup')),
  reference_description text null,
  portion_provenance text not null check (portion_provenance in ('estimated_suggested', 'user_adjusted', 'user_confirmed', 'quantity_unknown')),
  carbs_g numeric null,
  sugar_g numeric null,
  fiber_g numeric null,
  fat_g numeric null,
  iron_mg numeric null,
  calcium_mg numeric null,
  calculation_version text not null,
  created_at timestamptz not null default now(),
  check ((portion_amount is null) = (portion_unit is null)),
  check ((reference_amount is null) = (reference_unit is null)),
  check (portion_provenance = 'quantity_unknown' or portion_amount is not null),
  check (food_id is not null or
    (carbs_g is null and sugar_g is null and fiber_g is null and fat_g is null and iron_mg is null and calcium_mg is null)),
  check (portion_provenance <> 'quantity_unknown' or
    (portion_amount is null and carbs_g is null and sugar_g is null and fiber_g is null and fat_g is null and iron_mg is null and calcium_mg is null)),
  check (carbs_g is null or (carbs_g >= 0 and carbs_g < 'Infinity'::numeric)),
  check (sugar_g is null or (sugar_g >= 0 and sugar_g < 'Infinity'::numeric)),
  check (fiber_g is null or (fiber_g >= 0 and fiber_g < 'Infinity'::numeric)),
  check (fat_g is null or (fat_g >= 0 and fat_g < 'Infinity'::numeric)),
  check (iron_mg is null or (iron_mg >= 0 and iron_mg < 'Infinity'::numeric)),
  check (calcium_mg is null or (calcium_mg >= 0 and calcium_mg < 'Infinity'::numeric))
);

alter table public.food_diary_meals enable row level security;
alter table public.food_diary_items enable row level security;

-- Remove any prior policies if the isolated tables existed from an earlier attempt.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('food_diary_meals','food_diary_items')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
drop policy if exists food_diary_meals_select_owner on public.food_diary_meals;
create policy food_diary_meals_select_owner on public.food_diary_meals
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists food_diary_items_select_owner on public.food_diary_items;
create policy food_diary_items_select_owner on public.food_diary_items
  for select to authenticated using (exists (
    select 1 from public.food_diary_meals m
    where m.id = food_diary_items.meal_id and m.owner_id = (select auth.uid())
  ));

revoke all on public.food_diary_meals, public.food_diary_items from public, anon, authenticated;
grant select on public.food_diary_meals, public.food_diary_items to authenticated;

create or replace function public.save_food_diary_meal(
  p_idempotency_key uuid,
  p_logged_date date,
  p_meal_type text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_meal_id uuid;
  v_item jsonb;
  v_provenance text;
  v_portion_amount numeric;
  v_portion_unit text;
  v_reference_amount numeric;
  v_reference_unit text;
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
  on conflict (owner_id, idempotency_key) do nothing
  returning id into v_meal_id;

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
    if (v_item->>'food_id') is not null and not exists (
      select 1 from public.maternal_foods f where f.food_id = v_item->>'food_id'
    ) then raise exception 'Selected food is no longer available in the food catalog'; end if;
    if v_provenance not in ('estimated_suggested', 'user_adjusted', 'user_confirmed', 'quantity_unknown') then
      raise exception 'Food quantity provenance is invalid';
    end if;
    if coalesce(v_item->>'calculation_version', '') = '' then raise exception 'Calculation version is required'; end if;
    insert into public.food_diary_items(
      meal_id, food_id, item_name, portion_amount, portion_unit,
      reference_amount, reference_unit, reference_description, portion_provenance,
      carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, calculation_version
    ) values (
      v_meal_id, nullif(v_item->>'food_id', ''), v_item->>'item_name', v_portion_amount, v_portion_unit,
      v_reference_amount, v_reference_unit, v_item->>'reference_description', v_provenance,
      nullif(v_item->>'carbs_g', 'null')::numeric, nullif(v_item->>'sugar_g', 'null')::numeric,
      nullif(v_item->>'fiber_g', 'null')::numeric, nullif(v_item->>'fat_g', 'null')::numeric,
      nullif(v_item->>'iron_mg', 'null')::numeric, nullif(v_item->>'calcium_mg', 'null')::numeric,
      v_item->>'calculation_version'
    );
  end loop;
  return v_meal_id;
end;
$$;

revoke all on function public.save_food_diary_meal(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_food_diary_meal(uuid, date, text, jsonb) to authenticated;

comment on function public.save_food_diary_meal(uuid, date, text, jsonb) is
  'Narrow authenticated transaction. SECURITY DEFINER is locked to an empty search_path; owner is always auth.uid(); no dynamic SQL or caller owner ID is accepted.';

commit;

-- Existing meal_logs/meal_items remain untouched. New records live in isolated
-- tables and must be merged into common history only in a later reviewed phase.
