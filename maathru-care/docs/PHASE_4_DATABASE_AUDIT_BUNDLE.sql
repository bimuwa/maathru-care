-- READ-ONLY Phase 4 audit. Returns one JSON row so one CSV export contains
-- every result group. Run in the intended Supabase project; do not run a
-- migration yet. No meal/user row contents or credentials are selected.
with target_tables as (
  select unnest(array['meal_logs', 'meal_items', 'maternal_foods', 'users']) as table_name
)
select jsonb_pretty(jsonb_build_object(
  'columns', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', c.table_name,
      'ordinal_position', c.ordinal_position,
      'column', c.column_name,
      'data_type', c.data_type,
      'udt_name', c.udt_name,
      'nullable', c.is_nullable,
      'default', c.column_default
    ) order by c.table_name, c.ordinal_position)
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name in (select table_name from target_tables)
  ), '[]'::jsonb),
  'constraints', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', t.relname,
      'name', con.conname,
      'type', con.contype,
      'definition', pg_get_constraintdef(con.oid, true)
    ) order by t.relname, con.conname)
    from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname in (select table_name from target_tables)
  ), '[]'::jsonb),
  'indexes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', t.relname,
      'name', i.relname,
      'primary', ix.indisprimary,
      'unique', ix.indisunique,
      'definition', pg_get_indexdef(ix.indexrelid)
    ) order by t.relname, i.relname)
    from pg_class t
    join pg_namespace n on n.oid = t.relnamespace
    join pg_index ix on ix.indrelid = t.oid
    join pg_class i on i.oid = ix.indexrelid
    where n.nspname = 'public'
      and t.relname in (select table_name from target_tables)
  ), '[]'::jsonb),
  'rls_and_policies', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'policy', p.polname,
      'command', p.polcmd,
      'permissive', p.polpermissive,
      'roles', (select jsonb_agg(r.rolname order by r.rolname)
                from pg_roles r where r.oid = any(p.polroles)),
      'using', pg_get_expr(p.polqual, p.polrelid),
      'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
    ) order by c.relname, p.polname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public'
      and c.relname in (select table_name from target_tables)
  ), '[]'::jsonb),
  'table_grants', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', g.table_name,
      'grantee', g.grantee,
      'privilege', g.privilege_type,
      'grantable', g.is_grantable
    ) order by g.table_name, g.grantee, g.privilege_type)
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name in (select table_name from target_tables)
      and g.grantee in ('anon', 'authenticated', 'service_role')
  ), '[]'::jsonb),
  'triggers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', tr.event_object_table,
      'name', tr.trigger_name,
      'timing', tr.action_timing,
      'event', tr.event_manipulation,
      'orientation', tr.action_orientation,
      'action', tr.action_statement
    ) order by tr.event_object_table, tr.trigger_name, tr.event_manipulation)
    from information_schema.triggers tr
    where tr.trigger_schema = 'public'
      and tr.event_object_table in (select table_name from target_tables)
  ), '[]'::jsonb),
  'meal_related_functions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'result', pg_get_function_result(p.oid),
      'security_definer', p.prosecdef,
      'settings', p.proconfig
    ) order by p.proname, p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname ilike '%meal%' or p.proname ilike '%food%')
  ), '[]'::jsonb)
)) as phase4_schema_audit;
