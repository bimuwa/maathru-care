const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
let rows = [];
let error = null;
let calls;
const nutritionApi = { async request(path) { calls = path; if (error) throw error; return rows; } };
const source = fs.readFileSync(path.join(root, 'src/services/foodSearch.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
} }).outputText;
const exported = {};
vm.runInNewContext(code, { exports: exported, URLSearchParams, require(name) {
  if (name === '@/services/nutritionApi') return { nutritionApi };
  return require(name);
} });
const { foodSearchService, rankMaternalFoodResults, buildMaternalFoodSearchFilter } = exported;
const food = (food_id, display_name, extras = {}) => ({ food_id, display_name, ...extras });

test('search calls the backend with normalized query and returns ranked results', async () => {
  rows = [food('x1', 'Brown rice pudding'), food('rice_red', 'Red rice'), food('zz', 'Rice')];
  error = null;
  const result = await foodSearchService.searchMaternalFoods('rice');
  assert.match(calls, /^\/foods\/search\?/);
  assert.match(calls, /q=rice/);
  assert.match(calls, /limit=20/);
  assert.deepEqual(Array.from(result, (item) => item.food_id), ['x1', 'rice_red', 'zz']);
});

test('single character search is accepted and network errors propagate', async () => {
  rows = [food('a', 'Apple')];
  error = null;
  assert.deepEqual(Array.from(await foodSearchService.searchMaternalFoods('a'), (item) => item.food_id), ['a']);
  assert.match(calls, /q=a/);
  error = new Error('offline');
  await assert.rejects(foodSearchService.searchMaternalFoods('a'), /offline/);
  error = null;
});

test('ranking prioritizes exact and prefix matches across catalog fields, deduplicates, and caps output', () => {
  const matches = [
    food('other', 'Fresh apple', { english_name: 'Malus domestica' }),
    food('apple', 'Apples'),
    food('last', 'Apple', { english_name: 'Apple' }),
    food('apple', 'Duplicate Apple'),
    food('near', 'Pineapple'),
  ];
  assert.deepEqual(Array.from(rankMaternalFoodResults(matches, 'apple'), (item) => item.food_id), ['apple', 'last', 'other', 'near']);
  assert.equal(rankMaternalFoodResults(matches, 'apple', 2).length, 2);
  assert.equal(rankMaternalFoodResults(matches, ' ').length, 0);
});

test('filter helper covers all catalog identity fields and escapes delimiters', () => {
  const filter = buildMaternalFoodSearchFilter('  Red_Rice  ');
  assert.match(filter, /display_name\.ilike/);
  assert.match(filter, /english_name\.ilike/);
  assert.match(filter, /scientific_name\.ilike/);
  assert.match(filter, /food_id\.ilike/);
  assert.match(filter, /%red\\_rice%/);
});
