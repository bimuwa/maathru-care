# Maathru Care Food Database Admin

This is a local-only React + Vite admin interface and Node API, separate from the Expo app. There is no website login and no publish/deploy workflow. The browser talks only to a localhost API. Add/Edit/Delete are available when the local server is configured with a server-side Supabase service-role key.

## Run the website

1. Install Node.js 20.19+ (or 22.12+).
2. `npm install`.
3. Copy `server/.env.example` to `server/.env`. Set the Supabase URL and anon/publishable key there for reads. Add the Supabase service-role key to this ignored local file to enable writes. The key never goes into Vite or the browser; restart the local API after changing it.
4. `.env.local` already points to `http://127.0.0.1:8787/api`. If you recreate it from `.env.example`, keep the URL on loopback.
5. In one terminal run `npm run admin:server`; in a second run `npm run dev`.
6. Vite uses `http://127.0.0.1:5173` by default. Open it only on this computer.

No Supabase or admin login is shown in the browser. The local API uses the project's anon/publishable key for reads. When `SUPABASE_SERVICE_ROLE_KEY` is present in `server/.env`, it uses that key server-side for admin writes. Keep this app on the local computer and do not publish or expose the API.

## Local API security boundary

The included local API binds to `127.0.0.1`, checks local Host/Origin requests, and supports bounded reads plus create/update/delete for food records when the service-role key is set. Maternal food deletion is blocked while meal items refer to its food ID. Keep this app on this computer; do not bind it to `0.0.0.0` or expose it through a tunnel.

Meal history and writes go through the local API. The API uses a service-role key only when it is present in the ignored `server/.env`; requests remain bound to localhost. Meal item creation requires an existing meal log. Maternal food IDs used by meal history cannot be changed or deleted while references exist.

The API returns exact table counts for the dashboard and bounded list responses for the two tables. Search collects a limited set of candidates per field and ranks that bounded set; the `truncated` flag means there may be more candidates. Missing-reference and data-quality reports require reviewed queries and remain disabled. Meal item writes require an existing meal log; deletion prompts for confirmation, and catalog deletion is blocked while historical meal items refer to its food ID.

## Search

The browser ranks returned candidates by exact food ID, exact normalized name, prefix, word prefix, substring, sample alias, then edit distance. It supports Unicode normalization and Sinhala substring matching. Candidate retrieval and pagination must happen in the local API, with a fixed server-side limit. The current alias list is a small seed that should be reviewed by the research team. No database extensions or indexes are installed.

## Images

The current Settings page supports local preview only; it does not upload files. The `.env.example` includes Cloudinary cloud name and unsigned preset placeholders for later integration. Those values are public. Never place a Cloudinary API secret in Vite variables. Signed uploads require a trusted backend with server-only credentials. The local CSV has `meal_items.image_uri`; it does not show a maternal-food image column. Do not persist `blob:` preview URLs or assume a catalog image column exists.

## Build and checks

- `npm run build`
- `npm test`
- `npm run preview` (local preview only)

The included tests cover search normalization, exact/partial matches, typo tolerance and Sinhala substring matches. They are utility tests; no live database, local API, authorization, write, Cloudinary, or mobile visual test is claimed.
