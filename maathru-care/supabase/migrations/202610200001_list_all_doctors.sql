-- Let mothers browse every registered doctor, including doctors awaiting review.
-- Keep the existing authenticated-only RPC access and response fields.
create or replace function public.get_approved_doctors()
returns table (id uuid, full_name text, specialty text, hospital text, medical_license text, phone text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.full_name, u.specialty, u.hospital, u.medical_license, u.phone
  from public.users u
  where u.role = 'doctor'
  order by u.full_name
$$;
revoke all on function public.get_approved_doctors() from public, anon;
grant execute on function public.get_approved_doctors() to authenticated;

-- A mother may request assignment to any listed doctor. The request still
-- derives the mother's profile from the authenticated session.
create or replace function public.request_doctor_assignment(p_doctor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mother_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select u.id into v_mother_id from public.users u
    where u.auth_user_id = auth.uid() and u.role = 'mother';
  if v_mother_id is null then raise exception 'Mother profile is not linked'; end if;
  if not exists (select 1 from public.users d where d.id = p_doctor_id
    and d.role = 'doctor') then
    raise exception 'Selected doctor is not available';
  end if;
  update public.users set assigned_doctor_id = p_doctor_id, approval_status = 'pending'
    where id = v_mother_id;
end $$;
revoke all on function public.request_doctor_assignment(uuid) from public, anon;
grant execute on function public.request_doctor_assignment(uuid) to authenticated;
