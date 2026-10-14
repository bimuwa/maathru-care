# GDM V4 research integration

The mobile V4 form is separate from legacy GDM results. It submits exactly five
fields, rejects `Not sure` without converting it to `No`, and never displays a
result after an unavailable, invalid or failed API response. Fractional pregnancy
counts are rejected. Loading state disables repeat submissions. Retries are
explicit user actions; there is no automatic POST retry.

Set these values in your untracked frontend `.env`, then restart Expo:

```dotenv
EXPO_PUBLIC_GDM_V4_API_URL=https://food-detector-api.onrender.com/research/gdm/v4/predict
EXPO_PUBLIC_GDM_V4_TIMEOUT_MS=180000
EXPO_PUBLIC_GDM_API_URL=https://food-detector-api.onrender.com/predict-diabetes
```

The V4 URL above is the gateway implemented in the backend repository. It will
work only after the approved backend deployment and isolated-service
configuration. No isolated Render URL has been invented or deployed.

Authorized researchers enter the administrator-issued research key in the V4
screen. It remains in screen memory and is sent over HTTPS in `X-Research-Key`.
Do not place it in an `EXPO_PUBLIC_*` variable or source control. The existing
app user-ID token is not a verified authentication credential and is not sent
to this research API. Shared-key access is suitable for controlled study demos;
individual account access/revocation needs a future real authentication flow.

`EXPO_PUBLIC_BACKEND_BASE_URL` belongs to the separate application `/api/v1`
backend (appointments, messages, etc.). Do not point it at the food detector.
Use its actual hosted URL for a release; local defaults are development only.
Existing Supabase environment configuration is preserved.

Run focused HTTP-contract tests with:

```powershell
node --test scripts/test-gdm-v4.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Device UI interaction and the deployed API require manual verification after
deployment. The full-project type check currently reports five errors in
unchanged `home.tsx`, `meal-scan.tsx`, `QuickActionsGrid.tsx`, and
`RiskTrendScreen.tsx`; focused V4 service tests pass.
