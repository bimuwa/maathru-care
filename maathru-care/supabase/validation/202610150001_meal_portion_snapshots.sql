-- Run against staging after applying the draft migration. Read-only validation.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'meal_items'
  and column_name in ('portion_amount', 'portion_unit', 'reference_amount',
    'reference_unit', 'reference_description', 'portion_provenance', 'calculation_version')
order by column_name;

select conname, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.meal_items'::regclass
  and (conname like 'meal_items_%portion%' or conname like 'meal_items_%reference%')
order by conname;

-- Counts should match before/after migration; no historical rows are rewritten.
select count(*) as meal_item_rows,
       count(*) filter (where carbs_g is null) as null_carbs_snapshots,
       count(*) filter (where sugar_g is null) as null_sugar_snapshots
from public.meal_items;

-- Security inventory to repeat before any write is enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('users', 'maternal_foods', 'meal_logs', 'meal_items')
order by c.relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('users', 'maternal_foods', 'meal_logs', 'meal_items')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
