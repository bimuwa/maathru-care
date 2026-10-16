-- Read-only metadata validation after applying 202610150001 through 202610150003 in staging.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('food_diary_meals', 'food_diary_items')
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('food_diary_meals', 'food_diary_items')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('food_diary_meals', 'food_diary_items')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('food_diary_meals', 'food_diary_items')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by table_name, grantee, privilege_type;

select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public' and routine_name in ('save_food_diary_meal', 'food_diary_is_ready')
order by grantee, privilege_type;

select p.proname, p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_userbyid(p.proowner) as function_owner
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('save_food_diary_meal', 'food_diary_is_ready')
order by p.proname;

select count(*) as isolated_meals from public.food_diary_meals;
select count(*) as isolated_items from public.food_diary_items;
