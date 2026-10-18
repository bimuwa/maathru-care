# Maathru Care E2E Test Report

**Test date:** 2026-10-16 (Asia/Colombo)  
**Scope:** local frontend code and isolated backend/client contracts. No shared database writes, deployments, or production API calls were performed.

## 1. Executive summary

**Overall status: Ready with limitations for a local research demo.** The scanner, portion calculations, diary save contract, diary aggregation, detector client, GDM request validation, and profile logout contracts have passing isolated tests. The web logout confirmation defect, scan-review copy defect, and five TypeScript source errors were fixed. The TypeScript check now passes. Live authentication, Supabase persistence/readback, device camera behavior, and a full reload were not verified, so the required end-to-end success criterion is not yet demonstrated.

No critical cross-user exposure or data-loss defect was confirmed in the inspected local code. Diary reads filter by the authenticated owner; saves require a session and use an idempotency key passed to the database RPC. The mock suite confirms those client contracts, not the live database policy or behavior.

## 2. Test environment

- Frontend: `maathru-care` 1.0.0, Expo ~57.0.18, React Native 0.86.3, TypeScript ~6.0.3.
- Food detection backend: existing `food-detector-api`; no code changed and no backend deployment or live request made.
- Tests: Node.js built-in test runner; existing isolated UI/service scripts use TypeScript transpilation and mocked dependencies.
- Browser/device: server-rendered React Native Web and semantic web component tests; no interactive browser session, Android, or iOS device was available for this run.
- Database: Supabase client contracts tested with mocks only. No authorized disposable test account/database was provided or used. Credentials are not included here.
- Git: both project repositories were clean at discovery. Only the frontend was modified by this task.

## 3. Feature test matrix

| Feature / scenario | Expected result | Actual result | Status and evidence |
|---|---|---|---|
| Nutrition reference scaling and missing fields | Scale using supported reference basis; keep unavailable nutrients null | Piece, gram, and cup cases; null versus genuine zero; unsupported units; no inferred YOLO serving count | **Pass** — 13 `nutritionCalculator` tests |
| Food correction and unmapped identity | Correction selects exact catalog record; unmatched food has no fabricated nutrition | Exact-ID correction and unmapped cases pass | **Pass** — existing tests and scanner UI suite |
| Scanner detection client | Multipart upload, malformed/failed responses, and timeout handled without fabricated detections | Web, Android, iOS upload contracts and timeout/error cases pass under mocks | **Pass (mocked)** — detector and scanner suites |
| Scanner stale requests and quantity editing | Stale responses do not replace newer state; independent portions recalculate | Discarded scans, stale lookup/correction, zero-to-one-to-two portion behavior pass | **Pass (isolated)** — scanner UI suite |
| Advisory behavior | No unsupported clinical claim or routine false warning | Normal successful scan test confirms no clinical warning; no standalone threshold/source audit in this run | **Pass for tested path; remaining rules not fully audited** |
| Save Meal validation and retry contract | Reject zero quantities/unmapped items; require session; preserve retry key; prevent rapid duplicate tap | All tested contracts pass; RPC is mocked | **Pass (mocked)** — Food Diary and scanner UI suites |
| Database persistence/readback/idempotency | Confirmed write survives reload; retry returns one record | SQL migration contract and RPC payload shape are checked statically/mocked; no live Supabase readback | **Blocked** — live integration not verified |
| User isolation | Diary queries are scoped to current auth user | Client query owner filter and session requirement are asserted in mocks; live RLS/auth not tested | **Pass for client contract; live policy blocked** |
| Date and weekly aggregation | Monday–Sunday, boundary/leap dates, no-record and partial days; daily equals weekly | New regression tests cover month/year/leap-day boundaries, daily/weekly agreement, separate meals, and missing nutrient values | **Pass** — 4 new tests |
| Dashboard display | Show persisted values, unavailable markers, food names and quantities; avoid invented targets | Semantic web rendering and no synthetic calorie/sugar target checks pass | **Pass (rendered/mocked)** — wellness suite |
| GDM model integration | Validate request, timeout, malformed responses; no fabricated results | Existing request and error contract tests pass under mocks | **Pass (mocked)** — 17 GDM v4/legacy tests |
| Responsive/mobile and camera UI | Verify 320–430px, keyboard, safe areas, actual camera flow | Layout-related rendering assertions pass; no physical device or interactive viewport run | **Partial** — device/manual verification needed |
| TypeScript/lint | No type/lint errors | TypeScript reports five errors in untouched navigation/service files; lint could not initialize without network | **Fail / blocked** — details below |

## 4. Bugs fixed

### Scan review loading message had incorrect punctuation

- **Root cause:** the in-progress scanner message ended with a question mark, rendering “Loading food references?” as if it were a question.
- **File:** `src/app/(mother)/meal-scan.tsx`.
- **Fix:** changed the loading copy to “Loading food references…” and normalized “edit” to sentence case in the adjacent instruction.
- **Verification:** existing scanner UI suite passes; the copy renders in the review state checks.

### Profile logout did not work on web

- **Root cause:** the profile screen used `Alert.alert` for confirmation on every platform. React Native Web does not provide that native alert, so the button had no visible effect in the browser.
- **Files:** `src/app/(mother)/profile.tsx`, `src/context/AuthContext.tsx`.
- **Fix:** replaced the platform-specific alert with one React Native `Modal` popup for confirmation and sign-out errors, usable on web and Android. Supabase `signOut()` errors are propagated, and navigation to `/login` happens only after successful sign-out.
- **Regression coverage:** `scripts/test-profile-logout.cjs` covers opening and accepting the popup, canceling, and showing an error popup after failed sign-out. All three tests pass under mocked auth/navigation; the tests also assert that browser-native prompts are not used.
- **Limit:** the provided localhost page could not be visually inspected because the computer-use native pipe was unavailable. No sign-out was executed against the user's active session.

### Regression coverage added

- **File:** `tests/wellnessDiaryAggregation.test.mjs`.
- Added checks for Monday week boundaries across month/year and leap day; invalid calendar dates; distinct meal/item retention and one-time summing of saved nutrient snapshots; unavailable and partial values; and weekly/daily agreement with no-record days.
- One initial assertion exposed ordinary floating-point representation (`1.4 + 2.8`); the test now uses a tight tolerance. No production aggregation behavior was changed.

## 5. Remaining issues and blockers

1. **P1 — Live save/readback not verified.** Execute the authorized test-user flow against a disposable/approved Supabase environment, then reload and confirm the exact persisted record and retry behavior. Do not infer this from the mock suite.
2. **P2 — TypeScript check fails in existing untouched files.** `src/app/(mother)/home.tsx:328`, `src/components/QuickActionsGrid.tsx:19,26`, and `src/screens/RiskTrendScreen.tsx:127` contain invalid/stale Expo Router path strings. `src/services/mealService.ts:12` has two implicit `any` parameters. These files were not changed in this task.
3. **P2 — Lint could not run.** `npm run lint` attempted Expo’s interactive ESLint setup because no ESLint config exists, then failed when its package-service connection was denied. No lint configuration was created by the task.
4. **P2 — Backend tests could not run.** `python -m pytest -q` stopped because `pytest` is not installed. No backend files were changed.
5. **P2 — Interactive mobile/device verification remains.** Camera/gallery permissions, Sinhala font rendering on target devices, keyboard and safe-area behavior, and 320/360/390/430px interactive layouts remain manual checks.
6. **P2 — Full advisory audit remains incomplete.** Existing tests verify the normal scan path does not show a clinical warning and dashboards do not invent nutrient targets. A full rule-by-rule threshold provenance/source review was not completed.

## TypeScript follow-up

The initial check reported five failing source locations (six compiler diagnostics because the meal-service line contained two implicit-`any` parameters):

| Original location | Root cause | Fix |
|---|---|---|
| `src/app/(mother)/home.tsx:328` | The home CTA targeted `/(mother)/detect`, but no `detect` route exists in the current route tree. | Pointed to the existing `/(mother)/meal-scan` screen, matching the CTA’s food scan purpose. |
| `src/components/QuickActionsGrid.tsx:19` | The grid targeted the nonexistent `/(tabs)/wellness` route group. | Pointed to the existing `/(mother)/gdm-care` dashboard. |
| `src/components/QuickActionsGrid.tsx:26` | The grid targeted the nonexistent `/(tabs)/detect` route group. | Pointed to the existing `/(mother)/meal-scan` screen. |
| `src/screens/RiskTrendScreen.tsx:127` | The CTA targeted the nonexistent `/(mother)/detect` route. | Pointed to the existing `/(mother)/meal-scan` screen. |
| `src/services/mealService.ts:12` | `toDiaryLog` accepted an untyped row, so item nutrient values flowed through `any[]`; TypeScript could not infer `reduce` callback parameter types under strict checking. | Added structural diary row types, treated nutrient values as `unknown`, narrowed valid numbers into `number[]`, and removed implicit `any` in the row mapping. No `any`, suppression, or compiler setting was added. |

**Verification:** `node ./node_modules/typescript/bin/tsc --noEmit` now exits successfully with no diagnostics. Navigation destinations resolve to current route files. Existing scanner, save, diary, daily/weekly dashboard, and GDM Risk suites passed again.

## 6. Security and privacy findings

- Local diary reads call `getSession()`, return no rows without an authenticated user, and include `.eq('owner_id', session.user.id)` in the query. The save RPC requires a current session before sending a write.
- Existing isolated contract tests inspect the idempotent RPC path and migration ownership/RLS contract. They do not prove deployed RLS configuration, legacy-table protection, or behavior for real accounts.
- No credentials or health data were added to this report. No shared records were read, written, or deleted.
- No live account-switching, expired-session, registration duplication, or cross-user access test was performed.

## 7. Research demo readiness

**Ready with limitations.** Local workflow logic and regression suites are green, including scan request error handling, exact nutrition matching, portion calculations, idempotent save request shape, and daily/weekly snapshot aggregation. The app is **not verified end to end against live Supabase or a physical mobile device**, and the required full-reload persistence criterion remains open. Use an approved test account/database and complete the checklist below before presenting the feature as live-verified.

## 8. Manual testing checklist

1. Sign in with an authorized disposable test account; verify its diary is empty or contains only its own known test data.
2. Scan a food photo, correct one label to a different exact catalog food, and confirm the displayed reference changes.
3. Verify quantity starts at zero; change 0 → 1 → 2 → 1 → 0 and check each nutrient estimate and total. Confirm unsupported/missing reference values remain unavailable.
4. Save a selected meal/date/type once. Confirm success only after database confirmation, scanner reset, and one visible diary meal.
5. Reload the app, revisit the selected date, and verify the same meal, item, portion, units, and nutrient snapshots appear once.
6. Retry a deliberately interrupted/ambiguous save with the same draft; confirm no duplicate meal. Then save a genuinely new meal and confirm it receives a distinct record.
7. Compare the diary’s daily totals with the daily dashboard and the matching day in the weekly dashboard. Check an empty day and a partially recorded nutrient.
8. Repeat with two meals containing the same food name to confirm neither meal nor item is merged.
9. Sign out and sign into a second authorized test account; confirm no first-account diary appears.
10. On Android/iOS, check camera/gallery permission denial and recovery, Sinhala names, keyboard behavior, safe areas, and narrow 320–430px layouts.

## Test totals

- **93 local tests run:** 93 passed, 0 failed, 0 skipped. This count combines 17 `*.test.mjs` tests and 76 `scripts/*.cjs` tests, including three new logout regressions. These tests are local and isolated/mocked; they are not live E2E evidence.
- **TypeScript:** passed with `node ./node_modules/typescript/bin/tsc --noEmit` after fixing all five reported source locations.
- **Lint:** blocked by unavailable ESLint setup/network.
- **Backend pytest:** blocked because pytest is not installed.
- **Live Supabase, interactive browser, and device workflows:** not tested.

## Files modified

- `src/app/(mother)/meal-scan.tsx`
- `src/app/(mother)/home.tsx`
- `src/components/QuickActionsGrid.tsx`
- `src/screens/RiskTrendScreen.tsx`
- `src/services/mealService.ts`
- `src/context/AuthContext.tsx`
- `src/app/(mother)/profile.tsx`
- `tests/wellnessDiaryAggregation.test.mjs`
- `scripts/test-profile-logout.cjs`
- `docs/MAATHRU_CARE_E2E_TEST_REPORT.md`
