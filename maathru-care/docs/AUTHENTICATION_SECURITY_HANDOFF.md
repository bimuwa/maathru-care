# Authentication, RLS, and meal persistence handoff

## What changed

The former login queried `public.users` using both email and `password`, and treated the profile UUID as a bearer token. Registration inserted the submitted password into that table. Those client-side password checks and writes have been removed.

Login and registration now call Supabase Auth. The app restores and refreshes the Supabase session, loads the app profile by `auth_user_id`, and sends the access token to the existing API client. Password recovery sends a verified recovery link and provides a reset screen. The Food Diary now shares this same session; it no longer creates an unrelated diary account.

Native session persistence currently uses React Native AsyncStorage; web uses browser localStorage. This keeps sessions persistent and refreshable, but AsyncStorage is not encrypted at rest. Installing Expo SecureStore was attempted using the Expo SDK 57 installer and failed because the package registry was unreachable (`EACCES`). Before release, add the SDK 57 compatible `expo-secure-store` package and use it as native Supabase storage. Browser localStorage also depends on standard XSS protections.

## Database files

Apply in staging only, after a verified backup and schema inspection:

1. `supabase/migrations/202610150001_meal_portion_snapshots.sql`
2. `supabase/migrations/202610150002_food_diary_isolated.sql`
3. `supabase/migrations/202610150003_auth_and_legacy_rls.sql`

The portion migration adds nullable snapshot metadata and leaves existing rows intact. The Food Diary migration stores new meal snapshots in separate owner-scoped tables and writes the parent and all children in one idempotent RPC transaction. Nutrient snapshots are stored as already-scaled values; do not multiply them by portions again. The final migration maps the Auth UUID to the stable `public.users.id`, adds a signup profile trigger, grants only selected profile columns, makes legacy meals read-only to authenticated owners, and keeps the food catalog readable but not writable by clients.

The app deliberately selects only profile columns needed for identity and routing. Table-level grants on `users` are revoked; role and `auth_user_id` are not updateable by clients. New doctor signups are pending and cannot sign in to the doctor area until an administrator approves them. Doctor/patient access policies are not included because the live relationship schema and approval semantics were not available in this workspace. Do not grant broad doctor access based on a role value alone.

Existing records are preserved. `admin_link_auth_profile(profile_id, auth_user_id)` is executable only by `service_role`; it does not link by email. It is intended for one profile at a time after the test-account owner verifies control of the new Auth account. `provision_my_auth_profile()` is a recovery path for an authenticated signup made before the trigger was installed: it creates a profile only from that caller's signup metadata and refuses to guess-link an existing profile by email. Legacy passwords are neither read nor copied. Existing legacy meal records remain attached to their stable profile IDs.

## Account migration checklist

1. Take a Supabase backup and confirm a tested restore path.
2. On staging, inspect profile IDs, email addresses, `auth_user_id` linkage state, duplicate addresses, and foreign-key counts without exporting passwords or sensitive health fields.
3. Create/verify each Auth test account using the owner-controlled email recovery flow. Never reuse `public.users.password`.
4. An administrator uses the service role from a trusted server or SQL Editor to call `admin_link_auth_profile` for the reviewed profile UUID and verified `auth.users.id`. Do not enable service role in the client.
5. Sign in as that account and verify that the profile loads and only its own meals are visible.
6. For new accounts, verify the Auth signup trigger creates a profile. Email confirmation behavior depends on the Supabase Auth setting; when confirmation is required, the user must confirm and then sign in.

## Files changed

- `src/lib/supabase.ts`: persistent Supabase session storage and refresh.
- `src/context/AuthContext.tsx`: session restore, profile lookup by auth UUID, and signout.
- `src/services/api.ts`: Supabase Auth login/registration; no plaintext password query/insert.
- `src/app/login.tsx`: Supabase login and recovery email entry.
- `src/app/auth/callback.tsx`, `src/app/auth/reset-password.tsx`: recovery link exchange and password update.
- `src/app/register.tsx`: Supabase registration and pending doctor approval behavior.
- `src/services/foodDiaryService.ts`, `src/components/ui/FoodDiaryAuthModal.tsx`: shared app auth session.
- `supabase/migrations/202610150003_auth_and_legacy_rls.sql`: Auth profile mapping, restricted grants, owner policies, catalog read policy, and admin linking function.
- `supabase/migrations/202610150002_food_diary_isolated.sql`: readiness requires a mapped app profile.

## Verification and remaining work

Local Food Diary tests passed (8/8) and Food Scanner UI tests passed (26/26). TypeScript `npx tsc --noEmit` completed without diagnostics in the combined check. These tests do not connect to Supabase or prove the SQL against the live schema.

No database migration was applied. No staging credentials or database connection were available, and no Auth user was created, linked, or tested. Save Meal is enabled only when a mapped Auth session exists and the required database migration is installed; the current project database was not reachable to verify readiness. No meal was saved and reloaded from Supabase during this work.

Before enabling this in a shared environment, verify the audited table columns and existing grants against the actual project, check all SQL on a restored staging copy, test RLS using two real Auth sessions, and verify login, email confirmation, recovery links on web and native, doctor approval, and save/readback. The existing API at `EXPO_PUBLIC_BACKEND_BASE_URL` is outside this frontend repository; it must validate Supabase JWTs and enforce its own doctor/patient authorization before the access token is used for those endpoints. The AI backend was not changed.

Do not run these migrations in production until the project owner approves the reviewed SQL and backup/rollback plan.
