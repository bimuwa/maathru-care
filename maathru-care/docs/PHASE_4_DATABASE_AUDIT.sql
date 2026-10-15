-- Maathru Care Phase 4: READ-ONLY Supabase schema audit.
-- Run in Supabase SQL Editor against the intended staging project first.
-- This file contains metadata queries only; it does not read meal contents,
-- change schema, or write application data.

-- 1) Actual columns and types for the three nutrition tables (plus users,
--    because the current app's login identity must be reviewed).
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
order by table_name, ordinal_position;

-- 2) Primary keys, unique/check constraints, and foreign-key targets/actions.
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name,
  rc.update_rule,
  rc.delete_rule,
  chk.check_clause
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_catalog = kcu.constraint_catalog
 and tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
 and tc.table_name = kcu.table_name
left join information_schema.constraint_column_usage ccu
  on tc.constraint_catalog = ccu.constraint_catalog
 and tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
left join information_schema.referential_constraints rc
  on tc.constraint_catalog = rc.constraint_catalog
 and tc.constraint_schema = rc.constraint_schema
 and tc.constraint_name = rc.constraint_name
left join information_schema.check_constraints chk
  on tc.constraint_catalog = chk.constraint_catalog
 and tc.constraint_schema = chk.constraint_schema
 and tc.constraint_name = chk.constraint_name
where tc.table_schema = 'public'
  and tc.table_name in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 3) Index definitions, including uniqueness and partial-index predicates.
select
  t.relname as table_name,
  i.relname as index_name,
  ix.indisprimary as is_primary,
  ix.indisunique as is_unique,
  pg_get_indexdef(ix.indexrelid) as index_definition
from pg_class t
join pg_namespace n on n.oid = t.relnamespace
join pg_index ix on ix.indrelid = t.oid
join pg_class i on i.oid = ix.indexrelid
where n.nspname = 'public'
  and t.relname in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
order by t.relname, i.relname;

-- 4) RLS state and every policy's command, role, USING, and WITH CHECK rules.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  p.polname as policy_name,
  p.polcmd as command,
  p.polpermissive as permissive,
  array(select r.rolname from pg_roles r where r.oid = any(p.polroles)) as roles,
  pg_get_expr(p.polqual, p.polrelid) as using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
order by c.relname, p.polname;

-- 5) Table/sequence/function privileges granted to API roles.
select
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

-- 6) Triggers attached to these tables.
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_orientation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('meal_logs', 'meal_items', 'maternal_foods', 'users')
order by event_object_table, trigger_name, event_manipulation;

-- 7) Existing RPCs that may already participate in meal persistence.
select
  p.oid::regprocedure as function_signature,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname ilike '%meal%' or p.proname ilike '%food%')
order by p.proname, p.oid::regprocedure::text;

-- 8) Relevant enum/domain definitions, if meal_type or portion fields use them.
select
  n.nspname as type_schema,
  t.typname as type_name,
  t.typtype as type_kind,
  e.enumsortorder,
  e.enumlabel
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
left join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
  and (t.typname ilike '%meal%' or t.typname ilike '%portion%' or t.typname ilike '%unit%')
order by t.typname, e.enumsortorder;
