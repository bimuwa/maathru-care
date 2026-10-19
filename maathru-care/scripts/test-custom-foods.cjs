const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const requests = [];
let response = null;
let failure = null;
const nutritionApi = { async request(route, options = {}) {
  requests.push({ route, options });
  if (failure) throw failure;
  return response;
} };
const filename = path.join(root, 'src/services/customFoodService.ts');
const source = fs.readFileSync(filename, 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
} }).outputText;
const transpiledExports = {};
vm.runInNewContext(code, { exports: transpiledExports, URLSearchParams, require(name) {
  if (name === '@/services/nutritionApi') return { nutritionApi };
  if (name === '@/services/nutrientCatalog') {
    const nutrientSource = fs.readFileSync(path.join(root, 'src/services/nutrientCatalog.ts'), 'utf8');
    const nutrientCode = ts.transpileModule(nutrientSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const nutrientExports = {};
    vm.runInNewContext(nutrientCode, { exports: nutrientExports }, { filename: 'nutrientCatalog.ts' });
    return nutrientExports;
  }
  if (name === '@/types/customFood') return {};
  return require(name);
} }, { filename });
const { customFoodService } = transpiledExports;
const foodRecord = {
  id: 'row-1', food_id: 'custom_123e4567-e89b-12d3-a456-426614174000', display_name: 'Rice Curry',
  english_name: 'Rice Curry', sinhala_name: 'බත් කරි', category: null, serving_unit: null,
  verification_status: 'unverified', created_at: '2026-10-19T00:00:00Z', updated_at: '2026-10-19T00:00:00Z',
};

test('create trims input and posts no database-owned identity fields', async () => {
  response = foodRecord;
  const saved = await customFoodService.create({ display_name: '  බත්   කරි ', english_name: ' Rice Curry ' });
  assert.equal(saved.food_id, foodRecord.food_id);
  assert.equal(requests.at(-1).route, '/foods/custom');
  assert.equal(requests.at(-1).options.method, 'POST');
  const body = JSON.parse(requests.at(-1).options.body);
  assert.deepEqual(body, { display_name: 'බත් කරි', english_name: 'Rice Curry', sinhala_name: null, category: null, serving_unit: null });
  for (const field of ['id', 'owner_id', 'food_id', 'verification_status']) assert.equal(field in body, false);
});

test('empty and overlong names are rejected before any backend request', async () => {
  const count = requests.length;
  await assert.rejects(customFoodService.create({ display_name: '   ' }), /Enter a food name/);
  await assert.rejects(customFoodService.create({ display_name: 'x'.repeat(101) }), /100 characters/);
  assert.equal(requests.length, count);
});

test('list, search, edit and delete use the backend routes', async () => {
  response = [foodRecord];
  assert.deepEqual((await customFoodService.list()).map((food) => food.id), ['row-1']);
  assert.equal(requests.at(-1).route, '/foods/custom');
  await customFoodService.search('Rice & curry');
  assert.match(requests.at(-1).route, /^\/foods\/custom\/search\?/);
  response = foodRecord;
  await customFoodService.update(foodRecord.id, { display_name: 'Edited Curry' });
  assert.equal(requests.at(-1).route, `/foods/custom/${foodRecord.id}`);
  assert.equal(requests.at(-1).options.method, 'PATCH');
  const nutrition = { protein_g: 3.2, sugar_g: 0, vitamin_c_mg: null };
  response = { ...foodRecord, nutrition_values: nutrition };
  await customFoodService.create({ display_name: 'Test meal', serving_unit: '1 bun', nutrition_values: nutrition });
  assert.deepEqual(response.nutrition_values, nutrition);
  assert.deepEqual(JSON.parse(requests.at(-1).options.body).nutrition_values, nutrition);
  response = [{ ...foodRecord, nutrition_values: nutrition }];
  assert.deepEqual((await customFoodService.list())[0].nutrition_values, nutrition);
  await customFoodService.update(foodRecord.id, { display_name: 'Edited Curry', nutrition_values: nutrition });
  assert.deepEqual(JSON.parse(requests.at(-1).options.body).nutrition_values, nutrition);
  await assert.rejects(customFoodService.create({ display_name: 'Invalid', nutrition_values: { protein_g: -1 } }), /zero or greater/);
  await assert.rejects(customFoodService.create({ display_name: 'Invalid', nutrition_values: { protein_g: Number.NaN } }), /valid number/);
  await customFoodService.remove(foodRecord.id);
  assert.equal(requests.at(-1).options.method, 'DELETE');
});

test('backend custom table setup errors stay explicit', async () => {
  failure = new Error('Custom foods are not set up yet. The reviewed database migration must be applied first.');
  await assert.rejects(customFoodService.list(), /migration must be applied/);
  failure = null;
});

test('scanner retains source markers and custom food migration remains owner scoped', () => {
  const schema = fs.readFileSync(path.join(root, 'supabase/migrations/202610190001_user_custom_foods.sql'), 'utf8');
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /default auth\.uid\(\)/i);
  assert.match(schema, /with check \(owner_id = \(select auth\.uid\(\)\)/i);
  const scanner = fs.readFileSync(path.join(root, 'src/app/(mother)/meal-scan.tsx'), 'utf8');
  assert.match(scanner, /customFoodService\.search\(searchQuery\)/);
  assert.match(scanner, /resultSource: 'catalog'/);
  assert.match(scanner, /resultSource: 'custom'/);
  const modal = fs.readFileSync(path.join(root, 'src/components/ui/CustomFoodsModal.tsx'), 'utf8');
  assert.match(modal, /if \(savingRef\.current\) return/);
});
