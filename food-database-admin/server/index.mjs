import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const PORT = Number(process.env.LOCAL_ADMIN_PORT || 8787);
const HOST = '127.0.0.1';
const allowedOrigins = new Set((process.env.LOCAL_ADMIN_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean));
const enabled = process.env.LOCAL_ADMIN_ENABLED === 'true';
const dbUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const db = dbUrl && anonKey ? createClient(dbUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const writeDb = dbUrl && serviceKey ? createClient(dbUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const MAX_PAGE = 25;
const CANDIDATE_LIMIT = 100;
const TABLES = {
  meal_items: { search: ['food_id', 'item_name', 'meal_log_id'] },
  maternal_foods: { search: ['food_id', 'display_name', 'english_name', 'scientific_name', 'category'] },
};
const WRITE_FIELDS = {
  maternal_foods: ['food_id', 'display_name', 'english_name', 'scientific_name', 'category', 'serving_unit', 'carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg', 'gi_index', 'is_contraindicated'],
  meal_items: ['meal_log_id', 'food_id', 'item_name', 'image_uri', 'serving_multiplier', 'carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg'],
};

function send(res, status, value, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(value));
}

function serviceError(res, origin, reason) {
  return send(res, 503, { error: reason }, origin);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 32_000) throw new Error('Request body too large.');
  }
  return JSON.parse(body || '{}');
}

function cleanSearch(input) {
  return String(input || '').normalize('NFKC').trim().replace(/[^\p{L}\p{N}\s_-]/gu, ' ').replace(/\s+/gu, ' ').slice(0, 80);
}
function norm(v) { return String(v ?? '').normalize('NFKC').toLocaleLowerCase().trim().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/gu, ' '); }
function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
function relevance(row, q) {
  const query = norm(q), id = String(row.food_id ?? '').toLocaleLowerCase();
  const names = [row.display_name, row.english_name, row.item_name].filter(Boolean).map(norm);
  if (id === query) return 1000;
  if (names.includes(query)) return 900;
  if (id.startsWith(query)) return 820;
  if (names.some(n => n.split(' ').some(t => t.startsWith(query)))) return 760;
  if (names.some(n => n.includes(query))) return 680;
  const tokens = [id, ...names].flatMap(n => n.split(' ')).filter(Boolean);
  const distance = Math.min(...tokens.map(t => editDistance(query, t)));
  return distance <= Math.max(1, Math.floor(query.length / 4)) ? 450 - distance * 50 : 0;
}
function fail(error) { return { error: error?.message || 'Database request failed.' }; }

async function dashboard() {
  const [meal, foods] = await Promise.all([
    db.from('meal_items').select('id', { count: 'exact', head: true }),
    db.from('maternal_foods').select('id', { count: 'exact', head: true }),
  ]);
  if (meal.error) throw meal.error;
  if (foods.error) throw foods.error;
  return { mealItems: meal.count ?? 0, maternalFoods: foods.count ?? 0 };
}

async function listRecords({ table, q = '', offset = 0, limit = MAX_PAGE }) {
  const spec = TABLES[table];
  if (!spec) throw new Error('Unsupported table or report.');
  const pageSize = Math.max(1, Math.min(MAX_PAGE, Number(limit) || MAX_PAGE));
  const pageOffset = Math.max(0, Math.min(10_000_000, Number(offset) || 0));
  const term = cleanSearch(q);
  let rows = [], total = 0, truncated = false;
  if (!term) {
    let request = db.from(table).select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(pageOffset, pageOffset + pageSize - 1);
    const result = await request;
    if (result.error) throw result.error;
    rows = result.data || []; total = result.count || 0;
  } else {
    const pattern = `%${term}%`;
    const candidates = await Promise.all(spec.search.map(column => db.from(table).select('*').ilike(column, pattern).order('created_at', { ascending: false }).order('id', { ascending: false }).range(0, CANDIDATE_LIMIT - 1)));
    const byId = new Map();
    candidates.forEach(({ data, error }) => { if (error) throw error; for (const row of data || []) byId.set(String(row.id), row); if ((data || []).length === CANDIDATE_LIMIT) truncated = true; });
    const ranked = [...byId.values()].map((row, i) => ({ row, i, score: relevance(row, term) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i);
    total = ranked.length;
    rows = ranked.slice(pageOffset, pageOffset + pageSize).map(x => x.row);
  }
  if (table === 'meal_items' && rows.length) {
    const ids = [...new Set(rows.map(row => row.food_id).filter(Boolean).map(String))];
    const matches = ids.length ? await db.from('maternal_foods').select('food_id').in('food_id', ids).limit(250) : { data: [], error: null };
    if (matches.error) throw matches.error;
    const counts = new Map();
    for (const match of matches.data || []) counts.set(String(match.food_id), (counts.get(String(match.food_id)) || 0) + 1);
    rows = rows.map(row => {
      const id = row.food_id == null || row.food_id === '' ? null : String(row.food_id);
      const count = id ? counts.get(id) || 0 : 0;
      return { ...row, reference_status: !id ? 'missing' : count === 0 ? 'missing' : count > 1 ? 'ambiguous' : 'linked' };
    });
  }
  return { rows, total, truncated };
}

function sanitizeValues(table, values) {
  const fields = WRITE_FIELDS[table];
  if (!fields || !values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid table or record values.');
  const clean = {};
  for (const [key, value] of Object.entries(values)) {
    if (!fields.includes(key)) throw new Error(`Field is not editable: ${key}`);
    if (value === '' || value === undefined) clean[key] = null;
    else clean[key] = value;
  }
  if (table === 'maternal_foods' && !String(clean.food_id ?? '').trim()) throw new Error('Food ID is required.');
  if (table === 'maternal_foods' && !String(clean.display_name ?? '').trim()) throw new Error('Display name is required.');
  if (table === 'meal_items' && !String(clean.meal_log_id ?? '').trim()) throw new Error('Choose a meal log.');
  for (const [key, value] of Object.entries(clean)) {
    if (['carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg', 'gi_index', 'serving_multiplier'].includes(key) && value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`${key} must be a non-negative number.`);
    if (['food_id', 'display_name', 'english_name', 'scientific_name', 'category', 'serving_unit', 'meal_log_id', 'item_name', 'image_uri'].includes(key) && value !== null) clean[key] = String(value).trim();
    if (key === 'is_contraindicated' && value !== null && typeof value !== 'boolean') throw new Error('Contraindicated must be true or false.');
  }
  return clean;
}

async function saveRecord({ table, id, values, create }) {
  if (!WRITE_FIELDS[table]) throw new Error('Writes are enabled only for maternal foods and meal items.');
  const clean = sanitizeValues(table, values);
  if (table === 'meal_items') {
    const log = await writeDb.from('meal_logs').select('id').eq('id', clean.meal_log_id).maybeSingle();
    if (log.error) throw log.error;
    if (!log.data) throw new Error('That meal log does not exist. Choose an existing meal log.');
    if (clean.food_id) {
      const food = await writeDb.from('maternal_foods').select('id').eq('food_id', clean.food_id).limit(1).maybeSingle();
      if (food.error) throw food.error;
      if (!food.data) throw new Error('That Food ID is not in the maternal foods catalog.');
    }
  }
  if (table === 'maternal_foods' && id && Object.hasOwn(clean, 'food_id')) {
    const current = await writeDb.from(table).select('food_id').eq('id', id).maybeSingle();
    if (current.error) throw current.error;
    if (current.data?.food_id && current.data.food_id !== clean.food_id) {
      const refs = await writeDb.from('meal_items').select('id', { count: 'exact', head: true }).eq('food_id', current.data.food_id);
      if (refs.error) throw refs.error;
      if (refs.count) throw new Error('Food ID is used by meal items. Keep it unchanged to preserve those references.');
    }
  }
  const result = create
    ? await writeDb.from(table).insert(clean).select('*').single()
    : await writeDb.from(table).update(clean).eq('id', id).select('*').single();
  if (result.error) throw result.error;
  return result.data;
}

async function deleteRecord({ table, id }) {
  if (!WRITE_FIELDS[table] || id == null || id === '') throw new Error('Invalid table or record ID.');
  if (table === 'maternal_foods') {
    const current = await writeDb.from(table).select('food_id').eq('id', id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) throw new Error('Record was not found. Refresh the list and try again.');
    if (current.data.food_id) {
      const refs = await writeDb.from('meal_items').select('id', { count: 'exact', head: true }).eq('food_id', current.data.food_id);
      if (refs.error) throw refs.error;
      if (refs.count) throw new Error(`Cannot delete: ${refs.count} meal item(s) refer to this food ID.`);
    }
  }
  const result = await writeDb.from(table).delete().eq('id', id).select('id').maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Record was not found or was not deleted. Refresh the list and try again.');
  return { id: result.data.id };
}

async function listMealLogs() {
  const result = await writeDb.from('meal_logs').select('id,created_at').order('created_at', { ascending: false }).limit(200);
  if (result.error) throw result.error;
  return result.data || [];
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const host = req.headers.host || '';
  if (!['127.0.0.1', 'localhost'].includes(host.split(':')[0].replace(/^\[|\]$/g, ''))) return send(res, 403, { error: 'Local requests only.' }, origin);
  if (req.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin)) return send(res, 403, { error: 'Origin not allowed.' });
    return send(res, 204, {}, origin);
  }
  if (req.url === '/health' && req.method === 'GET') return send(res, 200, { ok: true, host: HOST }, origin);
  if (req.method !== 'POST' || req.url !== '/api') return send(res, 404, { error: 'Route not found.' }, origin);
  if (!origin || !allowedOrigins.has(origin)) return send(res, 403, { error: 'Use the local website origin.' });
  let body;
  try { body = await readBody(req); } catch (error) { return send(res, 400, fail(error), origin); }
  if (body.action === 'status') {
    const ready = enabled && Boolean(db);
    const reason = !enabled ? 'Set LOCAL_ADMIN_ENABLED=true in server/.env to enable this local service.' : !db ? 'Add SUPABASE_URL and SUPABASE_ANON_KEY to server/.env.' : undefined;
    const writeReady = ready && Boolean(writeDb);
    const writeReason = ready && !writeDb ? 'Add SUPABASE_SERVICE_ROLE_KEY to server/.env to enable local writes.' : undefined;
    return send(res, 200, { data: { authorized: ready, writesEnabled: writeReady, reason: reason || writeReason, capabilities: ready ? writeReady ? ['read', 'create', 'update', 'delete'] : ['read'] : [] } }, origin);
  }
  if (!enabled) return send(res, 403, { error: 'Local admin mode is disabled. Review server/.env.example first.' }, origin);
  if (!db) return serviceError(res, origin, 'Add SUPABASE_URL and SUPABASE_ANON_KEY to server/.env.');
  try {
    if (body.action === 'dashboard') return send(res, 200, { data: await dashboard() }, origin);
    if (body.action === 'list' && ['meal_items', 'maternal_foods'].includes(body.table)) return send(res, 200, { data: await listRecords(body) }, origin);
    if (body.action === 'meal_logs') {
      if (!writeDb) throw new Error('Add SUPABASE_SERVICE_ROLE_KEY to server/.env to load meal log choices.');
      return send(res, 200, { data: await listMealLogs() }, origin);
    }
    if (['create', 'update', 'delete'].includes(body.action)) {
      if (!writeDb) throw new Error('Add SUPABASE_SERVICE_ROLE_KEY to server/.env to enable local writes.');
      const data = body.action === 'delete' ? await deleteRecord(body) : await saveRecord({ ...body, create: body.action === 'create' });
      return send(res, 200, { data }, origin);
    }
    if (body.action === 'list' && ['missing_references', 'data_quality'].includes(body.table)) throw new Error('This report needs a reviewed bounded database query before it can be enabled.');
    return send(res, 403, { error: 'This action is not enabled.' }, origin);
  } catch (error) { return send(res, 400, fail(error), origin); }
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(PORT, HOST, () => console.log(`Food admin local API listening on http://${HOST}:${PORT}`));
