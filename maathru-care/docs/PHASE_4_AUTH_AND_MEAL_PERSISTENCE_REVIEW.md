# Phase 4 — authentication and meal persistence review

Reviewed locally on 2026-10-15. No Supabase connection, audit CSV exports, staging project, or backup/restore evidence was present in the workspace. No database query, migration, write, deployment, or production change was made. The supplied audit summary is treated as the project owner's reported result, not independently re-queried evidence.

## Authentication and identity

- Login in `src/services/api.ts` selects `public.users` using email **and a direct equality comparison against `password`**, then returns `data.id` as `token`.
- Registration writes the submitted password directly to `public.users.password`; no password hashing is visible in this client code.
- `AuthContext` stores the user object and this ID-token in AsyncStorage. It validates only that the ID looks like a UUID. A local UUID is not proof of identity and can be edited or fabricated by a client.
- `src/lib/supabase.ts` uses the public anon key, disables session persistence, and does not attach a Supabase Auth session. Therefore PostgreSQL `auth.uid()` is null for these app requests. The local ID is not a JWT, and equality between `users.id` and `auth.users.id` is neither assumed nor established.
- The audit summary says `users.auth_user_id` is nullable, unique and references `auth.users(id)`. It does not say existing users are linked. Thus the correct mapping would be `public.users.id` found by `auth_user_id = auth.uid()` after a real Supabase Auth login; the present app cannot perform that mapping securely.
- The audit summary reports RLS disabled and broad anon/authenticated table privileges for `users`, `maternal_foods`, `meal_logs`, and `meal_items`. Given those reported settings, unauthenticated callers possessing the public anon key can access the exposed PostgREST tables subject to any other unreported controls. The app's `select('*')` login query can return sensitive profile/health fields; direct password comparison also means the stored value is available to that query. Treat existing stored passwords as potentially plaintext or otherwise exposed; do not print, export, or reuse them.

## Affected application flows

- `api.login`: reads `users` and compares `password` in the database query.
- `api.register`: checks email and inserts `users`, including the supplied password.
- Other `api.ts` user flows (profile, updates, doctor/patient lookups) directly query `users` using client-provided IDs. Their exact compatibility with RLS requires flow-by-flow redesign; they cannot safely keep relying on global anon access.
- `mealService.getDailyNutrition` and `getWeeklyTrends`: query `meal_logs` (and items) by a caller-provided `user_id`.
- `mealService.getTodayTotals`: also reads meal logs by a caller-provided `user_id`.
- Food lookup in `mealService.getNutritionForFood` and meal scanner search reads `maternal_foods` through the anon client. These should become read-only authenticated access or a narrowly scoped public catalog policy after audit of columns.
- The nutrition and GDM care screens consume joined `meal_items` records. Revoking anon access/RLS without adapting app auth and these readers will break those screens; broad access must not be retained as a compatibility shortcut.

## Safe design decision

Do not enable Save Meal or add a client-side insert path now. RLS policies based on `auth.uid()` will reject the current client, while policies trusting a caller-supplied `users.id`, email, or AsyncStorage value are spoofable. A `SECURITY DEFINER` function cannot repair the missing proof of identity and is not proposed.

Smallest viable correction: migrate login and registration to Supabase Auth, link every app user row through `users.auth_user_id`, establish recovery for existing accounts without exposing/reusing `users.password`, and update `AuthContext`/the Supabase client to persist and refresh the actual Auth session. Then use `auth.uid()` policies and a transaction RPC with `SECURITY INVOKER` (or an authenticated server that verifies a signed token) to resolve the owner. Audit and adapt doctor/patient access separately before tightening `users` policies. Do not put a service-role key in the Expo app.

The supplied audit result claims existing users have `password` fields but does not include actual values or password format; values were not inspected. Whether existing passwords are plaintext, hashed, or mixed remains unverified. Do not run a SELECT that returns password values. A metadata-only check of column presence/type is safe, but cannot establish how values were stored.

## Local schema draft

`supabase/migrations/202610150001_meal_portion_snapshots.sql` adds nullable metadata to `meal_items` with constraints, leaving historical rows and nutrient snapshots intact. The existing six nutrient fields continue to mean consumed-amount snapshots; portion/reference fields describe their units/basis and must not cause a second multiplication. Existing `food_id NOT NULL` and its FK remain unchanged, so unmapped foods cannot be saved as fabricated catalog IDs. The app must require a real `maternal_foods.food_id` match.

The migration is intentionally not a complete production migration: it does not change grants/RLS and does not install an RPC. `supabase/policies/phase4_auth_required_draft.sql` is a candidate minimal mother-owned policy set for review after the Auth migration; it is explicitly not safe to apply to the current app and omits doctor/patient sharing. Those changes must follow the Auth migration and a verified staging schema. The exact CSV audit exports referenced in the request were not found locally; only the pasted summary and repository's generated-looking types were available. Confirm actual column names/types/constraints against the six CSV result sets before application.

`supabase/validation/202610150001_meal_portion_snapshots.sql` contains read-only checks for added fields, constraints, row/snapshot counts, RLS and grants. Apply and run only in a restored staging project first.

## Atomic save contract to implement after auth is fixed

Use one database transaction, exposed only to `authenticated` and implemented as `SECURITY INVOKER`. Resolve `users.id` from `users.auth_user_id = auth.uid()` inside the transaction; ignore any client owner ID. Validate an ISO date as a real date and constrain meal type to the app's supported values. Require a non-empty idempotency UUID with a unique owner-scoped constraint. For each item, require a catalog row matching `food_id`, persist the catalog ID/name, and validate the allowed unit, positive finite amount, reference basis and provenance. Store existing six `meal_items` nutrients and `meal_logs` sums as consumed totals, preserving NULL when any contributing item lacks that nutrient. Insert log and items in the same transaction; on any failure roll back; return the meal ID only after commit. Unknown/unmapped foods must remain unsaved with a UI validation error until corrected/removed. Reload by RLS-scoped owner and selected date after server confirmation.

## Remaining gates

1. Supply the six metadata-only audit CSV result sets or re-run `docs/PHASE_4_DATABASE_AUDIT.sql` in the intended staging project.
2. Confirm the Auth migration and account-link/recovery plan; verify linkage counts without exposing password values.
3. In Supabase Dashboard, verify a fresh backup and restore it into staging; also account for Storage files separately.
4. Implement and validate RLS/grants and the atomic transaction in staging, including cross-user denial, duplicate idempotency, rollback, null-nutrient round trips and legacy-reader compatibility.
5. Adapt login/register and all direct user/meal readers/writers, then enable the button only after staging evidence passes.
6. Obtain the explicitly requested production migration approval. No production operation has been attempted.
