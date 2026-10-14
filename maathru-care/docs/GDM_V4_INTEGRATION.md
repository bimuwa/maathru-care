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
EXPO_PUBLIC_GDM_TIMEOUT_MS=90000
```

The V4 URL above is the gateway implemented in the backend repository. It will
work only after the approved backend deployment and isolated-service
configuration. No isolated Render URL has been invented or deployed.

Research screening no longer requires an access key or login token. The form
submits only the five model inputs. The backend feature flag
`ENABLE_GDM_V4_RESEARCH=true` must be set in both services. Validation and the
research-only disclaimer remain enabled.

For Expo web, set `CORS_ORIGINS=http://localhost:8081,http://127.0.0.1:8081`
in the Render Environment panel and redeploy the reviewed backend revision.
The committed `.env.example` does not set environment variables on Render.
Live inspection confirmed the deployed service rejected both preflight requests,
and its V4 feature was disabled with no isolated-service URL configured.
Set `ENABLE_GDM_V4_RESEARCH=true` in both services and `GDM_V4_SERVICE_URL`
to the actual isolated service root URL in the gateway.

The legacy Health Profile request now waits up to 90 seconds for a cold start,
cleans up its timeout on failures, and preserves useful validation/unavailability
messages. Malformed responses cannot produce a guessed probability.

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
