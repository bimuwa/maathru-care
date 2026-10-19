begin;

-- Safe additive alignment. Unknown nutrient values remain NULL.
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

alter table public.user_custom_foods
  add column if not exists carbs_g numeric null,
  add column if not exists sugar_g numeric null,
  add column if not exists fiber_g numeric null,
  add column if not exists fat_g numeric null,
  add column if not exists iron_mg numeric null,
  add column if not exists calcium_mg numeric null,
  add column if not exists gi_index integer null,
  add column if not exists other_nutrients jsonb not null default '{}'::jsonb;

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

grant insert (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
  on public.user_custom_foods to authenticated;
grant update (display_name, english_name, sinhala_name, category, serving_unit,
  carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients)
  on public.user_custom_foods to authenticated;

comment on column public.user_custom_foods.gi_index is 'Optional user-entered GI value. NULL means unknown; no global default is applied.';
comment on column public.user_custom_foods.other_nutrients is 'Optional nutrients not consumed directly by the current diary calculator, keyed by stable catalog names.';

commit;
