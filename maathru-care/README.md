# Maathru Care — Mobile App

Maathru Care is a maternal-care app built with Expo (React Native) for two roles:

- **Mothers** — track pregnancy health, nutrition and wellbeing.
- **Doctors** — follow their patients, review alerts and chat with mothers.

It runs on Android, iOS and the web from one codebase.

## Features

**Mother** (`src/app/(mother)`)

- **Home** — estimated due date, current risk level, quick actions, assigned doctor and an SOS alert to the doctor.
- **Meal Scan** — photograph a meal; a food-detection API identifies the items and the meal is logged with its nutrients.
- **GDM Care** — diet and exercise guidance for gestational diabetes.
- **Wellness** — daily symptom log.
- **Vitals, Medications, AI risk assessment and risk trends** — opened from the home quick actions.
- **Profile**, plus a chat with the assigned doctor.
- **Support chatbot** — a mood-aware Sinhala/English chatbot (see [Chatbot](#chatbot)).

New mother accounts wait for doctor approval (`pending-approval` screen).

**Doctor** (`src/app/(doctor)`)

- **Dashboard**, **Patients** (with patient detail), **Alerts** and **Chat**.

## Tech stack

| Area | Library | Version |
|---|---|---|
| Framework | Expo SDK | ~57.0.18 |
| UI runtime | React Native / React | 0.86.3 / 19.2.3 |
| Routing | expo-router | ~57.0.17 |
| Styling | NativeWind (Tailwind CSS) | ^4.2.6 (Tailwind ^3.4.19) |
| Auth and data | @supabase/supabase-js | ^2.112.4 |
| State | Zustand | ^5.0.15 |
| Face detection (chatbot, web) | @tensorflow/tfjs + blazeface | ^4.22.0 / ^0.1.0 |
| Language | TypeScript | ~6.0.3 |

## Getting started

No Node version is pinned; use a current LTS release.

```sh
npm install
cp .env.example .env      # then fill in the values
npm run web               # or: npm start (Expo dev server), npm run android, npm run ios
```

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | yes | — | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | yes | — | Supabase anon (public) key |
| `EXPO_PUBLIC_CHATBOT_API_MODE` | no | `mock` | `live` calls the chatbot backend; `mock` uses built-in replies |
| `EXPO_PUBLIC_CHATBOT_API_BASE_URL` | no | `http://localhost:3000` | Chatbot backend URL |
| `EXPO_PUBLIC_FER_JPEG_QUALITY` | no | `90` | JPEG quality of camera frames sent for mood sensing |
| `EXPO_PUBLIC_FER_SAMPLE_MS` | no | `3000` | Interval between camera frames, in ms |

The chatbot defaults come from `src/features/chatbot/config.ts`.

## Authentication

Sign-up and login use Supabase Auth with email and password. Each account has a profile row in
`public.users` linked to the auth user by `auth_user_id`. The schema change is in
`supabase/migrations/` — run it once in the Supabase SQL Editor.

## Backends

- **Supabase** — authentication, user profiles and meal logs.
- **Team REST API** — risk prediction, symptoms, vitals, alerts, prescriptions, doctor and chat
  endpoints. Set its base URL in `src/services/api.ts`.
- **Food-detection API** — used by Meal Scan; its URL is set in `src/services/api/foodDetector.ts`.
- **Mood-aware chatbot backend** — lives in [`../chatbot`](../chatbot/README.md). Mock mode works
  without it.

## Project structure

```
src/
├── app/                 expo-router routes
│   ├── (mother)/        mother tabs
│   ├── (doctor)/        doctor tabs
│   └── chatbot.tsx      chatbot route
├── components/          shared UI components (ui/ for meal-scan widgets)
├── constants/           theme, nutrition targets, user config
├── context/             AuthContext (Supabase session and profile)
├── features/chatbot/    chatbot screen, API client, mock API, camera vision
├── hooks/               colour-scheme and theme hooks
├── lib/                 Supabase client
├── screens/             larger screens used by the routes
├── services/            REST API, meal, GDM and food-detection services
└── types/               database and domain types
supabase/
└── migrations/          SQL migrations
```

## Chatbot

The pink chat button on the mother home page opens `/chatbot`. On open, a privacy-consent popup
asks whether to enable camera mood sensing. The camera is used only while the chat screen is open,
and only on the web. With `EXPO_PUBLIC_CHATBOT_API_MODE=live`, messages and camera frames go to the
chatbot backend; see [`../chatbot/README.md`](../chatbot/README.md) to run it.

## Scripts

| Command | Action |
|---|---|
| `npm start` | Expo dev server |
| `npm run web` | Run in the browser |
| `npm run android` / `npm run ios` | Run on a device or emulator |
| `npm run lint` | Expo lint |
