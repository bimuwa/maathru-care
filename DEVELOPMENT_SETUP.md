# Development Setup — Frontend and Chatbot Backend

How to set up and run Maathru Care on a new computer:

- the Expo app (frontend), and
- the mood-aware chatbot backend, **with Docker** (recommended) or **without Docker**.

> **For an AI agent guiding a developer:**
> - Walk through the sections in order and confirm each **Check** before moving on.
> - Both `.env` files are committed to the repo by team decision, for development testing. Never
>   print, paste or log their values (keys, passwords, connection strings); refer to variables by
>   name only.
> - Don't change the `.env` files unless the developer asks.

---

## 0. Quick start (new computer, Docker)

Use this if you only want the app running. Sections 1–11 explain each step.

```sh
git clone https://github.com/bimuwa/maathru-care.git MathruCare
cd MathruCare/chatbot

# 1. Camera mood model: not in git, download once (~9 MB)
curl -fL -o services/fer/models/fer_mobilenetv2_96_float32.tflite \
  https://huggingface.co/mykkularathne/maternalink-fer-mobilenetv2/resolve/main/fer_mobilenetv2_96_float32.tflite

# 2. Backend stack (first build: 10–20 min)
docker compose up -d --build
docker compose ps                  # wait until all five services are "healthy"

# 3. App
cd ../maathru-care
npm install
npm run web                        # opens http://localhost:8081
```

**Check:**
1. <http://localhost:3000/health> returns `"status":"ok"`.
2. Log in as an approved mother, then open the chatbot (the pink chat button on Home).

Database migrations are **not** needed. The chatbot tables already exist in the shared Supabase
database (section 8).

---

## 1. What runs where

| Part | Folder | Port | Needed for |
|---|---|---|---|
| Expo app (web, Android, iOS) | `maathru-care/` | 8081 | everything |
| Chatbot API (Node/Express) | `chatbot/backend/` | 3000 | chatbot in `live` mode |
| FER service (face mood, Python) | `chatbot/services/fer/` | 7860 | camera mood |
| Sentiment service (Sinhala text mood, Python) | `chatbot/services/sentiment/` | 8001 (8000 inside Docker) | text mood |
| Fusion service (Python) | `chatbot/services/fusion/` + `chatbot/packages/fusion-core/` | 9000 | combining face + text |
| Postgres (local container) | Docker image | 5432 | started by Compose; not used while `DATABASE_SCHEMA` points at Supabase |

**Cloud services, not run locally:**
- **Supabase** (one project for everything):
  - Sign-in and the app's own tables.
  - The chatbot's tables, in the `chatbot` schema.
  - The chatbot backend verifies the app's Supabase sign-in token using `SUPABASE_URL`.
- **Groq**: the LLM that writes the chatbot replies (`LLM_PROVIDER=groq`).
- **Team REST API** (`src/services/api.ts`) and **food-detection API**: maintained by other team
  members. Network errors from them (e.g. a LAN IP like `192.168.x.x`) are not part of this
  setup and can be ignored for the chatbot.

---

## 2. Prerequisites

- **Git**.
- **Node.js 22 or newer**: the backend requires `>=22`, and a current LTS works for the app.
- **Docker Desktop** with Compose v2.
  - On Windows, use the WSL 2 backend.
  - Start Docker Desktop before running `docker compose`.
- **curl**: built into Windows 10/11 and Git Bash.
- **Without Docker only:** **Python 3.11** (the images use 3.11.15).
- **Disk and network:** the first build downloads PyTorch (CPU) and a ~266 MB sentiment model from
  Hugging Face, so allow ~6 GB of disk and a working internet connection.
- **A Supabase mother account that a doctor has approved.** New mothers land on
  `pending-approval` until then.
- **A webcam,** for camera mood. It works in the browser only, on `localhost` or HTTPS.

On Windows, these commands work in **Git Bash**. In PowerShell, they work as written, except where
a PowerShell version is given.

---

## 3. Get the code and the model files

```sh
git clone https://github.com/bimuwa/maathru-care.git MathruCare
cd MathruCare
git checkout main          # the default branch; all merged work is here
```

**FER model (required).** `chatbot/services/fer/models/*.tflite` is excluded by
`chatbot/services/fer/.gitignore`, so a fresh clone doesn't have it. Without it, the FER Docker
build fails. Download it once:

```sh
cd chatbot
curl -fL -o services/fer/models/fer_mobilenetv2_96_float32.tflite \
  https://huggingface.co/mykkularathne/maternalink-fer-mobilenetv2/resolve/main/fer_mobilenetv2_96_float32.tflite
```

It must be the exact file. Both the build and the service check its SHA-256, which is
`47b3adcc0ce769afa469ec6dd272e2561263863ab73621a449fcc1340e958c8c`. To check it yourself:
`sha256sum services/fer/models/fer_mobilenetv2_96_float32.tflite`.

**Sentiment model:** nothing to do with Docker. The image downloads it at build time and checks
it. Without Docker, see section 7.3.

---

## 4. Environment files (already in the repo)

Both env files are committed, so a fresh clone runs as-is:

| File | Used by | Notable settings (values not shown) |
|---|---|---|
| `maathru-care/.env` | Expo app | Supabase URL and anon key, `EXPO_PUBLIC_CHATBOT_API_MODE=live`, `EXPO_PUBLIC_CHATBOT_API_BASE_URL=http://localhost:3000` |
| `chatbot/.env` | Docker Compose and the backend | `SUPABASE_URL` (same project as the app), `DATABASE_URL` (Supabase session pooler), `DATABASE_SCHEMA=chatbot`, `LLM_PROVIDER=groq` + `GROQ_API_KEY` + `LLM_MODEL`, service URLs (`http://fer:7860`, `http://sentiment:8000`, `http://fusion:9000`), `FUSION_*` placeholder parameters, local `POSTGRES_*` |

The `.env.example` files next to them list every key with comments.

**`maathru-care/.env` keys:**

| Key | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_CHATBOT_API_MODE` | `live` = call the chatbot backend; `mock` = built-in replies, no backend needed |
| `EXPO_PUBLIC_CHATBOT_API_BASE_URL` | Chatbot backend URL, default `http://localhost:3000` |
| `EXPO_PUBLIC_FER_JPEG_QUALITY` | optional, default `90` |
| `EXPO_PUBLIC_FER_SAMPLE_MS` | optional, ms between camera frames, default `1000` |

**Common changes:**
- **No backend on this machine:** set `EXPO_PUBLIC_CHATBOT_API_MODE=mock`.
- **Backend on another machine:** set `EXPO_PUBLIC_CHATBOT_API_BASE_URL` to that machine's address,
  and add this app's origin to the backend's `CORS_ALLOWED_ORIGINS`.
- **Canned replies without Groq:** set `LLM_PROVIDER=mock` in `chatbot/.env`, then recreate the
  backend container (section 5).
- **Local database instead of Supabase:** see section 8.3.

**`EXPO_PUBLIC_*` values are baked in when bundling.** After changing them, restart Expo with
`npx expo start --web --clear`.

**Backend `.env` changes** only take effect when the container is recreated:
`docker compose up -d backend`.

---

## 5. Backend with Docker (recommended)

All commands run from `chatbot/`. You need the FER model from section 3 first.

1. **Build and start the stack.**
   ```sh
   cd chatbot
   docker compose up -d --build
   ```
   - The first build takes 10–20 minutes (PyTorch and the model downloads). Later starts take
     seconds.
   - The backend waits until `fer`, `sentiment`, `fusion` and `postgres` are healthy. Sentiment
     takes up to ~2 minutes to load its model.

2. **Wait until everything is healthy.**
   ```sh
   docker compose ps
   ```
   All five services (`backend`, `fer`, `sentiment`, `fusion`, `postgres`) should show
   `(healthy)`.

3. **Check:** <http://localhost:3000/health> returns `{"status":"ok","llm":{...}}`.
   - **`/ready`** returns 503 while `DEPLOYMENT_POSTURE` is `strict` (the default), because the
     fusion parameters are placeholders. This is expected locally; `/health` is the liveness check.

4. **Migrations: not needed** with the shared Supabase database. They're already applied.
   - Run them only when you use a new database or Supabase project, or after new files appear in
     `backend/migrations/`:
     ```sh
     docker compose exec -T backend node dist/db/migrate.js
     ```
   - If the backend is not running, use this instead:
     ```sh
     docker compose run --rm --no-deps backend node dist/db/migrate.js
     ```
   - The command is safe to repeat. Already-applied files are skipped.

Useful commands:

```sh
docker compose logs -f backend            # follow backend logs
docker compose restart backend
docker compose up -d --build backend      # rebuild after backend code changes
docker compose up -d backend              # recreate after .env changes
docker compose down                       # stop everything (local Postgres data is kept in a named volume)
```

**Code changes need a rebuild.** The containers run built images, not your working tree, so
rebuild the affected service after editing its code, or after a `git pull`.

---

## 6. Frontend (the Expo app)

```sh
cd maathru-care
npm install
npm run web                 # Expo dev server; opens http://localhost:8081
```

**Check:**
1. Log in as an approved mother.
2. Tap the pink chat button on Home, or open <http://localhost:8081/chatbot>.
3. A first-time user sees the camera consent popup. After that, the choice is remembered for that
   user in that browser.

Other commands: `npm start` (dev server only), `npm run android`, `npm run ios`, `npm run lint`.

**Notes:**
- **Camera mood sensing runs on the web only.** Browsers allow the camera only on `localhost` or
  HTTPS.
- **Keep `maathru-care/app.json` set to `"web": { "output": "single" }`.** The `"static"` setting
  makes the dev server render every page on the server, which crashes Windows with
  `EMFILE: too many open files`.
- **Keep `darkMode: "class"` in `tailwind.config.js`.** NativeWind needs it in single-page mode.

---

## 7. Backend without Docker

Each service runs in its own terminal.

The committed `chatbot/.env` uses Docker service names in the service URLs (`fer`, `sentiment`,
`fusion`). Without Docker, these must point at `localhost` instead; section 7.4 shows how without
editing the file.

The database stays on Supabase, because `DATABASE_URL` is already a cloud address.

### 7.1 Database

There's nothing to do while `chatbot/.env` points at Supabase. For a local Postgres instead, see
section 8.3.

### 7.2 Load the env file into a shell

The fusion service reads `NODE_ENV` and the `FUSION_*` keys from the environment.

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

Do this in each terminal that runs the fusion service.

### 7.3 Python services

Use one virtual environment per service; the pins differ.

- **Bash:** create with `python3.11 -m venv .venv`, activate with `. .venv/bin/activate`.
- **Windows:** create with `py -3.11 -m venv .venv`, activate with `.venv\Scripts\activate`.

**FER** (from `chatbot/services/fer`). You need the model from section 3.

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

### 7.4 Chatbot API (Node)

The backend does not load `.env` by itself. Node's `--env-file` does it, and **variables already
set in the shell win over the file**. Use that to switch the service URLs to localhost without
editing `.env`.

From `chatbot/backend`, in Bash:

```sh
npm ci
export FER_SERVICE_URL=http://localhost:7860 SENTIMENT_SERVICE_URL=http://localhost:8001 FUSION_SERVICE_URL=http://localhost:9000
node --env-file=../.env --import tsx src/main.ts           # start the API on :3000
# only for a new database (section 5 step 4):
# node --env-file=../.env --import tsx src/db/migrate.ts
```

In PowerShell, set the same URLs, then run the same `node` command:

```powershell
$env:FER_SERVICE_URL="http://localhost:7860"; $env:SENTIMENT_SERVICE_URL="http://localhost:8001"; $env:FUSION_SERVICE_URL="http://localhost:9000"
```

If you loaded the whole `.env` into this shell (section 7.2), set these URL variables again
afterwards, because the shell's values win.

**Production-style alternative:** `npm run build`, then `node --env-file=../.env dist/main.js`.

**Check:** <http://localhost:3000/health>.

---

## 8. Database: chatbot data in Supabase

### 8.1 How it's set up

The chatbot backend stores its data in the **same Supabase project as the app**, in a separate
schema called `chatbot`:

- `DATABASE_URL` is the Supabase **session pooler** connection, ending in `?sslmode=no-verify`.
- `DATABASE_SCHEMA=chatbot` makes the backend create and use its tables in that schema.

There are three reasons for the separate schema:
- The tables can't clash with the app's own `public` tables (the app already has `public.users`).
- Supabase's public Data API doesn't expose the `chatbot` schema, so the anon key can't read chat
  data.
- Every developer machine shares the same data, so there's no local database to set up.

The tables are `users`, `conversations`, `messages`, `mood_observations`,
`camera_consent_events` and `schema_migrations`.

**To view the data:** in the Supabase **Table Editor**, switch the schema dropdown from `public` to
`chatbot`.

**What gets stored:**
- Camera frames are analysed in memory and **never stored anywhere**, by project rule. The face
  crop exists only for that one request.
- What is stored: messages, conversations, consent events, and the **derived** mood readings
  (scores), not images.

### 8.2 Pointing at a different Supabase project

1. **Copy the connection string.** In that project's dashboard, open **Connect**, then **Session
   pooler**.
   - Don't use **Direct connection**: its host `db.<ref>.supabase.co` is IPv6-only, which Docker on
     Windows usually can't reach.
   - Don't use the transaction pooler (port 6543): the backend sets the schema once per
     connection.
2. **Set the variables in `chatbot/.env`:**
   - `DATABASE_URL=postgresql://postgres.<ref>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=no-verify`
     - If the password contains special characters, percent-encode them (`@` becomes `%40`).
     - For full certificate checking, use `sslmode=verify-full&sslrootcert=<path to Supabase CA cert>`
       instead of `sslmode=no-verify`.
   - `DATABASE_SCHEMA=chatbot`
   - `SUPABASE_URL=https://<ref>.supabase.co`: the same project.
   - In `maathru-care/.env`, the Supabase URL and anon key must also be from this project.
3. **Create the tables:** `docker compose up -d --build backend`, then run the migration command
   from section 5 step 4.

### 8.3 Using the local Postgres container instead

1. In `chatbot/.env`:
   - Set `DATABASE_URL=postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>`,
     using the same values as the `POSTGRES_*` keys. Without Docker, use `localhost` as the host.
   - Leave `DATABASE_SCHEMA` empty.
2. Run `docker compose up -d backend`, then the migration command from section 5 step 4.

Data in the local database is separate from Supabase. Nothing is copied between them.

---

## 9. Verify the full flow

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
5. **Past chats:** open the side menu. **Recent** lists earlier chats; tap one to open it.
6. **Back navigation:** swiping right from the left edge, or the Android back button, returns to
   Home.
7. **Data:** in Supabase → Table Editor → schema `chatbot`, new rows appear in `messages`.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| FER build fails: `COPY ... fer_mobilenetv2_96_float32.tflite: not found` or a `sha256sum` error | The FER model is missing or incomplete. Download it again (section 3) |
| Sentiment build fails on the `curl` or `sha256sum` step | Network problem while downloading the model. Run `docker compose build sentiment` again |
| Sentiment container never turns healthy | First load is slow (up to ~2 min); see `docker compose logs sentiment` |
| Backend exits right after starting | Run `docker compose logs backend`. A database error usually means `DATABASE_URL` is wrong or the Supabase project is paused (free projects pause when idle; resume it in the dashboard) |
| Backend logs `relation "..." does not exist` | Migrations haven't run on this database. Run the migration command from section 5 step 4 |
| Every chatbot call returns **401** | Backend `SUPABASE_URL` is not the same project as the app's, or you're not signed in |
| **CORS** error in the browser | The app's origin isn't allowed. The default allows `http://localhost:8081` and `:8082`; for anything else, set `CORS_ALLOWED_ORIGINS` and recreate the backend |
| Chatbot replies fail, but `/health` is OK | Groq problem (invalid key, quota, or model removed). Check `docker compose logs backend`, or set `LLM_PROVIDER=mock` |
| Frames return **409** `camera_inactive` / **403** | Camera session not active, or no consent. The app resyncs within ~5 s. This happens after a backend restart; reopening the chat also fixes it |
| "Camera couldn't start" / `AbortError: Timeout starting video source` | The webcam is in use by another app or tab. Close it there, or restart the machine |
| Text mood always empty | The message isn't in Sinhala script (by design), or **Text mood** is off in the side menu |
| Port 3000 / 5432 / 7860 / 8001 / 9000 already in use | Stop the other app, or change the host port (the number left of the colon under `ports:`) in `docker-compose.yml` |
| Expo crashes with **EMFILE: too many open files** (Windows) | `maathru-care/app.json` must keep `"web": { "output": "single" }`. Restart with `npx expo start --web --clear` |
| Changes to `EXPO_PUBLIC_*` have no effect | Restart Expo with `--clear` |
| Login works but the app stays on `/login` or `pending-approval` | The mother account isn't approved by a doctor yet |
| Errors about `192.168.x.x` in the console | The team REST API on someone's LAN. Not part of this setup; the chatbot works without it |
| App on a phone can't reach the backend | `localhost` on the phone is the phone itself. Use the computer's LAN IP in `EXPO_PUBLIC_CHATBOT_API_BASE_URL` and add the app's origin to `CORS_ALLOWED_ORIGINS`. Camera mood is web-only |

---

## 11. Updating to the latest code

```sh
git pull origin main
cd chatbot && docker compose up -d --build     # rebuild changed services
cd ../maathru-care && npm install               # pick up new dependencies
npx expo start --web --clear
```

If the pull added files in `chatbot/backend/migrations/`, run the migration command (section 5
step 4) once. The developers share one Supabase database, so whoever pulls first can run it, and
running it again is safe.

---

## 12. Checks before committing

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
