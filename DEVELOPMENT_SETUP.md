# Development Setup — Frontend and Chatbot Backend

How to run Maathru Care locally: the Expo app (frontend) and the mood-aware chatbot
backend, **with Docker** (recommended) or **without Docker**.

> **For an AI agent guiding a developer:** walk through the sections in order and confirm each
> **Check** before moving on. Never print, paste or commit secret values (`.env` contents, keys,
> passwords). Refer to variables by name only. `maathru-care/.env` is tracked by team decision;
> do not change or commit it unless the team asks.

---

## 1. What runs where

| Part | Folder | Port | Needed for |
|---|---|---|---|
| Expo app (web, Android, iOS) | `maathru-care/` | 8081 | everything |
| Chatbot API (Node/Express) | `chatbot/backend/` | 3000 | chatbot in `live` mode |
| FER service (face mood, Python) | `chatbot/services/fer/` | 7860 | camera mood |
| Sentiment service (Sinhala text mood, Python) | `chatbot/services/sentiment/` | 8001 (8000 inside Docker) | text mood |
| Fusion service (Python) | `chatbot/services/fusion/` + `chatbot/packages/fusion-core/` | 9000 | combining face + text |
| Postgres | the app's Supabase database (section 6), or a local Postgres 16 | 5432 | chat history, consent, mood records |

Also involved, but not run locally:

- **Supabase:** cloud auth and profiles. The app signs in with Supabase. The chatbot backend
  verifies the same Supabase access token, using `SUPABASE_URL`.
- **Team REST API** (`src/services/api.ts`) and **food-detection API**: maintained by other team
  members. Network errors from them (e.g. a LAN IP like `192.168.x.x`) are not part of this setup.

The app works without the chatbot backend: set `EXPO_PUBLIC_CHATBOT_API_MODE=mock` and the chatbot
uses built-in replies.

---

## 2. Prerequisites

- **Git**.
- **Node.js 22 or newer**: the backend requires `>=22`, and a current LTS works for the app.
- **Docker Desktop** with Compose v2, for the Docker path.
- **Without Docker:**
  - **Python 3.11** (the images use 3.11.15).
  - **PostgreSQL 16**.
  - **curl**.
- **Disk and network:** the first build downloads PyTorch (CPU) and a ~266 MB sentiment model from
  Hugging Face, so allow a few GB of disk and a working internet connection.
- **A Supabase mother account that a doctor has approved.** New mothers land on
  `pending-approval` until then.

---

## 3. Frontend (the Expo app)

```sh
cd maathru-care
npm install
cp .env.example .env        # only if .env does not exist yet; then fill it in
npm run web                 # Expo dev server, opens http://localhost:8081
```

`maathru-care/.env` keys:

| Key | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_CHATBOT_API_MODE` | `live` = call the chatbot backend; `mock` = built-in replies (default) |
| `EXPO_PUBLIC_CHATBOT_API_BASE_URL` | Chatbot backend URL, default `http://localhost:3000` |
| `EXPO_PUBLIC_FER_JPEG_QUALITY` | optional, default `90` |
| `EXPO_PUBLIC_FER_SAMPLE_MS` | optional, ms between camera frames, default `1000` |

**`EXPO_PUBLIC_*` values are baked in when bundling.** After changing them, restart with a clean
cache: `npx expo start --web --clear`.

**Check:** log in as an approved mother, then tap the pink chat button on Home, or open
<http://localhost:8081/chatbot>. A first-time user sees a camera consent popup.

Other commands: `npm start` (dev server only), `npm run android`, `npm run ios`, `npm run lint`.

**Camera mood sensing runs on the web only.** Browsers allow the camera only on `localhost` or HTTPS.

---

## 4. Backend with Docker (recommended)

All commands run from `chatbot/`.

1. **Create the env file.** Docker Compose reads it.
   ```sh
   cd chatbot
   cp .env.example .env
   ```
   Fill in at least:
   - `SUPABASE_URL`: must be the **same** Supabase project as the app's `EXPO_PUBLIC_SUPABASE_URL`.
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and a matching `DATABASE_URL`. The host
     part of `DATABASE_URL` is `postgres`, the Compose service name.
   - **LLM:**
     - `LLM_PROVIDER=mock` gives canned replies with no network call. This is the default.
     - For real replies, set `LLM_PROVIDER=groq` plus `GROQ_API_KEY` and `LLM_MODEL`. The project
       owner decides whether real messages may go to Groq; see the D-6 note in `.env.example`.
   - `CORS_ALLOWED_ORIGINS`: must include the app's origin, e.g. `http://localhost:8081`.
   - **Leave as they are:**
     - Service URLs: `http://fer:7860`, `http://sentiment:8000`, `http://fusion:9000`.
     - The `FUSION_*` placeholder parameters.

2. **Build and start the stack.** The first build takes a while, because of PyTorch and the model
   download.
   ```sh
   docker compose up -d --build
   docker compose ps          # wait until every service is "healthy" (sentiment can take ~2 min)
   ```

3. **Run the database migrations.** First time only, and again after new files appear in
   `backend/migrations/`.
   ```sh
   docker compose exec -T backend node dist/db/migrate.js
   ```

4. **Check:** <http://localhost:3000/health> returns OK.
   - **`/ready`** returns 503 while `DEPLOYMENT_POSTURE=strict`, because the fusion parameters are
     placeholders. This is expected locally; `/health` is the liveness check.

5. **Point the app at it.** In `maathru-care/.env`:
   - `EXPO_PUBLIC_CHATBOT_API_MODE=live`
   - `EXPO_PUBLIC_CHATBOT_API_BASE_URL=http://localhost:3000`

   Then restart Expo with `--clear`.

Useful commands:

```sh
docker compose logs -f backend            # follow backend logs
docker compose restart backend
docker compose up -d --build backend      # rebuild after backend code changes
docker compose down                       # stop (Postgres data is kept in a named volume)
```

**Code changes need a rebuild.** The containers run built images, not your working tree, so
rebuild the affected service after editing its code.

---

## 5. Backend without Docker

Each service runs in its own terminal. In every `.env` value, use `localhost` instead of the
Compose service names.

### 5.1 Postgres

1. Install PostgreSQL 16 and create a user and database.
2. Put the matching values into `chatbot/.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`,
   `POSTGRES_DB`, and `DATABASE_URL` with host **`localhost:5432`**.

**Hybrid shortcut:** run only Postgres in Docker with `docker compose up -d postgres`.

### 5.2 Load the env file into a shell

The Python services read `NODE_ENV` and the fusion keys from the environment.

- **Bash / Git Bash / macOS / Linux:**
  ```sh
  cd chatbot
  set -a; . ./.env; set +a
  ```
- **PowerShell:**
  ```powershell
  cd chatbot
  Get-Content .env | Where-Object { $_ -match '^\s*[A-Z0-9_]+=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2; Set-Item "env:$($k.Trim())" $v.Trim()
  }
  ```

Do this in each terminal that runs the fusion service or the backend.

### 5.3 Python services

Use one virtual environment per service; the pins differ.

- **Bash:** create with `python3.11 -m venv .venv`, activate with `. .venv/bin/activate`.
- **Windows:** create with `py -3.11 -m venv .venv`, activate with `.venv\Scripts\activate`.

**FER** (from `chatbot/services/fer`). The model is already in `services/fer/models/`.

```sh
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 7860
```

**Sentiment** (from `chatbot/services/sentiment`). The weights file is not in git, so download it
once into the checkpoint folder.

```sh
pip install --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple \
  -c b1-constraints.txt -r requirements.txt
curl -fL -o ../../ml/sentiment/outputs/development_v2/experiment_02/best_checkpoint/model.safetensors \
  https://huggingface.co/mykkularathne/maternalink-sinbert-mood3-archive/resolve/main/model.safetensors
uvicorn app:app --host 127.0.0.1 --port 8001
```

- **Startup checks:** the service verifies the checkpoint's SHA-256 on startup, so a broken
  download fails loudly.
- **Port 8001:** used so it doesn't clash with other local apps on 8000.
- **Use the `uvicorn` command, not `python app.py`,** as shown above.

**Fusion** (from `chatbot/services/fusion`, in a shell where the env file is loaded). The fusion
library is imported from `packages/fusion-core`.

```sh
pip install -r requirements.txt
PYTHONPATH=../../packages/fusion-core uvicorn app:app --host 127.0.0.1 --port 9000
# PowerShell: $env:PYTHONPATH="..\..\packages\fusion-core"; uvicorn app:app --host 127.0.0.1 --port 9000
```

Fusion exits on startup if any `FUSION_*` key or `FUSION_PARAM_PROVENANCE` is missing.

**Check:** `/health` responds on ports 7860, 8001 and 9000.

### 5.4 Chatbot API (Node)

The backend does not load `.env` by itself. Node's `--env-file` does it, and **variables already
set in the shell win over the file**. Use that to switch the service URLs to localhost without
editing `.env`.

From `chatbot/backend`, in Bash:

```sh
npm ci
export FER_SERVICE_URL=http://localhost:7860 SENTIMENT_SERVICE_URL=http://localhost:8001 FUSION_SERVICE_URL=http://localhost:9000
# DATABASE_URL must point at localhost too (set it in .env or export it here)
node --env-file=../.env --import tsx src/db/migrate.ts     # migrations, first time / when new ones exist
node --env-file=../.env --import tsx src/main.ts           # start the API on :3000
```

In PowerShell, set the same URLs with `$env:FER_SERVICE_URL="http://localhost:7860"` and so on,
then run the same `node` commands. If you loaded the whole `.env` into the shell (section 5.2),
re-set these URL variables afterwards, because the shell's values win.

**Production-style alternative:** `npm run build`, then `node --env-file=../.env dist/main.js`.

**Check:** <http://localhost:3000/health>. Then point the app at it, as in section 4 step 5.

---

## 6. Store chatbot data in Supabase (the app's database)

The chatbot backend can use the **same Supabase project as the app** instead of a local Postgres.
The tables go into a separate schema, `chatbot`:

- They can't clash with the app's own tables (the app already has `public.users`).
- Supabase's public Data API doesn't expose the `chatbot` schema, so the anon key can't read
  chat data.

1. **Copy the connection string.** In the Supabase dashboard of the app's project, open
   **Connect**, then **Session pooler**.
   - Use the session pooler, not the direct connection: the direct host is IPv6-only, which Docker
     on Windows often can't reach.
   - Don't use the transaction pooler (port 6543): the backend sets the schema once per
     connection.
2. **Fill in `chatbot/.env`.** Never commit it or paste it anywhere.
   - `DATABASE_URL=<session pooler string with the database password>?sslmode=no-verify`.
     For full certificate checking, use `sslmode=verify-full&sslrootcert=<path to Supabase CA cert>`
     instead.
   - `DATABASE_SCHEMA=chatbot`
   - `SUPABASE_URL`: the same project (it already must be).
3. **Create the tables, once.** Migrations create the `chatbot` schema and its tables.
   - With Docker:
     ```sh
     docker compose up -d --build backend
     docker compose exec -T backend node dist/db/migrate.js
     ```
   - Without Docker, use the migrate command from section 5.4.
4. **Check.** In the Supabase Table Editor, switch the schema to `chatbot`. You should see these
   tables:
   - `users`, `conversations`, `messages`, `mood_observations`
   - `camera_consent_events`, `schema_migrations`

   Send a chat message, then check that rows appear.

The local `postgres` container still starts, because it's listed as a dependency in
`docker-compose.yml`, but it no longer holds chatbot data. Old chats in the local database are
**not** copied over.

**What gets stored:**
- Camera frames are analysed in memory and **never stored anywhere**, by project rule. The face
  crop exists only for that one request.
- What is stored: messages, conversations, consent events, and the **derived** mood readings
  (scores), not images.

---

## 7. Verify the full flow

1. **Sign in:** open <http://localhost:8081>, log in as an approved mother and open the chatbot.
2. **Camera:** accept the consent popup, or turn **Camera** on in the side menu.
   - In DevTools → Network, a `POST /api/v1/session/frame` returning **200** should appear about
     once a second.
   - Turning Camera off stops the frames.
3. **Messages:** send a message and you should get a reply.
   - **Text mood works only for Sinhala-script messages**, e.g. `මට අද හරිම මහන්සියි`.
   - English or Singlish messages use the camera only. The reply's `mood_debug.language_detected`
     is then `other` and `modalities_used` is `["face"]`.
4. **Info:** open the side menu, then **Info**. It shows the camera and text readings for the last
   message.
5. **Back navigation:** swiping right from the left edge, or the Android back button, returns to
   Home.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Every chatbot call returns **401** | Backend `SUPABASE_URL` is not the same project as the app's, or you're not signed in |
| **CORS** error in the browser | Add the app origin (e.g. `http://localhost:8081`) to `CORS_ALLOWED_ORIGINS`, then restart the backend |
| Frames return **409** `camera_inactive` / **403** | Camera session not active or no consent. The app resyncs within ~5 s. This happens after a backend restart; reopening the chat also fixes it |
| "Camera couldn't start" / `AbortError: Timeout starting video source` | The webcam is in use by another app or tab. Close it there, or restart the machine |
| No frames while the camera preview is hidden | Expected only when Camera is off. If Camera is on, check the console for `[camera]` warnings |
| Text mood always empty | The message isn't in Sinhala script (by design), or **Text mood** is off in the side menu |
| Sentiment container never turns healthy | First load is slow (up to ~2 min); see `docker compose logs sentiment`. The build fails if the model download or SHA check fails |
| Port 8000 / 5432 / 3000 already in use | Stop the other app, or change the host port on the left of `ports:` in `docker-compose.yml` |
| Expo crashes with **EMFILE: too many open files** (Windows) | `maathru-care/app.json` must keep `"web": { "output": "single" }`; static output server-renders every page. Restart with `npx expo start --web --clear` |
| Changes to `EXPO_PUBLIC_*` have no effect | Restart Expo with `--clear` |
| App on a phone can't reach the backend | `localhost` on the phone is the phone itself. Use the computer's LAN IP in `EXPO_PUBLIC_CHATBOT_API_BASE_URL` and add the app's origin to `CORS_ALLOWED_ORIGINS`. The camera mood feature is web-only |

---

## 9. Checks before committing

```sh
# backend (from chatbot/backend)
npm ci && npm run typecheck && npm run typecheck:test && npm run lint && npm test
# fusion contract tests (from chatbot/)
python -m pytest packages/fusion-core/tests/test_b4_contract.py -v
```

CI for the backend runs from `.github/workflows/chatbot-backend-ci.yml`.

More detail:
- [maathru-care/README.md](maathru-care/README.md)
- [chatbot/README.md](chatbot/README.md)
- [chatbot/backend/README.md](chatbot/backend/README.md)
- `chatbot/docs/`
