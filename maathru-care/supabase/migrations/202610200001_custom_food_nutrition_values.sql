begin;

-- Nutrient values are optional and keyed by the canonical client catalog.
-- JSON keeps this extensible without adding a column for every micronutrient.
create or replace function public.custom_food_nutrition_values_valid(p_values jsonb)
returns boolean
language sql immutable strict set search_path = '' as $$
  select jsonb_typeof(p_values) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_values) as nutrient(key, value)
      where jsonb_typeof(nutrient.value) not in ('number', 'null')
         or (jsonb_typeof(nutrient.value) = 'number' and (nutrient.value #>> '{}')::numeric < 0)
    );
$$;
grant execute on function public.custom_food_nutrition_values_valid(jsonb) to authenticated;

alter table public.user_custom_foods
  add column nutrition_values jsonb not null default '{}'::jsonb,
  add constraint user_custom_foods_nutrition_values_valid
    check (public.custom_food_nutrition_values_valid(nutrition_values));

grant insert (display_name, english_name, sinhala_name, category, serving_unit, nutrition_values)
  on public.user_custom_foods to authenticated;
grant update (display_name, english_name, sinhala_name, category, serving_unit, nutrition_values)
  on public.user_custom_foods to authenticated;

comment on column public.user_custom_foods.nutrition_values is
  'Optional user-entered amounts per serving, keyed by the app nutrient catalog. Missing keys or null values are unknown; values are unverified.';

commit;
