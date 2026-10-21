begin;

-- Apply only after 202610190001_user_custom_foods.sql has been reviewed and
-- applied. This preserves the deployed transaction contract and adds exactly
-- one owner-scoped custom-food reference check.
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
    if (v_item->>'food_id') is not null
       and not exists (select 1 from public.maternal_foods f where f.food_id = v_item->>'food_id')
       and not exists (
         select 1 from public.user_custom_foods c
         where c.food_id = v_item->>'food_id' and c.owner_id = v_owner
       ) then
      raise exception 'Selected food is no longer available to this account';
    end if;
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
  'Authenticated idempotent diary transaction; food references must be built-in or owned by auth.uid(). Empty search_path; no caller owner parameter.';

commit;
