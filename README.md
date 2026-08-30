# CTG Mobile (Project 4)

Expo React Native app (SDK 54) for patients and doctors — connects to Project 3 Express API.

## Setup

1. Copy `.env.example` to `.env`
2. Set Supabase URL/anon key (same project as backend)
3. Set `EXPO_PUBLIC_API_URL` to backend URL (e.g. `http://localhost:3000` or your LAN IP for device testing)
4. Install and run:

```powershell
cd ctg-mobile
npm install
npx expo start
```

## App Structure

- `(auth)/` — Login, register, forgot password
- `(patient)/` — Dashboard, CTG upload/manual/result/history, doctors, reminders
- `(doctor)/` — Dashboard, patients, shared CTG review, feedback

## Flows

**Patient:** Register → Upload CTG or manual entry → AI analysis → Share with connected doctor → View feedback

**Doctor:** Accept connection requests → View shared CTGs only → Submit professional feedback

## API Layer

All network calls go through `src/api/` — screens never use raw fetch.

## Research Disclaimer

The app displays **AI-assisted CTG analysis** results. These are for research/informational support and do not replace clinical assessment.

## Local Cache

Recent CTG reports are cached in AsyncStorage for offline viewing. Server (PostgreSQL via Express) remains the source of truth.
