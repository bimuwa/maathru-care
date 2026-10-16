-- Requires reviewed backup/restore and staging validation. Do not run in production
-- until the project owner approves it. Existing profile IDs and meal rows are retained.
begin;

alter table public.users add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
-- Signup does not collect these for every role; keep existing values and make
-- the optional clinical fields nullable for new profile rows.
alter table public.users alter column age drop not null;
alter table public.users alter column gestational_week drop not null;
alter table public.users alter column bmi drop not null;
-- Fail and roll back before installing functions/policies if this project has
-- drifted from the reviewed profile schema those functions address.
do $$
declare v_missing text; v_bad_types text;
begin
  select string_agg(required.column_name, ', ' order by required.column_name)
    into v_missing
  from unnest(array[
    'id','auth_user_id','email','role','full_name','phone','age','blood_group',
    'gestational_week','no_of_pregnancy','gestation_in_previous_pregnancy','bmi','hdl',
    'sys_bp','dia_bp','ogtt','hemoglobin','family_history','unexplained_prenatal_loss',
    'large_child_or_birth_default','pcos','sedentary_lifestyle','prediabetes',
    'medical_license','specialty','hospital','approval_status','assigned_doctor_id','created_at'
  ]) as required(column_name)
  left join information_schema.columns c
    on c.table_schema='public' and c.table_name='users' and c.column_name=required.column_name
  where c.column_name is null;
  if v_missing is not null then
    raise exception 'Reviewed auth/profile migration requires missing public.users columns: %', v_missing;
  end if;

  select string_agg(format('%s=%s', expected.column_name, coalesce(c.data_type, 'missing')), ', ' order by expected.column_name)
    into v_bad_types
  from (values
    ('id','uuid'),('auth_user_id','uuid'),('age','double precision'),
    ('gestational_week','integer'),('bmi','double precision'),('assigned_doctor_id','uuid')
  ) as expected(column_name, data_type)
  left join information_schema.columns c
    on c.table_schema='public' and c.table_name='users' and c.column_name=expected.column_name
  where c.data_type is distinct from expected.data_type;
  if v_bad_types is not null then
    raise exception 'Reviewed auth/profile migration found incompatible public.users types: %', v_bad_types;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='users'
      and column_name in ('role','approval_status') and data_type not in ('text','character varying')) then
    raise exception 'public.users.role and approval_status must use a text-compatible type';
  end if;
end $$;
-- Supabase Auth is the credential authority. Preserve legacy password data,
-- but do not require a second password value for newly provisioned profiles.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='password') then
    execute 'alter table public.users alter column password drop not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='password_hash') then
    execute 'alter table public.users alter column password_hash drop not null';
  end if;
end $$;
do $$
begin
  if exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.users'::regclass
      and c.confrelid = 'auth.users'::regclass and c.contype = 'f'
      and c.conkey = array[(select a.attnum from pg_attribute a
        where a.attrelid = 'public.users'::regclass and a.attname = 'auth_user_id')]::smallint[]
  ) and not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.users'::regclass
      and c.confrelid = 'auth.users'::regclass and c.contype = 'f' and c.confdeltype = 'n'
      and c.conkey = array[(select a.attnum from pg_attribute a
        where a.attrelid = 'public.users'::regclass and a.attname = 'auth_user_id')]::smallint[]
  ) then
    -- Preserve an existing FK's delete behavior; do not rewrite live relations.
    null;
  elsif not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.users'::regclass
      and c.confrelid = 'auth.users'::regclass and c.contype = 'f'
      and c.conkey = array[(select a.attnum from pg_attribute a
        where a.attrelid = 'public.users'::regclass and a.attname = 'auth_user_id')]::smallint[]
  ) then
    alter table public.users add constraint users_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;
create unique index if not exists users_auth_user_id_uidx on public.users(auth_user_id) where auth_user_id is not null;

-- Signup metadata is copied only after Supabase Auth creates the identity. This
-- never matches an existing profile by email and never copies legacy passwords.
create or replace function public.provision_auth_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m jsonb := new.raw_user_meta_data;
begin
  -- This Auth project may serve other clients too. Provision only signups that
  -- explicitly originate from this app. Never match an existing profile by email.
  if coalesce(m->>'maathru_care_signup','') <> 'v1' then return new; end if;
  if coalesce(m->>'role','') not in ('mother','doctor') then
    raise exception 'Maathru Care signup role is invalid';
  end if;
  if nullif(btrim(coalesce(m->>'full_name','')), '') is null then
    raise exception 'Full name is required to create a Maathru Care profile';
  end if;
  if exists (select 1 from public.users u where u.auth_user_id = new.id) then return new; end if;
  if exists (select 1 from public.users u where lower(u.email) = lower(new.email)) then return new; end if;
  insert into public.users (
    auth_user_id, email, role, full_name, phone, age, blood_group, gestational_week,
    no_of_pregnancy, gestation_in_previous_pregnancy, bmi, hdl, sys_bp, dia_bp,
    ogtt, hemoglobin, family_history, unexplained_prenatal_loss,
    large_child_or_birth_default, pcos, sedentary_lifestyle, prediabetes,
    medical_license, specialty, hospital, approval_status
  ) values (
    new.id, new.email,
    m->>'role',
    nullif(btrim(m->>'full_name'),''), nullif(m->>'phone',''), nullif(m->>'age','')::double precision,
    nullif(m->>'blood_group',''), nullif(m->>'gestational_week','')::integer,
    nullif(m->>'no_of_pregnancy','')::numeric, nullif(m->>'gestation_in_previous_pregnancy','')::numeric,
    nullif(m->>'bmi','')::double precision, nullif(m->>'hdl','')::numeric, nullif(m->>'sys_bp','')::numeric,
    nullif(m->>'dia_bp','')::numeric, nullif(m->>'ogtt','')::numeric, nullif(m->>'hemoglobin','')::numeric,
    nullif(m->>'family_history','')::integer, nullif(m->>'unexplained_prenatal_loss','')::integer,
    nullif(m->>'large_child_or_birth_default','')::integer, nullif(m->>'pcos','')::integer,
    nullif(m->>'sedentary_lifestyle','')::integer, nullif(m->>'prediabetes','')::integer,
    nullif(m->>'medical_license',''), nullif(m->>'specialty',''), nullif(m->>'hospital',''),
    case when m->>'role' = 'doctor' then 'pending' else 'not_required' end
  );
  return new;
end $$;
revoke all on function public.provision_auth_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_maathru on auth.users;
create trigger on_auth_user_created_maathru after insert on auth.users
for each row execute function public.provision_auth_profile();

-- Recovery path for Auth accounts created before the provisioning trigger was
-- installed. It only creates a new profile for the caller's own signup metadata,
-- and refuses to guess-link any existing profile by email.
create or replace function public.provision_my_auth_profile()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_auth_id uuid := auth.uid();
  v_auth auth.users%rowtype;
  v_profile_id uuid;
  m jsonb;
begin
  if v_auth_id is null then raise exception 'Sign in is required'; end if;
  select * into v_auth from auth.users where id = v_auth_id;
  if not found then raise exception 'Authenticated account was not found'; end if;
  if v_auth.email_confirmed_at is null then raise exception 'Verify the Auth email before creating a Maathru Care profile'; end if;
  select id into v_profile_id from public.users where auth_user_id = v_auth_id;
  if v_profile_id is not null then return v_profile_id; end if;
  m := v_auth.raw_user_meta_data;
  if coalesce(m->>'maathru_care_signup','') <> 'v1'
    or coalesce(m->>'role','') not in ('mother','doctor')
    or nullif(btrim(coalesce(m->>'full_name','')), '') is null then
    raise exception 'No self-registration profile data is available; an administrator must link the existing test profile';
  end if;
  if exists (select 1 from public.users u where lower(u.email) = lower(v_auth.email)) then
    raise exception 'An existing profile uses this email. An administrator must verify ownership and link it';
  end if;
  insert into public.users (
    auth_user_id,email,role,full_name,phone,age,blood_group,gestational_week,no_of_pregnancy,
    gestation_in_previous_pregnancy,bmi,hdl,sys_bp,dia_bp,ogtt,hemoglobin,family_history,
    unexplained_prenatal_loss,large_child_or_birth_default,pcos,sedentary_lifestyle,prediabetes,
    medical_license,specialty,hospital,approval_status
  ) values (
    v_auth_id,v_auth.email,m->>'role',
    nullif(btrim(m->>'full_name'),''),nullif(m->>'phone',''),nullif(m->>'age','')::double precision,
    nullif(m->>'blood_group',''),nullif(m->>'gestational_week','')::integer,
    nullif(m->>'no_of_pregnancy','')::numeric,nullif(m->>'gestation_in_previous_pregnancy','')::numeric,
    nullif(m->>'bmi','')::double precision,nullif(m->>'hdl','')::numeric,nullif(m->>'sys_bp','')::numeric,
    nullif(m->>'dia_bp','')::numeric,nullif(m->>'ogtt','')::numeric,nullif(m->>'hemoglobin','')::numeric,
    nullif(m->>'family_history','')::integer,nullif(m->>'unexplained_prenatal_loss','')::integer,
    nullif(m->>'large_child_or_birth_default','')::integer,nullif(m->>'pcos','')::integer,
    nullif(m->>'sedentary_lifestyle','')::integer,nullif(m->>'prediabetes','')::integer,
    nullif(m->>'medical_license',''),nullif(m->>'specialty',''),nullif(m->>'hospital',''),
    case when m->>'role'='doctor' then 'pending' else 'not_required' end
  ) returning id into v_profile_id;
  return v_profile_id;
end $$;
revoke all on function public.provision_my_auth_profile() from public, anon;
grant execute on function public.provision_my_auth_profile() to authenticated;

-- Restricted doctor directory: expose approved public-facing credentials only.
create or replace function public.get_approved_doctors()
returns table (id uuid, full_name text, specialty text, hospital text, medical_license text, phone text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.full_name, u.specialty, u.hospital, u.medical_license, u.phone
  from public.users u
  where u.role = 'doctor' and u.approval_status = 'approved'
  order by u.full_name
$$;
revoke all on function public.get_approved_doctors() from public, anon;
grant execute on function public.get_approved_doctors() to authenticated;

-- Replace all prior policies on these tables so an older permissive policy cannot
-- OR-bypass the owner-scoped policies defined below.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in ('users','meal_logs','meal_items','maternal_foods')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- A mother can request one approved doctor using their Auth identity. The client
-- cannot supply a patient profile ID and cannot set role or auth_user_id.
create or replace function public.request_doctor_assignment(p_doctor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mother_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select u.id into v_mother_id from public.users u
    where u.auth_user_id = auth.uid() and u.role = 'mother';
  if v_mother_id is null then raise exception 'Mother profile is not linked'; end if;
  if not exists (select 1 from public.users d where d.id = p_doctor_id
    and d.role = 'doctor' and d.approval_status = 'approved') then
    raise exception 'Selected doctor is not approved or available';
  end if;
  update public.users set assigned_doctor_id = p_doctor_id, approval_status = 'pending'
    where id = v_mother_id;
end $$;
revoke all on function public.request_doctor_assignment(uuid) from public, anon;
grant execute on function public.request_doctor_assignment(uuid) to authenticated;

create or replace function public.food_diary_is_ready()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users u where u.auth_user_id = (select auth.uid()))
$$;
revoke all on function public.food_diary_is_ready() from public, anon;
grant execute on function public.food_diary_is_ready() to authenticated;

-- Existing research profiles are linked by a project administrator only after
-- the account owner verifies control of the Supabase Auth address. No email join.
create or replace function public.admin_link_auth_profile(p_profile_id uuid, p_auth_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_auth_email text; v_verified timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'Project administrator or service role required';
  end if;
  select email, email_confirmed_at into v_auth_email, v_verified
    from auth.users where id = p_auth_user_id;
  if v_auth_email is null or v_verified is null then raise exception 'Auth account email must be verified before linking'; end if;
  update public.users set auth_user_id = p_auth_user_id
    where id = p_profile_id and auth_user_id is null and lower(email) = lower(v_auth_email);
  if not found then raise exception 'Profile missing or already linked'; end if;
end $$;
revoke all on function public.admin_link_auth_profile(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_link_auth_profile(uuid, uuid) to service_role;

alter table public.users enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;
alter table public.maternal_foods enable row level security;

drop policy if exists users_select_own_auth_profile on public.users;
create policy users_select_own_auth_profile on public.users for select to authenticated
  using (auth_user_id = (select auth.uid()));
drop policy if exists users_update_own_auth_profile on public.users;
create policy users_update_own_auth_profile on public.users for update to authenticated
  using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
revoke all on public.users from public, anon, authenticated;
do $$
declare v_columns text;
begin
  select string_agg(format('%I', a.attname), ', ' order by a.attnum) into v_columns
  from pg_attribute a where a.attrelid = 'public.users'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_columns is not null then
    execute format('revoke all privileges (%s) on public.users from public, anon, authenticated', v_columns);
  end if;
end $$;
grant select (id,auth_user_id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license,
  no_of_pregnancy,gestation_in_previous_pregnancy,bmi,hdl,family_history,unexplained_prenatal_loss,
  large_child_or_birth_default,pcos,sys_bp,dia_bp,ogtt,hemoglobin,sedentary_lifestyle,prediabetes,created_at)
  on public.users to authenticated;
grant update (full_name,phone,age,blood_group,gestational_week,no_of_pregnancy,gestation_in_previous_pregnancy,bmi,hdl,
  family_history,unexplained_prenatal_loss,large_child_or_birth_default,pcos,sys_bp,dia_bp,ogtt,hemoglobin,sedentary_lifestyle,prediabetes)
  on public.users to authenticated;

drop policy if exists meal_logs_select_owner on public.meal_logs;
create policy meal_logs_select_owner on public.meal_logs for select to authenticated
  using (exists (select 1 from public.users u where u.id = meal_logs.user_id and u.auth_user_id = (select auth.uid())));
drop policy if exists meal_items_select_owner on public.meal_items;
create policy meal_items_select_owner on public.meal_items for select to authenticated
  using (exists (select 1 from public.meal_logs l join public.users u on u.id = l.user_id
    where l.id = meal_items.meal_log_id and u.auth_user_id = (select auth.uid())));
revoke all on public.meal_logs, public.meal_items from public, anon, authenticated;
grant select on public.meal_logs, public.meal_items to authenticated;

drop policy if exists maternal_foods_read_catalog on public.maternal_foods;
create policy maternal_foods_read_catalog on public.maternal_foods for select to anon, authenticated using (true);
revoke all on public.maternal_foods from public, anon, authenticated;
grant select on public.maternal_foods to anon, authenticated;

commit;

-- Deliberately no doctor/patient table policies are granted here: the relationship
-- table and its approval semantics must be confirmed from the live schema first.
-- The legacy meal_logs tables are read-only to clients until the separately
-- reviewed atomic meal RPC is deployed. Saves use the isolated diary RPC migration.
