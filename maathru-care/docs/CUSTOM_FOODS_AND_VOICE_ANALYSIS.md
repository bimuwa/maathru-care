# Custom foods and voice analysis

## Current implementation

The meal scanner now opens **My Foods** and lets a signed-in user create a label from the scanner or from an empty food search. A newly created label is immediately selected into the current plate. Saved labels can be searched, selected, edited, or deleted; their `food_id` remains stable during edits. Labels show **Not doctor verified** and carry no nutrient values. An identity-only custom label can be saved as a diary item with unknown quantity and null nutrient snapshots.

The app relies on the authenticated Supabase session. It never submits `owner_id`; the database default sets it from `auth.uid()`. Reads and writes require the new owner policies. The table is private and does not update `public.maternal_foods`.

The **Analyze by Voice** entry currently explains that voice analysis is not configured and offers manual search. The separate model host checkout is on `master`, while the requested work is restricted to `TharinduNuwantha`; that checkout was not modified. No authenticated speech endpoint, STT call, Gemini call, recording UI, or candidate matching engine is implemented. The UI does not simulate a transcript or analysis.

## Pending database migrations

No migration has been applied. Review on a restored staging copy first.

1. Apply `supabase/migrations/202610190001_user_custom_foods.sql`.
2. Verify Account A can create/read/edit/delete its own labels, Account B cannot access them, and signed-out access is denied. Confirm `food_id`, `owner_id`, and verification status cannot be edited and duplicate names are rejected per account.
3. Apply `supabase/migrations/202610190002_food_diary_custom_food_support.sql`.
4. Verify existing built-in meal saves and idempotency, a custom label with unknown quantity, and rejection of Account A saving Account B's custom food ID.

The second migration preserves the inspected save RPC contract and only extends food ID validation. It still derives the meal owner from `auth.uid()`, retains the empty `search_path`, and allows custom IDs only when the custom record belongs to that caller. The app preserves the meal draft if this migration is missing. These policies and SQL have not been checked against the live shared project.

## Voice backend requirements before implementation can be enabled

The frontend currently has no audio recorder dependency. SDK 57's supported Expo package is `expo-audio` (`~57.0.5`); installation could not be completed in this environment because npm could not access the configured Windows npm path. After installing it through the project package manager, use its actual platform recording formats: the documented high-quality preset records M4A/AAC on iOS and Android, and WebM on web. The service must validate the actual container/codec rather than labeling compressed audio as PCM.

Implement the endpoint in the authorized backend branch or a separately approved backend checkout. It should accept a short multipart audio upload at an authenticated route such as `POST /api/voice-food-analysis`, verify the Supabase access token server-side, derive the user from that verified identity, and never trust a client-supplied owner ID. Keep service credentials and `GEMINI_API_KEY` server-side. Do not log or persist raw audio. Set upload/duration limits, timeouts, and rate limits.

The server pipeline should transcribe Sinhala using Google Speech-to-Text `si-LK`, optionally configure English alternatives only after confirming API support, then use Gemini only to interpret the transcript into food mentions. Retrieve candidates from `maternal_foods` and only the verified user's custom foods. Validate every returned ID against those retrieved records and return matched, ambiguous, or unmatched results for user confirmation. Gemini must not invent IDs, nutrition, GI values, contraindications, or verification state.

Suggested backend-only secret names (do not put these in Expo public variables):

```env
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_STT_LANGUAGE_CODE=si-LK
GEMINI_API_KEY=
GEMINI_MODEL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Do not add these secrets to the frontend `.env`. The frontend may later receive only a public backend base URL; the current app already reads `EXPO_PUBLIC_BACKEND_BASE_URL`.

## Verification

Focused mocked-service and Food Diary regression tests were added in `scripts/test-custom-foods.cjs` and `scripts/test-food-diary.cjs`. They do not connect to Supabase or prove deployed schema, RLS, app restart persistence, or cross-account isolation. See `docs/CUSTOM_FOOD_LABEL_TEST_REPORT.md` for the current authorized test run and live verification blockers. Add native microphone permission, cancellation, empty recording, duration cap, and web secure-context checks before enabling recording.
