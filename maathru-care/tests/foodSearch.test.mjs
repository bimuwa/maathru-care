import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/services/foodSearch.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, URLSearchParams, require: () => ({ nutritionApi: {} }) }, { filename: 'foodSearch.ts' });
const { rankCombinedFoodResults } = exports;

test('combined global and personal foods rank exact, prefix, then contains across both sources', () => {
  const rows = [
    { food_id: 'global_2', display_name: 'Brown Rice', resultSource: 'catalog' },
    { food_id: 'custom_1', display_name: 'My Special Rice', sinhala_name: 'rice local', resultSource: 'custom' },
    { food_id: 'global_1', display_name: 'Rice', resultSource: 'catalog' },
  ];
  assert.equal(JSON.stringify(rankCombinedFoodResults(rows, 'rice').map((row) => row.food_id)), JSON.stringify(['global_1', 'custom_1', 'global_2']));
});

test('combined search handles Sinhala/English fields and keeps global tie priority', () => {
  const rows = [
    { food_id: 'custom_2', display_name: 'Rice Special', english_name: null, sinhala_name: 'බත්', resultSource: 'custom' },
    { food_id: 'global_2', display_name: 'Rice Local', resultSource: 'catalog' },
  ];
  assert.equal(rankCombinedFoodResults(rows, 'rice')[0].resultSource, 'catalog');
  assert.equal(rankCombinedFoodResults(rows, 'බ')[0].food_id, 'custom_2');
});
