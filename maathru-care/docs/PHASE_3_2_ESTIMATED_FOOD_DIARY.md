# Phase 3.2 — Smart estimated food diary

Implemented locally on 2026-10-15. No push, deployment, retraining, production API inference request, Supabase write or schema migration was performed. Existing uncommitted Phase 3/3.1 work was preserved. GDM V4 files and the YOLO checkpoint/backend were not edited.

## A. Detector evidence and limitations

- This checkout contains the Expo frontend but no `food-detector-api/main.py`, backend dependency configuration, YOLO checkpoint, or four-roll example image/prediction. The backend's confidence threshold, NMS settings, actual response for the example, and deployed model identity therefore remain **unverified**. No live inference request was made.
- The frontend calls `EXPO_PUBLIC_FOOD_DETECTOR_API_URL` or `https://food-detector-api.onrender.com/predict`. Its declared response has a `count` and `detections[]`; each detection has `food_id`, `confidence`, and an optional `[x1, y1, x2, y2]` box. The client checks that `count` equals the returned array length. This only establishes a detection count, not a count of individual foods.
- The scanner now retains each food's raw boxes and all detections in the scan, including class conflicts, through nutrition lookup/retry. Previously the frontend's class grouping discarded box evidence.
- The current attachment contains only the request text. Whether the four-roll example produces four boxes, one group box, duplicates, or another result is **unverified**. No actual duplicate rate or count accuracy was measured.
- Rice, dhal and eggs remain available only through manual search unless the deployed model returns those exact IDs; this repository cannot establish the deployed checkpoint's class list.

**Count reliability verdict: NOT VERIFIED.** Bounding boxes and confidence alone cannot prove one box corresponds to one roll, identify missed items, or distinguish all disjoint group boxes. The app offers explicitly experimental, editable suggestions; it never calls these reliable measured counts.

## B. Files changed in this phase

| File | Change |
|---|---|
| `src/services/nutritionCalculator.ts` | Shared reference scaling for estimated and explicitly confirmed portions; provenance types/version and partial estimate summary. Existing confirmation/legacy APIs retained. |
| `src/services/foodQuantitySuggestions.ts` | Raw evidence grouping, duplicate clustering, count eligibility, serving suggestions, user adjustments. |
| `src/types/meal.ts` | Optional evidence/reference loading fields; future snapshot contract `EstimatedMealItemSnapshotV2`. |
| `src/app/(mother)/meal-scan.tsx` | Automatic preview insertion/lookup, inline updates, identity correction/retry, stale lookup protection, existing warning checks retained. Removed selection/Add-to-Plate/mandatory portion-confirmation sequence. Warning copy describes estimates instead of complete daily intake. |
| `src/components/ui/MealPlateCard.tsx` | Compact editable cards, provenance, per-food estimates/reference-only values, partial meal summary. |
| `src/components/ui/InlineQuantityEditor.tsx` | Inline amount entry, piece +/−, matching-unit presets; positive finite validation. |
| `src/components/ui/NutritionMiniBar.tsx` | Single Sinhala disclaimer and expandable explanation. |
| `scripts/test-food-scanner-ui.cjs` | Updated workflow checks and clearly labeled synthetic count/quantity/integration cases. |
| This report | Evidence, rules, limitations and migration design. |

Other already-modified files visible in `git status` belong to earlier work. No commit was created.

## C. User experience

1. Take/select a photo. Existing web/native upload integration is unchanged.
2. Grouped food cards appear on the plate automatically after detection. Their original boxes remain available internally.
3. Names/confidence appear while exact nutrition references load. Supported suggestions and estimated nutrition appear as those lookups finish, without opening a portion modal.
4. Adjust using inline amount entry, piece +/− or cup presets. Gram-only records offer explicit gram entry/presets, with no automatic weight assumption. Edit food opens existing exact-selection search; remove is immediate. Failed lookups keep the food and offer retry.
5. Unknown portions retain clearly labeled reference-only nutrients, excluded from consumed-amount estimates. Unmapped foods stay visible.
6. One scrolling preview-only save status remains disabled. No large sticky controls were added. Existing safe-area/keyboard layout behavior is retained.

Old `QuantityEditModal` and `DetectionResultCard` remain available and regression-tested but are no longer the scanner's required entry flow. Existing GDM access/warning integration remains; threshold warnings also run for automatic estimates, manual entries and successful retries. No `is_contraindicated` pregnancy-safety labels are introduced.

## D. Quantity rules and provenance

| Reference/evidence | Behavior |
|---|---|
| Documented per-piece food, excluding curry classes, with eligible separated boxes | Suggest distinct visible detections as pieces; `ai_count_suggested`. |
| Cup-based food, or a curry with an explicit piece serving | Assume exactly its documented reference serving; `standard_serving_assumed`. Detection count is ignored. |
| Per-100g only | No automatic weight. `quantity_unknown` until the user specifies grams. |
| Missing/ambiguous/invalid basis or unmapped food | No suggested amount, no consumed nutrients. Keep reference values if available. Edit food remains possible. |
| User selects/types an amount | `user_adjusted`; original suggestion retained. `confirmedByUser` remains false. |
| Explicit confirmation through the preserved calculator API | `user_confirmed`; never invoked by automatic suggestions or inline adjustments. |
| Historical saved rows | Existing `legacy-unconfirmed` reader and old multiplier calculation unchanged. Future provenance vocabulary uses `legacy_unconfirmed`. |

Count policy `distinct-boxes-v1-experimental`:

- All same-food boxes must be finite, ordered, nonnegative rectangles, with confidence in **[0.60, 1]**. Confidence is an eligibility heuristic, **not count accuracy**.
- Same-class boxes are merged into connected duplicate clusters when **IoU ≥ 0.65** or **intersection/smaller area ≥ 0.90**. This includes nested boxes and transitive duplicate chains.
- Remaining partial overlap above **0.10 of the smaller area**, or cross-class overlap above **0.50**, makes the count unknown.
- Only **2–20** remaining clusters can suggest a count. A single box/cluster never establishes a reliable individual count; it may contain a group. Missing boxes/low confidence also fall back to unknown.
- Thresholds and the 20-item cap are conservative product heuristics, not empirically calibrated guarantees. Close/occluded objects can be merged or rejected. Multiple separate group boxes can still overcount. The UI and info text expose these limitations.
- Identity correction does not transfer the previous class's count or confidence to the replacement food.

No bounding-box area-to-weight conversion, mask/reference-area scaling, gram/cup/piece conversion, fuzzy nutrition substitution or arbitrary spoon/ladle conversion is used.

## E. Calculation evidence

All nutrient arithmetic remains in `nutritionCalculator.ts`, calculation version **`reference-scaling-v2`**. Estimated and explicitly confirmed pathways share the same validated scaling implementation; the explicit confirmation API still rejects unconfirmed inputs. Scale = chosen amount / documented reference amount in the **same unit**. Nonpositive, unsupported, mismatched or overflowing calculations are rejected.

The existing local nutrition export supplies Vegetable Roll per **1 piece (70g)**:

| Nutrient | Reference piece | Synthetic suggested 4 pieces | User-adjusted 2 pieces |
|---|---:|---:|---:|
| Carbs (g) | 22 | 88 | 44 |
| Sugar (g) | 1.4 | 5.6 | 2.8 |
| Fiber (g) | 1.8 | 7.2 | 3.6 |
| Fat (g) | 9.5 | 38 | 19 |
| Iron (mg) | 0.8 | 3.2 | 1.6 |
| Calcium (mg) | 18 | 72 | 36 |

These count inputs are **synthetic fixtures**, not live model findings. The nutrient basis comes from the existing export, whose clinical accuracy was not independently validated here.

The export's White Rice reference is `1 cup (150g)`; Dhal Curry is `half cup (100g)`. Each suggests the corresponding cup amount as an assumption, never a photo-measured weight. Missing nutrient values remain `null`; actual zeros remain zero. Unknown portions are excluded and their count is shown. Within quantified foods, any missing field makes that nutrient's aggregate unavailable. No calories, protein or folate are fabricated. The summary is always labeled an estimate and never a complete daily intake total.

## F. Validation

Commands:

```text
node --test scripts/test-food-scanner-ui.cjs
node --test tests/nutritionCalculator.test.mjs scripts/test-food-detector.cjs
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Final verification on 2026-10-15:

- `node --test scripts/test-food-scanner-ui.cjs`: **26 passed, 0 failed**.
- `node --test tests/nutritionCalculator.test.mjs scripts/test-food-detector.cjs`: **25 passed, 0 failed**.
- `node --test scripts/test-gdm-legacy.cjs`: **4 passed, 0 failed**.
- `node --test scripts/test-gdm-v4.cjs`: **11 passed, 0 failed**.
- `node node_modules/typescript/bin/tsc --noEmit`: **fails with four TS2345 route-type errors** in `src/app/(mother)/home.tsx`, `src/components/QuickActionsGrid.tsx` (two), and `src/screens/RiskTrendScreen.tsx`. These files are outside the food diary changes; no diagnostics were reported in the edited food diary files.
- `git diff --check`: **passes** (Git prints line-ending normalization warnings for existing CRLF files).

Coverage includes synthetic distinct four rolls, duplicate/nested/transitive clusters, group-box fallback, ambiguous/cross-class overlaps, malformed/missing boxes, low confidence, two classes, dhal not using count, auto suggestions never confirmed, immediate two-piece recalculation, inline validation/presets, exact correction/unmapped cases, unknown reference, null/zero distinction, legacy export compatibility, save guard before DB access, automatic scan → exact lookup → calculator, retained raw evidence, stale scan/search/lookup protection and warning-check integration.

Tests use mocked service boundaries, local CSV exports, semantic React Native Web rendering and a local multipart test server. They make no production queries/writes. Existing React Native Web `pointerEvents` and Node TS module-format warnings are not suppressed.

## G. Remaining limits

- No attached four-roll image, labeled count dataset or current live prediction output. **Live count accuracy unverified**; deployment identity/configuration not asserted.
- No trained bulk-food classes in this checkpoint; manual search still supports them.
- The parser intentionally supports only narrow explicit gram/piece/cup bases. Entries such as `1 large egg`, slices, bottles and unspecified servings remain unsupported until a documented unit strategy is added. `chicken_cutlet` remains unmapped if no exact row exists.
- No food-specific unit conversion or nutrient source revalidation was performed.
- Browser/device geometry, visual appearance, touch keyboard behavior and physical-device end-to-end scanning were not visually verified in this environment. Semantic component/handler tests do not prove device layout.
- Saving remains intentionally unavailable. No doctor report is implemented.

## H. Exact next-phase persistence requirements — design only

Use the TypeScript `EstimatedMealItemSnapshotV2` contract. Do **not** deploy a writer until the actual production schema/constraints, RLS and existing readers have been inspected and a migration tested in an isolated database.

1. Add nullable **versioned** fields to meal items: `schema_version`, `record_kind`, `detected_food_id`, `quantity_amount`, `quantity_unit`, `quantity_provenance`, `initial_suggestion`, `reference_basis`, `reference_nutrients`, `estimated_nutrients`, `nutrition_source`, `calculation_version`, `count_policy_version`, `raw_detection_evidence`, `user_confirmed_at`, `estimated_at`. Retain existing `food_id` and item/session ownership. JSON snapshots must validate shape, numeric ranges and nullable values. Dataset version must be explicitly unknown/null until a real version exists.
2. Preserve `serving_multiplier` and historical nutrient snapshots. Existing rows with no V2 fields remain legacy, displayed as unconfirmed. **Never backfill them as AI-suggested or user-confirmed. Never encode new suggestions solely in the legacy multiplier.**
3. Enforce paired nullable quantity amount/unit, finite positive known amounts, allowed units/provenance, null amounts for `quantity_unknown`, matching documented reference units and a valid calculation version for calculated snapshots. `user_confirmed_at` must only be populated by an explicit confirmation action and must correspond to `user_confirmed`; suggested/adjusted quantities must not imply confirmation. Initial suggestion stores the original value and its origin separately from the latest adjustment.
4. Store reference text, amount/unit and nutrient/source snapshots with the estimate so future edits to `maternal_foods` cannot silently rewrite history. Preserve nullable missing fields. Unknown foods/portions may be recorded without calculated nutrients. Count evidence should carry its policy/model identity and image coordinate space when known; unknown metadata must stay null. Decide retention/privacy limits before storing photos or full raw evidence.
5. Extend meal/session summaries with quantified/unquantified food counts, nutrient-specific missing-value coverage, estimate status and calculation version. Incomplete data must not become zero or an apparently complete daily total. Verify whether current aggregate columns permit nulls before migrating them; use additive V2 summaries if existing readers require numeric legacy columns.
6. Add ownership/FK checks and RLS for all new fields/tables. Save meal plus item snapshots atomically with idempotency, server-side validation, rollback tests, mixed legacy/V2 reader tests and null/provenance round-trip tests. Do not trust client totals or provenance blindly. Confirm migrations and readers in staging before enabling the existing guard.
7. Future doctor reports must present recorded identities, suggested/adjusted/explicitly confirmed quantities, missing portions/nutrients, source/version and **estimated** intake separately. No clinical measurement claim or report implementation is part of this phase.

## I. Production boundary

The UI and `mealService.saveMealSession` remain preview-only. `NEW_PORTION_PERSISTENCE_SUPPORTED` remains **false** and tests verify the guard throws before any database operation. No production Supabase data/schema was changed; no Render/GitHub push/deployment occurred. No model retraining, artifact replacement or GDM V4 change occurred.

Repository-required [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) was read before implementation.
