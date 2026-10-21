# Development doctor preview

`/login/2` is a temporary, in-memory mock doctor login. It uses the normal login screen styling, accepts any email/password, and does not call Supabase Auth. It is compiled as an enabled route only in Expo development builds (`__DEV__`). It uses a synthetic doctor profile and does not impersonate a doctor identity in Supabase.

The dashboard's **Mother Nutrition & Camera Data Review** action reads mother profiles, custom foods, and saved Food Diary meals through a local-only backend route. Camera detections that were never saved to the Food Diary are not available in the database and cannot be shown here. Approve/reject updates the real development database rows and the existing database migration applies rejection status to historical diary snapshots.

To enable the local review API, start the backend from PowerShell with the explicit flag:

```powershell
$env:ENABLE_DOCTOR_MOCK_MODE = 'true'
npm run dev
```

Run the app at `http://localhost:8081/login/2`. The API requires a non-production backend, this flag, a loopback client address, an Expo localhost origin if present, and the `X-Dev-Doctor-Mode: local-preview` request header. When the flag is absent, these routes return 404. Do not expose the backend through a tunnel or use the mock flow against production data.
