# IT22638168 — Maathru Care Mood-Aware Conversational Support Component

**Author:** Livera S.D — IT22638168 · **Project:** R26-IT-146 · **Institution:** SLIIT

A bilingual (Sinhala/English) support chatbot for the MaternaLink pregnancy-support system.
It infers the user's emotional state from two signals (facial expression and message text),
fuses them transparently, and adapts its conversational tone accordingly. **It is a
supportive tool, never a diagnostic or clinical system** — it must never claim a user has
depression, anxiety, or any clinical condition.

## Where the UI is

The chat UI lives in the mother app: `maathru-care/src/features/chatbot`. It is opened from
the pink chat button on the mother home page. This folder holds the backend stack, the ML
work and the documentation.

## Architecture

```
   Camera frame                       Sinhala/English message
        │                                       │
        ▼                                       ▼
  BlazeFace (TensorFlow.js,             Language detection
  in the browser)                               │
        │  face crop                            ▼
        ▼                                Text mood model
  MobileNetV2 (TFLite)                  → mood + confidence
  → 7 FER emotions                              │
        │                                       │
        └───────────────┬───────────────────────┘
                        ▼
              Transparent late fusion
              Fused(c) = W_face·Face(c) + W_text·Text(c)
                        ▼
          Mood state: calm | neutral | distressed | unknown
                        ▼
        Adaptive Response Policy  +  Deterministic Safety Layer
                        ▼
                      LLM
                        ▼
                    Chatbot response
```

Face detection runs in the browser; FER, sentiment and fusion run as backend services
(see `docker-compose.yml`). Raw camera frames terminate at the FER inference boundary —
they are never stored.

## Folder map

| Path | Contents |
|---|---|
| `backend/` | Node/TypeScript API: chat orchestration, safety layer, LLM, migrations |
| `services/fer/` | Facial-expression recognition service (TFLite MobileNetV2) |
| `services/sentiment/` | Sinhala/English text mood service |
| `services/fusion/` | HTTP wrapper around the fusion engine |
| `packages/fusion-core/` | Late-fusion engine library and tests |
| `tools/huggingface/fer-model-repo/` | FER model publishing scripts (Hugging Face) |
| `tools/huggingface/fer-keras-archive/` | FER Keras checkpoint archive scripts |
| `tools/huggingface/sentiment-archive/` | Sentiment checkpoint archive scripts |
| `ml/` | Model development notebooks and run records (`ml/sentiment/outputs` is used by the sentiment image) |
| `docker/` | Dockerfiles for fer, sentiment and fusion |
| `docs/system/` | Architecture, mood states, safety policy, performance |
| `docs/decisions/` | Formal decision memos |
| `docs/project/` | Requirements, plans, proposal, document register |
| `docs/research/` | Literature review, gaps, existing systems |

## Run

1. Copy `.env.example` to `.env` and fill it in:
   - `SUPABASE_URL` — the maathru-care Supabase project
   - `GROQ_API_KEY` — the LLM provider key
2. Start the stack:
   ```sh
   docker compose up -d --build
   ```
3. First time only, run the database migrations:
   ```sh
   docker compose exec -T backend node dist/db/migrate.js
   ```
4. Health check: <http://localhost:3000/health>

**Sentiment model download.** The sentiment image downloads its checkpoint from the public
Hugging Face repo `mykkularathne/maternalink-sinbert-mood3-archive` at build time and
verifies its SHA-256, so `docker compose build sentiment` needs network access but no token.
If the repo is ever made private again, build with
`docker compose build --build-arg HF_TOKEN=<token> sentiment` (never commit the token).

| Service | Port |
|---|---|
| backend | 3000 |
| fer | 7860 |
| sentiment | 8001 |
| fusion | 9000 |
| postgres | 5432 |

### Connecting maathru-care

Set these in the maathru-care environment:

```sh
EXPO_PUBLIC_CHATBOT_API_MODE=live        # or mock
EXPO_PUBLIC_CHATBOT_API_BASE_URL=http://localhost:3000
```

### Local checks

```sh
cd backend && npm ci && npm run typecheck && npm run typecheck:test && npm run lint
python -m pytest packages/fusion-core/tests/test_b4_contract.py -v   # from chatbot/
```

Backend CI runs from the repo root: `.github/workflows/chatbot-backend-ci.yml`.

## Hard rules

- No human participant data collection before SLIIT IERC ethics approval.
- No raw facial frames stored, logged, or transmitted.
- No invented metrics, thresholds, or weights.
- No behavioural signals in the fusion engine.
- No clinical claims in any user-facing text.
