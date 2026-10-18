-- READ-ONLY preflight. Run only after selecting a project in Supabase Studio.
-- Do not share outputs containing project identifiers or user-level data publicly.

-- A. Confirm required tables and inspect column names/types/defaults. This query
-- intentionally returns schema metadata only, not profile values.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users','meal_logs','meal_items','maternal_foods')
order by table_name, ordinal_position;

-- A2. Required users columns: inspect every NOT NULL column with no default.
-- 003 makes legacy password/password_hash optional. Every other returned column
-- must be guaranteed by signup metadata or safely made nullable/defaulted after
-- reviewing its purpose. Optional clinical fields must not block registration.
select column_name, data_type, udt_name, column_default
from information_schema.columns
where table_schema='public' and table_name='users'
  and is_nullable='NO' and column_default is null
order by ordinal_position;
-- B. Inspect ID, role, approval, email, relationship, portion and FK constraints.
select tc.table_name, tc.constraint_name, tc.constraint_type,
       pg_get_constraintdef(c.oid) as definition
from information_schema.table_constraints tc
join pg_constraint c on c.conname = tc.constraint_name
  and c.conrelid = format('%I.%I', tc.table_schema, tc.table_name)::regclass
where tc.table_schema = 'public'
  and tc.table_name in ('users','meal_logs','meal_items','maternal_foods')
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- C. Counts only: email collisions are not printed. Any duplicate groups must
-- be reviewed before applying the Auth profile trigger.
select count(*) as duplicate_normalized_email_groups
from (
  select lower(email) from public.users where email is not null
  group by lower(email) having count(*) > 1
) d;

-- C2. Preservation baselines. The supplied live result is one linked profile
-- and 18 unlinked legacy profiles; meal counts are captured for comparison.
select count(*) as total_profiles,
       count(*) filter (where auth_user_id is not null) as linked_profiles,
       count(*) filter (where auth_user_id is null) as unlinked_profiles
from public.users;
select 'meal_logs' as table_name, count(*) as row_count from public.meal_logs
union all
select 'meal_items', count(*) from public.meal_items;

-- D. Existing Auth mappings: counts only. If auth_user_id is absent, skip this
-- block; migration 003 adds it. If present, duplicates/orphans must be zero.
do $$
declare v_count bigint;
begin
  if exists (select 1 from information_schema.columns where table_schema='public'
      and table_name='users' and column_name='auth_user_id') then
    execute 'select count(*) from (select auth_user_id from public.users where auth_user_id is not null group by auth_user_id having count(*) > 1) x' into v_count;
    raise notice 'Duplicate non-null auth_user_id groups: %', v_count;
    execute 'select count(*) from public.users u left join auth.users a on a.id = u.auth_user_id where u.auth_user_id is not null and a.id is null' into v_count;
    raise notice 'Profile mappings with no Auth user: %', v_count;
  else
    raise notice 'users.auth_user_id is absent; migration 003 will add it';
  end if;
end $$;

-- E. Existing RLS state and policies. Migration 003 replaces policies on these
-- tables; review this inventory to understand existing behavior before applying.
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       p.polname, p.polcmd, p.polpermissive,
       array(select r.rolname from pg_roles r where r.oid = any(p.polroles)) as roles,
       pg_get_expr(p.polqual,p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_policy p on p.polrelid=c.oid
where n.nspname='public' and c.relname in ('users','meal_logs','meal_items','maternal_foods')
order by c.relname,p.polname;

-- F. Current API-role grants. Unexpected grants or policies are a stop condition.
select table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema='public' and table_name in ('users','meal_logs','meal_items','maternal_foods')
  and grantee in ('anon','authenticated','service_role','PUBLIC')
order by table_name,grantee,privilege_type;

select table_name,column_name,grantee,privilege_type,is_grantable
from information_schema.column_privileges
where table_schema='public' and table_name='users'
  and grantee in ('anon','authenticated','service_role','PUBLIC')
order by grantee,column_name,privilege_type;

-- G. Exact types/defaults needed by migration 003's profile and doctor functions
-- are visible in section A. Confirm users.id is UUID with a generated default;
-- role/status are compatible with text values; and assigned_doctor_id is UUID.


-- H. Existing isolated diary tables are a stop-and-review condition. If present,
-- compare their columns, constraints, policies and grants before using 002.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       p.polname, p.polcmd, p.polpermissive,
       pg_get_expr(p.polqual,p.polrelid) as using_expression,
       pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_policy p on p.polrelid=c.oid
where n.nspname='public' and c.relname in ('food_diary_meals','food_diary_items')
order by c.relname,p.polname;
