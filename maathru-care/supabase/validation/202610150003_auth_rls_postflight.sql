-- READ-ONLY postflight after migrations 001, 003, then 002 have committed on staging.

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='users'
  and column_name in ('full_name','age','gestational_week','bmi','auth_user_id','password')
order by ordinal_position;

-- Compare these counts with preflight. Expected original baseline: 1 linked and
-- 18 unlinked profiles; existing legacy meal rows must be unchanged.
select count(*) as total_profiles,
       count(*) filter (where auth_user_id is not null) as linked_profiles,
       count(*) filter (where auth_user_id is null) as unlinked_profiles
from public.users;
select 'meal_logs' as table_name, count(*) as row_count from public.meal_logs
union all
select 'meal_items', count(*) from public.meal_items;

select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid='auth.users'::regclass and not tgisinternal
  and tgname='on_auth_user_created_maathru';

select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('users','meal_logs','meal_items','maternal_foods','food_diary_meals','food_diary_items')
order by c.relname;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('users','meal_logs','meal_items','maternal_foods','food_diary_meals','food_diary_items')
order by tablename,policyname;

select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('users','meal_logs','meal_items','maternal_foods','food_diary_meals','food_diary_items')
  and grantee in ('anon','authenticated','service_role','PUBLIC')
order by table_name,grantee,privilege_type;

select p.proname,p.prosecdef as security_definer,p.proconfig as function_settings,
       pg_get_userbyid(p.proowner) as function_owner
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'provision_my_auth_profile','admin_link_auth_profile','get_approved_doctors',
  'request_doctor_assignment','food_diary_is_ready','save_food_diary_meal'
)
order by p.proname;

select routine_name,grantee,privilege_type
from information_schema.routine_privileges
where specific_schema='public' and routine_name in (
  'provision_my_auth_profile','admin_link_auth_profile','get_approved_doctors',
  'request_doctor_assignment','food_diary_is_ready','save_food_diary_meal'
)
order by routine_name,grantee,privilege_type;

select count(*) as linked_profiles from public.users where auth_user_id is not null;
select count(*) as saved_diary_meals from public.food_diary_meals;
select count(*) as saved_diary_items from public.food_diary_items;

-- Counts only: profile rows without an Auth mapping remain legacy data. Their
-- IDs and related meal rows should remain unchanged; link only after verification.
    select count(*) as still_unlinked_legacy_profiles from public.users where auth_user_id is null;
