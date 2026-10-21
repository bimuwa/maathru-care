# Custom Food Label Test Report

**Date:** 19 October 2026  
**Branch:** `TharinduNuwantha`  
**Scope:** local custom food feature, Food Scanner integration, and Food Diary serialization

## Environment

- App version: Expo app `1.0.0`, Expo SDK `~57.0.18`, React Native `0.86.3`, Supabase JS `^2.112.4`.
- Supabase URL and anon key are configured in the local environment. Their values were not printed or included in this report.
- Read-only requests to the configured Supabase REST API failed with `WebException` for both `user_custom_foods` and `maternal_foods`. The deployed schema, authenticated policies, actual RPC body, and database readiness could not be inspected.
- No authenticated test account was supplied to this test run. No real records were created, edited, or deleted. No migration was applied.
- No physical Android device or authenticated browser session was available.

## Feature verification

| Test | Method | Result | Evidence / limitation |
|---|---|---|---|
| Clean names, Sinhala Unicode, optional fields, persistent ID response | Mocked Supabase service test | PASS | `scripts/test-custom-foods.cjs`; verifies normalized payload and returned stable ID. |
| Empty and overlong names | Mocked service test | PASS | Rejects empty/whitespace and names over 100 characters before database access. |
| Duplicate-name response and missing table | Mocked service test | PASS | Duplicate key maps to a readable conflict; missing table maps to migration-required guidance. |
| Create does not send `owner_id`, `food_id`, or verification state | Mocked service test | PASS | Database defaults own those fields; payload assertions verify they are omitted. |
| Edit preserves stable identity and filters by row ID | Mocked service test | PASS | Protected fields are absent from the update payload. |
| Delete filters by row ID | Mocked service test | PASS | Mocked service request only; RLS isolation is not established. |
| English and Sinhala substring search | Mocked service test | PASS | Tests use a mocked owner-scoped result set. |
| Scanner picker includes both built-in and private custom results | Static regression assertion | PASS | Source combines catalog rows with results from the current authenticated user's `user_custom_foods` query and marks each source. |
| Stale custom search responses | Source review | PASS | Search effect ignores results after query changes or modal close. No live slow-network test was run. |
| Duplicate Save taps | Source review | PASS | A synchronous `savingRef` guard complements the disabled loading button. |
| Custom label selection and current draft retention | Static/source review | PASS | The selection handler adds a `MealItem` to existing state; no live UI flow was available. |
| Doctor-unverified notices | Mocked/static source assertions | PASS | Form, My Foods list, picker results, and meal review carry the warning. |
| Nutrition remains unknown | Mocked diary test and scanner regression suite | PASS | Custom label serializes all nutrient fields as `null`; meal review shows nutrition unavailable. |
| Custom ID and unknown quantity diary payload | Mocked Food Diary service test | PASS | Stable `custom_…` ID, null portion and nutrient snapshots, `quantity_unknown` provenance. |
| Built-in scanner and diary regression coverage | Existing automated tests | PASS | Scanner suite and diary service suite passed; no production calls were made. |
| Local Expo TypeScript check | `node node_modules/typescript/bin/tsc --noEmit --pretty false` | PASS | Exit code 0, no diagnostics. |
| Expo web export | `node node_modules/expo/bin/cli export --platform web` | BLOCKED | Expo loaded `.env` and selected `src/app` as route root, then stopped producing output. The command was terminated after prolonged inactivity; no export success is claimed. |
| Real Supabase table persistence and deployed schema | Read-only REST GET with anon key | BLOCKED | Both requests failed with `WebException`; no writes were attempted. |
| Account A / Account B direct isolation | Requires two authenticated accounts and deployed migration | BLOCKED | No authorized test accounts or reachable database. |
| Save Meal against deployed custom-food RPC | Requires migration 2 applied and authenticated account | BLOCKED | No migration deployed or database reachable. |
| Reload, signout/signin persistence | Browser/app integration | NOT RUN | No authenticated live app session or data was available. |
| Physical Android layout, permission, keyboard, and slow network | Device test | NOT RUN | No device available. |

## Automated tests executed

- `node --test scripts/test-custom-foods.cjs scripts/test-food-diary.cjs` — **19 passed, 0 failed**.
- `node --test scripts/test-food-scanner-ui.cjs` — **37 passed, 0 failed**.
- `node --test scripts/test-wellness-diary.cjs` — **5 passed, 0 failed**.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false` — **passed, no diagnostics**.
- `git diff --check` — **passed**.

An initial run caught a syntax issue in the newly added test harness (`exports` redeclared in CommonJS); the harness was corrected and the focused tests then passed. No application regression test remained failing.

## Database verification

- **Actual deployed schema/RLS/RPC:** not verified; the REST API could not be reached.
- **Local schema:** migration `202610190001_user_custom_foods.sql` defines an owner-scoped table, `auth.uid()` ownership default, RLS policies for each operation, immutable owner/food ID/verification fields, normalized per-owner duplicate-name uniqueness, and a fixed `unverified` status.
- **Local diary RPC change:** migration `202610190002_food_diary_custom_food_support.sql` retains the current local migration's idempotency and `auth.uid()` owner contract and allows custom IDs only when their row belongs to that owner. It keeps `SECURITY DEFINER` with an empty `search_path` and the prior authenticated-only execute grant.
- **Deployment:** both migrations remain pending. Apply the custom-food table migration first, verify RLS with two authenticated accounts, then apply the RPC extension and verify built-in/custom saves and cross-account rejection in staging.
- **Historical rows:** the inspected local `food_diary_items` schema stores `food_id` and `item_name` snapshots without a foreign key to the catalog. Deleting a custom label therefore does not cascade-delete diary rows in that local design. Confirm the live schema before deployment.

## Bugs found and corrected

1. **Custom labels did not appear in the scanner's normal search results.** The first implementation exposed My Foods through a separate modal. The search now queries the built-in catalog and the signed-in user's custom labels together, labels each result source, reports custom-query failures without hiding built-in results, and ignores stale responses.
2. **Rapid repeated create taps could race React's async loading state.** A synchronous ref guard now blocks duplicate in-flight submissions; the database's normalized owner/name unique index remains a second safeguard.
3. **Custom labels could not be saved as identity-only diary entries.** The service now includes unportioned custom labels with `quantity_unknown` and null nutrient snapshots. The SQL RPC migration must be deployed before that path works against Supabase.
4. **New test harness syntax and an outdated scanner assertion.** Both were updated; the resulting focused and scanner test suites pass.

## Security findings

- Frontend create/update payloads do not include owner, stable ID, or verification status.
- Local SQL uses RLS and column-level grants. Owner filters are enforced in policies; update triggers reject changes to protected identity fields.
- The diary RPC migration checks the custom food against `auth.uid()` and does not accept an owner parameter.
- These are source-level findings only. Live RLS, grants, triggers, and deployed function privileges have not been verified.
- The local migration provides practical collision protection using a database-generated UUID, a `custom_` prefix, a per-table unique constraint, and a built-in catalog collision check. Cross-table global uniqueness still depends on UUID collision improbability and the insert-time catalog check; there is no shared unique constraint spanning both catalog tables.

## Final status

- **Local mocked/service behavior:** tested and passing.
- **Local scanner and diary regressions:** tested and passing.
- **Local TypeScript check:** passing.
- **Real Supabase CRUD, schema, and RLS:** blocked by unavailable network access and no authenticated test accounts.
- **Custom food Save Meal in Supabase:** implemented but pending both reviewed migrations; not verified against deployed RPC.
- **Browser export:** blocked after Expo initialization produced no further output.
- **Android end-to-end and restart persistence:** not run.

## Manual steps required

1. Apply the two migrations to a restored staging project in the order above; do not apply the unrelated `202610150003_auth_and_legacy_rls.sql` migration as part of this feature.
2. Use two disposable authenticated staging accounts to verify custom-food CRUD, owner isolation, protected verification state, stable ID across reload/edit, built-in/custom diary saves, idempotency, and rejection of the other account's ID.
3. Re-run Save Meal history reload after migration deployment and verify that earlier meal snapshots remain intact when a label is deleted.
4. Complete Expo web export and Android device checks in an environment with working network/build access before release.

No commit or push was created. No shared database was modified.
