# Phase 4: verification gates

No migration has been applied and no meal data has been written.

## Findings from the local app

- `src/types/database.types.ts` describes the legacy `meal_logs` and
  `meal_items` columns only. It is generated-looking local metadata, not proof
  of the live Supabase schema, constraints, triggers, or RLS policies.
- `src/services/mealService.ts` deliberately blocks new-portion persistence.
- `src/lib/supabase.ts` creates an anon-key client with session persistence
  disabled. It does not attach a Supabase Auth session.
- `src/services/api.ts` currently authenticates by selecting `public.users`
  with an email/password comparison and returns `data.id` as its token. This
  is not a signed Supabase JWT. Consequently, PostgreSQL `auth.uid()` cannot
  securely identify the caller from this client, and a caller-provided user ID
  must not be trusted for writes.
- The nutrition and GDM history screens already read `meal_logs` joined with
  `meal_items`; the exact display behavior must be rechecked against the new
  versioned snapshot contract after the schema is verified.

## Required before a safe migration can be finalized

1. Run `PHASE_4_DATABASE_AUDIT.sql` in the intended Supabase project. Save all
   result sets (metadata only) and provide them here. Do this in staging first.
2. Confirm whether the app's `users.id` values are the same UUIDs as
   `auth.users.id`, and whether callers have real Supabase Auth access tokens.
3. Establish the approved write identity architecture. Options include moving
   login to Supabase Auth, or adding an authenticated backend endpoint that
   verifies the app session and performs a transaction using server-side
   credentials. Never place a service-role key in the Expo app.
4. Create and verify a recoverable backup/snapshot before any production
   migration. The current repository has no connection to inspect project
   backup/PITR settings, so those settings must be checked in the Supabase
   dashboard by the project owner.

## Backup gate (project-owner action)

In the Supabase Dashboard, open the intended project's **Database → Backups**
and confirm the latest backup completed before the migration window. Check the
project plan and retention shown there: downloadable daily backups and PITR
availability vary by plan/add-on and project configuration. If the project
offers a downloadable backup, download it and verify the file exists and is
non-empty; ideally restore it into a separate staging project and verify the
restored schema/data. If not, confirm the available recovery path and point in
time before proceeding. Database backups do not include Storage object files,
so separately back up any relevant Storage buckets. Supabase describes daily
backups and PITR as plan/configuration-dependent; see its [Database backups
guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
and [PITR usage guide](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery).

Once the schema audit and write-identity design are known, prepare a migration
that matches the real column types and constraints, adds only nullable/versioned
fields, preserves all existing rows and legacy snapshots, and implements an
atomic idempotent save contract with ownership checks. Do not run a production
migration until separately approved.

## Why save integration is paused

The Phase 4 brief explicitly says to wait for the migration result before
continuing frontend save integration. Enabling the button against the current
client would be insecure and could store a spoofed `user_id`; using legacy
`serving_multiplier` would also lose the new quantity's unit/reference meaning.
