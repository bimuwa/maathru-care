# Phase 3.1 — Food Scanner stabilization

Local implementation and verification: 15 October 2026.

## Causes and changes

| Issue | Cause in the inspected UI | Change |
| --- | --- | --- |
| Save status covers the plate/nutrition | An absolute bottom action area was outside the ScrollView, with hardcoded iOS padding and separate 120px scanner spacers. | One compact, disabled save-status area now lives in the scroll content. Scanner spacers were reduced. Bottom scroll padding includes the safe-area inset and clearance for the raised navigation icon. |
| Apparent repeated save area | Only one save area was present in the source. | One source instance remains. The referenced screenshots were not present in the attachment, so a stitched-scroll artifact cannot be confirmed. |
| Large empty plate area | A fixed 210px decorative plate was reserved even when food rows existed. | Content-sized empty guidance and food rows replace the decoration. |
| Names/portion actions squeezed | Chips were capped at 200px, names were limited to one line, and the remove control was 18px. | Full-width wrapping food rows, separate portion actions, and 44px minimum action targets. |
| Missing confirmation status | Small quantity badges competed with food names. | Explicit pending/confirmed text and a visible Confirm Portion/Edit portion action for each food. |
| Portion modal overflows a 320px screen | The amount controls, fixed 126px input, modal padding and outer margins required about 334px. There was no keyboard avoidance. | Flexible input, smaller padding, bounded scrolling modal, safe-area padding, native keyboard avoidance and web visual-viewport resizing when the virtual keyboard opens. |
| Oversized/cropped photo preview | A square preview was always allocated regardless of image shape. | Use the processed image aspect ratio, a bounded 140–280px preview and contain mode. |
| Discarded results reappear | Compression/upload results could update state after a discard or newer scan. | Invalidate stale scan results on reset and unmount. |
| Add to Plate can remain busy | Nutrition lookups lacked try/finally and a synchronous repeat-submit lock. | Show an inline lookup error, release loading state, and prevent concurrent adds. |
| Added foods/portion actions can be above the current scroll position | Detection review is below the plate. | Scroll back to the plate when a food is added, without opening or confirming portions. Confirming an existing item does not jump the page. |
| Search results appear for an old query | Debouncing canceled timers but not already-running query results. | Ignore stale responses after query changes/modal close, preserve keyboard taps and show search failures separately from “no foods found.” |
| Database outage looks like missing nutrition | Exact lookup errors were logged but then returned null, indistinguishable from an absent food record. | Report lookup errors to the scanner; an actual absent exact ID still returns null and remains unmapped. |

The parent mother tab bar is in normal layout flow (80px), with a raised scan
icon. No additional absolute footer was introduced, and no other screen or
navigation configuration was changed.

## Preserved behavior

- `nutritionCalculator.ts` is unchanged, including duplicate grouping, correction
  IDs, reference-serving calculations, unknown nutrients and legacy compatibility.
- Its SHA-256 before and after is
  `2810b1eab0c6c5dfa7961e31649d5b38aadc922da041e52f5afe8f1f53729ade`.
- Adding an identity leaves its portion and calculated nutrients null. Opening
  the editor or choosing a suggestion does not confirm it. Confirmation validates
  against the existing calculator and updates the plate immediately.
- Gram, piece and cup examples remain in their own reference units; no new
  conversion or whole-piece rule was introduced. The editor accepts a decimal
  comma as well as a decimal point.
- A missing nutrient remains Unavailable; genuine zero values remain zero.
- Saving stays disabled in the screen. `mealService.saveMealSession` still calls
  the existing persistence assertion before any database access. The persistence
  support flag remains false. No schema, records, migrations, models, backend
  detection logic, GDM V4 code, or production deployment was changed.

## Exact files changed in this phase

1. `src/app/(mother)/meal-scan.tsx`
2. `src/components/ui/MealPlateCard.tsx`
3. `src/components/ui/DetectionResultCard.tsx`
4. `src/components/ui/QuantityEditModal.tsx`
5. `src/components/ui/NutritionMiniBar.tsx`
6. `src/components/ui/MealImagePreview.tsx`
7. `src/services/mealService.ts` — error propagation for the scanner's read-only exact lookup only.
8. `scripts/test-food-scanner-ui.cjs`
9. This report.

Existing Phase 3 working-tree changes were retained. This phase does not commit,
push or deploy them.

## Console error investigation

Reported message: “A listener indicated an asynchronous response by returning
true, but the message channel closed before a response was received.”

**Assessment: likely browser-extension messaging; moderate confidence for this
specific occurrence.** The application's `src` has no `chrome.runtime`,
`browser.runtime`, `onMessage` or `postMessage` messaging integration. The new
portion-editor resize listener only tracks visual viewport height and is cleaned
up when the modal closes.
Chromium's extension messaging tests reproduce the exact error when an async
message listener loses its response channel. This wording alone does not identify
the responsible extension or prove that a food-network request failed.

Sources: [Chrome message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging),
[Chromium messaging tests](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/messaging/messaging_apitest.cc).

To verify on the affected browser:

1. Expand the error stack in DevTools and record its source. A
   `chrome-extension://...` source identifies an extension context. A page URL by
   itself is not conclusive because content scripts can inject code.
2. Repeat with a fresh browser profile or Incognito with extensions disabled
   (check that none are allowed in Incognito). Compare the same scanner actions.
3. Inspect Network separately: `/predict` is the YOLO upload; Supabase reads of
   `maternal_foods` are exact nutrition lookups/correction searches. Record HTTP
   status, CORS or timeout errors independently of extension messages.

No global console suppression or unhandled-rejection swallowing was added.
Actual scanner failures now have scoped handling, contextual logs and visible
error messages. Permission-request promises are handled as well.

## Executed verification

```powershell
node --test tests/nutritionCalculator.test.mjs scripts/test-food-detector.cjs scripts/test-food-scanner-ui.cjs
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Results across the final suite runs: **34 tests passed** (13 existing calculator
tests, 6 upload tests, 15 scanner/UI handler tests). `tsc --noEmit` reports only
the same four route errors recorded before implementation; no new scanner
errors remain. `git diff --check` passes. Expected failure-path test logs are
not failed tests.

Coverage includes semantic React Native Web rendering and real extracted UI
handlers; decorative icons, safe-area metrics and external services are stubbed.
These checks do not measure browser layout geometry or emulate an Android IME.
The upload tests send actual multipart bytes to a local HTTP server. Supabase
failure tests use mocked responses; no production requests or writes are made.

| Requested check | Verification |
| --- | --- |
| Empty plate, long names, multiple foods | Semantic rendering tests |
| Image upload and detection contract | Existing six local upload tests |
| Duplicate detection grouping and exact correction | Calculator and scanner handler tests |
| Add to Plate / no automatic confirmation | Scanner handler tests |
| Portion validation, reference units and immediate nutrition updates | Editor handler, semantic rendering and calculator tests |
| Missing nutrients and legacy compatibility | Calculator tests |
| Correction controls/search, stale queries, lookup failures | Component callback and async handler tests |
| Retake/Discard with late detection response | Actual reset and processing handler test |
| Single save area in scroll flow / persistence guard | AST placement invariant and actual meal-service save test |
| Small Android, mobile web geometry, keyboard-open state, long scroll and physical safe areas | Manual verification still required |

The provided attachment directory contained only the pasted request, no mobile
screenshots. No browser/computer surface was connected; creating a local preview
tab returned “Browser is not available: iab.” Therefore no before/after screenshot,
live browser console stack, device keyboard or visual overlap check is claimed.

TypeScript baseline: four pre-existing route errors in `home.tsx`,
`QuickActionsGrid.tsx` (two locations) and `RiskTrendScreen.tsx`. No new scanner
errors remain in the final check. React Native Web emits a
`props.pointerEvents is deprecated` warning while rendering its library modal
controls; this is separate from the reported messaging-channel error and has
not been suppressed. Node also reports the existing module-type warning for
direct imports of the standalone calculator test module.
