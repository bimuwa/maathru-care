// Isolated Food Diary persistence contract tests. No Supabase network or project writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rpcCalls = [];
let session = { user: { id: 'auth-user-a', email: 'diary@example.test' } };
let rpcResult = { data: 'saved-meal-id', error: null };
let historyResult = { data: [], error: null };
let diaryStorage;
const selects = [];
const query = {
  select(columns) { selects.push(columns); return this; },
  eq(column, value) { this.filters ??= []; this.filters.push([column, value]); return this; },
  gte(column, value) { this.filters ??= []; this.filters.push([`gte:${column}`, value]); return this; },
  lte(column, value) { this.filters ??= []; this.filters.push([`lte:${column}`, value]); return this; },
  range(from, to) { this.ranges ??= []; this.ranges.push([from, to]); return this; },
  order() { return this; },
  then(resolve, reject) { return Promise.resolve(historyResult).then(resolve, reject); },
};
const fakeClient = {
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    signInWithPassword: async () => ({ data: { session }, error: null }),
    signUp: async () => ({ data: { session }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  rpc: async (name, args) => { rpcCalls.push([name, args]); return rpcResult; },
  from: () => query,
};
const cache = new Map();
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true };
function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions }).outputText;
  vm.runInNewContext(code, { exports, console, globalThis, process, window: undefined, require(name) {
    if (name === 'react-native-url-polyfill/auto') return {};
    if (name === '@supabase/supabase-js') return { createClient: (_url, _key, options) => { diaryStorage = options.auth.storage; return fakeClient; } };
    if (name === '@react-native-async-storage/async-storage') return { default: {} };
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}${fs.existsSync(path.join(root, `src/${name.slice(2)}.tsx`)) ? '.tsx' : '.ts'}`);
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name);
      return load(path.relative(root, resolved + (fs.existsSync(`${resolved}.tsx`) ? '.tsx' : '.ts')));
    }
    return require(name);
  } }, { filename });
  return exports;
}

const { foodDiaryService } = load('src/services/foodDiaryService.ts');
const calculator = load('src/services/nutritionCalculator.ts');
const food = calculator.mapFoodNutritionRecord({ food_id: 'vegetable_roll', display_name: 'Vegetable Roll', serving_unit: '1 piece (70g)',
  carbs_g: 22, sugar_g: 1.4, fiber_g: 1.8, fat_g: 9.5, iron_mg: 0.8, calcium_mg: 18 });
const roll = (amount) => {
  const estimated = calculator.calculateEstimatedPortion(food, { amount, unit: 'piece' });
  return { id: `roll-${amount}`, foodId: food.foodId, name: food.displayName, confidence: 0.9, imageUri: undefined,
    nutritionRecord: food, portion: estimated.portion, calculatedNutrients: estimated.nutrients,
    quantity: { provenance: 'user_adjusted', initialSuggestion: null, calculationVersion: 'reference-scaling-v2' }, timestamp: 1 };
};

test('one and two Vegetable Rolls preserve consumed totals and reference basis without double multiplication', async () => {
  rpcCalls.length = 0;
  await foodDiaryService.saveMeal('key-1', '2026-10-15', 'Breakfast', [roll(1)]);
  const one = rpcCalls.at(-1)[1].p_items[0];
  assert.equal(one.portion_amount, 1);
  assert.equal(one.reference_amount, 1);
  assert.equal(one.carbs_g, 22);
  await foodDiaryService.saveMeal('key-2', '2026-10-15', 'Lunch', [roll(2)]);
  const two = rpcCalls.at(-1)[1].p_items[0];
  assert.equal(two.portion_amount, 2);
  assert.equal(two.portion_unit, 'piece');
  assert.equal(two.portion_provenance, 'user_adjusted');
  assert.equal(two.carbs_g, 44);
});

test('web server rendering does not access window while restoring the diary session', async () => {
  assert.equal(await diaryStorage.getItem('maathru_food_diary_auth'), null);
});

test('cup-based foods preserve cup units and missing nutrients as null', async () => {
  const rice = calculator.mapFoodNutritionRecord({ food_id: 'white_rice', display_name: 'White Rice', serving_unit: '1 cup',
    carbs_g: 40, sugar_g: 0, fiber_g: 2, fat_g: 1, iron_mg: 1, calcium_mg: null });
  const item = { ...roll(1), foodId: rice.foodId, name: rice.displayName, nutritionRecord: rice,
    portion: calculator.calculateEstimatedPortion(rice, { amount: 0.5, unit: 'cup' }).portion,
    calculatedNutrients: calculator.calculateEstimatedPortion(rice, { amount: 0.5, unit: 'cup' }).nutrients };
  await foodDiaryService.saveMeal('key-cup', '2026-10-15', 'Evening Snack', [item]);
  const saved = rpcCalls.at(-1)[1].p_items[0];
  assert.equal(saved.portion_unit, 'cup');
  assert.equal(saved.reference_unit, 'cup');
  assert.equal(saved.calcium_mg, null);
  assert.equal(saved.sugar_g, 0);
});

test('unselected foods are excluded from the saved meal', async () => {
  const unknown = { ...roll(1), id: 'unknown-portion', portion: null, calculatedNutrients: null,
    quantity: { provenance: 'quantity_unknown', initialSuggestion: null, calculationVersion: 'reference-scaling-v2' } };
  const zero = { ...roll(1), id: 'zero-portion', portion: { amount: 0, unit: 'piece', confirmedByUser: false }, calculatedNutrients: null };
  await foodDiaryService.saveMeal('key-multi', '2026-10-15', 'Dinner', [roll(1), unknown, zero]);
  const items = rpcCalls.at(-1)[1].p_items;
  assert.equal(items.length, 1);
  assert.equal(items[0].food_id, 'vegetable_roll');
  const before = rpcCalls.length;
  await assert.rejects(foodDiaryService.saveMeal('key-zero', '2026-10-15', 'Dinner', [zero, unknown]), /Tap \+/);
  assert.equal(rpcCalls.length, before);
});

test('unmapped food is rejected before an RPC and no synthetic ID is invented', async () => {
  const before = rpcCalls.length;
  await assert.rejects(foodDiaryService.saveMeal('key-unmapped', '2026-10-15', 'Lunch', [{ ...roll(1), nutritionRecord: null }]), /no exact food catalog match/);
  assert.equal(rpcCalls.length, before);
});

test('missing Auth session prevents writes; request key is passed for database idempotency', async () => {
  const prior = session;
  session = null;
  const before = rpcCalls.length;
  await assert.rejects(foodDiaryService.saveMeal('key-anon', '2026-10-15', 'Lunch', [roll(1)]), /Sign in/);
  assert.equal(rpcCalls.length, before);
  session = prior;
  await foodDiaryService.saveMeal('stable-request-key', '2026-10-15', 'Morning Snack', [roll(1)]);
  assert.equal(rpcCalls.at(-1)[1].p_idempotency_key, 'stable-request-key');
});

test('save errors propagate; history reload filters by selected date', async () => {
  const prior = rpcResult;
  rpcResult = { data: null, error: { message: 'network down' } };
  await assert.rejects(foodDiaryService.saveMeal('key-error', '2026-10-15', 'Lunch', [roll(1)]), /network down/);
  rpcResult = prior;
  historyResult = { data: [{ id: 'saved-meal-id', logged_date: '2026-10-15', meal_type: 'Lunch', created_at: 'now', food_diary_items: [] }], error: null };
  const meals = await foodDiaryService.getMealsForDate('2026-10-15');
  assert.equal(meals[0].logged_date, '2026-10-15');
  assert.ok(query.filters.some(([field, value]) => field === 'gte:logged_date' && value === '2026-10-15'));
  assert.ok(query.filters.some(([field, value]) => field === 'lte:logged_date' && value === '2026-10-15'));
  assert.ok(query.filters.some(([field, value]) => field === 'owner_id' && value === session.user.id));
});

test('weekly diary query uses the exact date range and verified Auth owner', async () => {
  historyResult = { data: [{ id: 'weekly-meal', logged_date: '2026-10-12', meal_type: 'Lunch', created_at: '2026-10-12T10:00:00Z', food_diary_items: [] }], error: null };
  const meals = await foodDiaryService.getMealsForRange('2026-10-12', '2026-10-18');
  assert.equal(meals.length, 1);
  assert.ok(query.filters.some(([field, value]) => field === 'gte:logged_date' && value === '2026-10-12'));
  assert.ok(query.filters.some(([field, value]) => field === 'lte:logged_date' && value === '2026-10-18'));
  assert.ok(query.filters.some(([field, value]) => field === 'owner_id' && value === session.user.id));
  assert.deepEqual(query.ranges.at(-1), [0, 499]);
});

test('migration defines isolated owner RLS, authenticated RPC, atomic item insert and idempotency', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610150002_food_diary_isolated.sql'), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /unique \(owner_id, idempotency_key\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /v_owner uuid := auth\.uid\(\)/i);
  assert.match(sql, /grant select on public\.food_diary_meals, public\.food_diary_items to authenticated/i);
  assert.doesNotMatch(sql, /grant select, insert on public\.food_diary_meals/i);
  assert.match(sql, /on conflict \(owner_id, idempotency_key\) do nothing/i);
  assert.match(sql, /revoke all on function .* from public, anon/i);
  assert.match(sql, /for v_item in select value from jsonb_array_elements/i);
  assert.match(sql, /portion_provenance <> 'quantity_unknown'.*portion_amount is null/is);
});
