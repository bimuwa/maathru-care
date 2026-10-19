-- Prevent rejected custom foods from being newly written to a diary.
-- Historical rows remain available for audit and display, but the app resolves
-- their current verification status and excludes rejected values from totals.
begin;

create or replace function public.reject_rejected_custom_food_diary_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.food_id like 'custom\_%' escape '\' and exists (
    select 1
    from public.food_diary_meals m
    join public.user_custom_foods c on c.owner_id = m.owner_id
    where m.id = new.meal_id
      and c.food_id = new.food_id
      and c.verification_status = 'rejected'
  ) then
    raise exception 'This custom food was rejected by your doctor and cannot be logged.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_rejected_custom_food_diary_item on public.food_diary_items;
create trigger reject_rejected_custom_food_diary_item
  before insert or update of food_id on public.food_diary_items
  for each row execute function public.reject_rejected_custom_food_diary_item();

revoke all on function public.reject_rejected_custom_food_diary_item() from public, anon, authenticated;

commit;
