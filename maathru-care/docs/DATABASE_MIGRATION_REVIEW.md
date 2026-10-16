# Phase 4 database migration review

## Review status

This is a static review of the local SQL drafts and local frontend calls. No database connection was used and no SQL was applied. The live column types, existing constraints, RLS policies, grants, triggers, and migration history still need to be checked on the intended staging project. The drafts must not be treated as approved for production.

## Target project identity

The frontend `.env` config points at Supabase project ref `kwsysidhjdsyobaosuxe`. The repository contains no `supabase/config.toml`, no linked Supabase CLI project-ref file, no staging URL/ref, and no production URL/ref. `eas.json`/`app.json` identify the Expo app, not the Supabase environment. Therefore the configured database is known, but it cannot be classified as staging or production from verified local evidence. Open Supabase Dashboard and match its project ref to this ref before running any SQL. Do not use it as staging unless the project owner verifies that label.

## Migration sequence and dependencies

Use this order, after the preflight passes:

1. `202610150001_meal_portion_snapshots.sql`
2. `202610150002_food_diary_isolated.sql`
3. `202610150003_auth_and_legacy_rls.sql`

The first migration adds nullable portion metadata to existing `meal_items`; it does not rewrite existing nutrient snapshots. Its constraints are `NOT VALID`, so old rows are preserved and new/updated rows are checked. It assumes `public.meal_items` exists and has no conflicting same-named columns with different types.

The second migration creates isolated diary tables and a transactional save RPC. It does not alter legacy meal data. It references `public.users.auth_user_id` inside the PL/pgSQL save function at execution time; the function will reject calls until migration 003 creates/validates that mapping. `food_diary_is_ready()` is defined in migration 003, so the UI remains gated until the full sequence finishes. `CREATE TABLE IF NOT EXISTS` and drop/recreate named policies allow rerun after a fully committed run; a pre-existing partial/incompatible table is still a stop condition.

The third migration adds/validates Auth mapping, account-provisioning functions, limited client grants, and RLS. Signup trigger provisioning is limited to metadata marked `maathru_care_signup='v1'`, does not link existing profiles by email, and skips an email collision. The authenticated recovery RPC creates a profile only for the caller and refuses to create a duplicate when a legacy profile with the same normalized email exists. The admin link function requires a verified Auth email matching the selected legacy profile. Doctor directory and assignment use narrow functions; no doctor read policy grants access to patient records.

The migration files are transactional and largely rerunnable, but they do not constitute a tested rollback. Dropping migration 002 tables would destroy any saved diary rows. Removing the Auth mapping would break logins and disconnect legacy history. Do not roll back by dropping tables or columns after data has been saved; prefer a forward fix. Migration 001's columns can be left in place harmlessly if a later step fails.

## Frontend compatibility review

- Auth profile lookup selects explicit columns permitted by the new profile grants.
- GDM profile loading now selects only the clinical fields it needs; these remain restricted by own-profile RLS.
- Food Search reads `maternal_foods`; migration 003 keeps catalog SELECT available to anon/authenticated and removes client writes.
- Registration's doctor list now calls `get_approved_doctors()`; mother-to-doctor requests call `request_doctor_assignment()`. Direct users-table reads/updates would be blocked by least-privilege RLS.
- Legacy meal history uses own `meal_logs` and related `meal_items`; reads remain allowed only where `users.auth_user_id` maps to the signed-in Auth user. Existing rows and stable profile IDs are not rewritten.
- New diary history reads owner-scoped `food_diary_meals` and items. Save uses a single atomic RPC and checks the Auth-to-profile mapping.
- Doctor/patient APIs use the separate service at `EXPO_PUBLIC_BACKEND_BASE_URL` (default localhost port 5000). Its source is not present in this frontend checkout, so JWT validation and approved doctor/patient authorization there cannot be verified here. Do not treat the RLS migration as securing those backend routes.

## Required preflight

In the confirmed staging project's SQL Editor, run `supabase/validation/202610150003_auth_rls_preflight.sql` and the existing `docs/PHASE_4_DATABASE_AUDIT.sql`. Stop if required columns/types/defaults differ, `users.id` has no generated default, the Auth mapping has duplicates/orphans, duplicate normalized profile emails exist, an Auth link is unverified, or existing policies/grants are broader than expected. Specifically verify UUID `users.id` and `assigned_doctor_id`, the role/status representations, all trigger-insert columns, and existing Auth-user triggers. The audits return metadata/counts rather than profile values.

Existing unknown permissive policies are not dropped by these migrations. PostgreSQL permissive policies combine with OR, so any existing broad policy can defeat a new owner policy. Review and explicitly remove or replace those policies before proceeding. Check column-level grants too; migration 003 revokes them dynamically before granting the selected profile columns.

## Backup and safety checklist

1. Identify staging by project ref in Dashboard; staging and production must be distinct Supabase projects.
2. Confirm the latest backup timestamp and restore options in Dashboard. For a recoverable pre-migration point, verify the plan supports the required backup/PITR retention; Supabase daily backups and PITR availability depend on project plan/settings.
3. Prefer a restored staging clone and test restore before changes. Also export schema and data through the Supabase CLI/database connection using a secure local destination if available; never paste database passwords or service-role keys into chat.
4. Preserve Supabase Auth users and Storage separately in the backup/recovery plan. Do not delete/recreate the Auth account already created by signup.
5. Save the preflight outputs and migration filenames/timestamps with the change record.
6. Run each complete migration file in a separate SQL Editor query, in the order above. Confirm success/commit before the next file. If any file errors, stop; do not run later files and do not retry against a partially created incompatible schema without inspecting it.
7. Run `supabase/validation/202610150002_food_diary_isolated.sql` and `supabase/validation/202610150003_auth_rls_postflight.sql` after the sequence. Review policies and grants, not just row counts.
8. Test with two verified staging Auth accounts: first account self-profile and GDM, Food Search, legacy history, save and date-filtered readback; second account cannot read/update the first account's rows. Test mother/approved-doctor assignment and the separate backend authorization before declaring doctor workflows healthy.
9. Keep production untouched until project identity, schema, backup/restore, and staging evidence have been reviewed and the project owner explicitly approves production.

Supabase warns that direct Dashboard SQL edits are not automatically reflected in migration history. After using SQL Editor, do not run `supabase db push` until migration-history synchronization is handled by the team. See the official [Database Migrations guide](https://supabase.com/docs/guides/deployment/database-migrations), [Managing Environments guide](https://supabase.com/docs/guides/deployment/managing-environments), and [Backup and Restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
