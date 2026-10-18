-- DRAFT ONLY. Do not apply to the current app.
-- Requires successful Supabase Auth migration and complete caller-flow review.
-- Current login has no signed Auth token; applying this now would break app reads
-- and would not make the existing user-ID token trustworthy.
-- Doctor/patient access is not represented here and must be designed before rollout.

begin;

revoke all privileges on table public.users, public.maternal_foods,
  public.meal_logs, public.meal_items from anon;
revoke all privileges on table public.users, public.maternal_foods,
  public.meal_logs, public.meal_items from authenticated;

grant select on table public.users, public.maternal_foods,
  public.meal_logs, public.meal_items to authenticated;
grant insert on table public.meal_logs, public.meal_items to authenticated;

alter table public.users enable row level security;
alter table public.maternal_foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;

create policy users_select_linked_auth_user on public.users
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy maternal_foods_select_authenticated on public.maternal_foods
  for select to authenticated using (true);

create policy meal_logs_select_owner on public.meal_logs
  for select to authenticated
  using (exists (
    select 1 from public.users u
    where u.id = meal_logs.user_id and u.auth_user_id = (select auth.uid())
  ));

create policy meal_logs_insert_owner on public.meal_logs
  for insert to authenticated
  with check (exists (
    select 1 from public.users u
    where u.id = meal_logs.user_id and u.auth_user_id = (select auth.uid())
  ));

create policy meal_items_select_owner on public.meal_items
  for select to authenticated
  using (exists (
    select 1 from public.meal_logs ml
    join public.users u on u.id = ml.user_id
    where ml.id = meal_items.meal_log_id and u.auth_user_id = (select auth.uid())
  ));

create policy meal_items_insert_owner on public.meal_items
  for insert to authenticated
  with check (exists (
    select 1 from public.meal_logs ml
    join public.users u on u.id = ml.user_id
    where ml.id = meal_items.meal_log_id and u.auth_user_id = (select auth.uid())
  ));

commit;

-- Deliberately omitted: users writes, meal updates/deletes, doctor/patient sharing,
-- RPC, service-role access, and idempotency. Design those against actual flows and
-- test cross-user denial plus doctor workflows before considering an apply.
