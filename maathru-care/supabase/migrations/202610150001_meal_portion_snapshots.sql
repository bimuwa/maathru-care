-- Phase 4 draft: additive portion metadata for meal_items.
-- Apply only after staging restore, auth redesign, and explicit project-owner approval.
-- This migration intentionally does not enable writes or alter RLS/grants: the app
-- currently has no verifiable Supabase Auth session, so no safe write policy exists.

begin;

alter table public.meal_items
  add column if not exists portion_amount numeric,
  add column if not exists portion_unit text,
  add column if not exists reference_amount numeric,
  add column if not exists reference_unit text,
  add column if not exists reference_description text,
  add column if not exists portion_provenance text,
  add column if not exists calculation_version text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_portion_amount_positive') then
    alter table public.meal_items add constraint meal_items_portion_amount_positive
      check (portion_amount is null or portion_amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_reference_amount_positive') then
    alter table public.meal_items add constraint meal_items_reference_amount_positive
      check (reference_amount is null or reference_amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_portion_unit_allowed') then
    alter table public.meal_items add constraint meal_items_portion_unit_allowed
      check (portion_unit is null or portion_unit in ('g', 'piece', 'cup')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_reference_unit_allowed') then
    alter table public.meal_items add constraint meal_items_reference_unit_allowed
      check (reference_unit is null or reference_unit in ('g', 'piece', 'cup')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_portion_pair') then
    alter table public.meal_items add constraint meal_items_portion_pair
      check ((portion_amount is null) = (portion_unit is null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_reference_pair') then
    alter table public.meal_items add constraint meal_items_reference_pair
      check ((reference_amount is null) = (reference_unit is null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_portion_provenance_allowed') then
    alter table public.meal_items add constraint meal_items_portion_provenance_allowed
      check (portion_provenance is null or portion_provenance in
        ('estimated_suggested', 'user_adjusted', 'user_confirmed', 'quantity_unknown', 'legacy_unconfirmed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.meal_items'::regclass and conname = 'meal_items_unknown_portion_has_no_amount') then
    alter table public.meal_items add constraint meal_items_unknown_portion_has_no_amount
      check (portion_provenance is distinct from 'quantity_unknown' or portion_amount is null) not valid;
  end if;
end $$;

commit;

-- Existing meal_items rows are untouched; all new columns are nullable.
-- Existing carbs_g/sugar_g/fiber_g/fat_g/iron_mg/calcium_mg remain the consumed
-- amount snapshot (as written by existing callers). New portion/reference fields
-- describe the basis and amount and must not be used to multiply those snapshots
-- again when rendering historical or new entries.
