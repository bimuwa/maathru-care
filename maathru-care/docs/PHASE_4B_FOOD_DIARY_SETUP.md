# Food Diary staging setup

The Food Diary uses the same Supabase Auth session as the rest of Maathru Care. New meal records are still stored in the isolated `food_diary_meals` and `food_diary_items` tables so the legacy meal schema and history are preserved. The UI enables save only after the authenticated user has a mapped `public.users` profile and the database readiness RPC exists.

## Staging sequence

No database migration was applied here. Start with a restored staging project and verify the schema against `docs/PHASE_4_DATABASE_AUDIT.sql` before applying the files.

1. Apply `supabase/migrations/202610150001_meal_portion_snapshots.sql`.
2. Apply `supabase/migrations/202610150002_food_diary_isolated.sql`.
3. Apply `supabase/migrations/202610150003_auth_and_legacy_rls.sql`.
4. Verify new tables have RLS enabled, only authenticated users can execute the save function, and the authenticated role has no direct meal insert grants.
5. Create or verify a dedicated Auth test account. For existing research profiles, link only after email ownership is verified using the admin-only linking procedure described in `AUTHENTICATION_SECURITY_HANDOFF.md`.
6. Sign in through the app, save one item and a multi-item meal, check an unknown quantity, retry with the same request, select a different date, then reload history after restarting the app.
7. Repeat with a second user and confirm they cannot see or edit the first user's diary rows.
8. Test login, email verification, password recovery, doctor pending approval, and doctor/patient endpoints separately. Do not give doctors database access until their approved relationship table and policies are verified.

The meal RPC is atomic and idempotent. Nutrient values are consumed snapshots and are not multiplied again when displayed. Missing nutrients remain `NULL`. Existing legacy history is retained and is not merged into the isolated diary tables.

## Remaining boundaries

- The app uses AsyncStorage on native for session persistence because the Expo SecureStore package install failed with a package registry `EACCES`. AsyncStorage is not encrypted at rest. Install the SDK 57 compatible SecureStore package before a release with real patient information.
- Browser sessions use localStorage. Apply standard web XSS protections.
- The backend configured by `EXPO_PUBLIC_BACKEND_BASE_URL` is not in this frontend repository. It must validate Supabase JWTs and enforce its own authorization before accepting these access tokens. The AI backend was not modified.
- The workspace has no staging Supabase credentials or live database connection. Local tests are mocks and do not prove SQL validity, RLS behavior, app restart persistence, or an actual save/readback.
- Do not apply any migration to production without a verified backup/restore and explicit project-owner approval.
