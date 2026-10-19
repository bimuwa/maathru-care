import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/services/nutrientCatalog.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports }, { filename: 'nutrientCatalog.ts' });
const { NUTRIENT_DEFINITIONS, searchNutrients, validateNutrientValues, getNutrientDefinition } = exports;
const keys = (query, selected = []) => searchNutrients(query, selected).map((item) => item.key);

test('search starts at first character, matches partial case-insensitively, and ranks prefix before contains', () => {
  assert.ok(keys('su').includes('sugar_g'));
  assert.ok(keys('PRO').includes('protein_g'));
  assert.ok(keys('vit').some((key) => key === 'vitamin_a_ug_rae'));
  assert.ok(keys('vit').some((key) => key === 'vitamin_b12_ug'));
  const calories = keys('cal');
  assert.ok(calories.indexOf('energy_kcal') < calories.indexOf('calcium_mg'));
  assert.ok(keys('b12').includes('vitamin_b12_ug'));
  assert.ok(keys('vit c').includes('vitamin_c_mg'));
  const fatMatches = keys('fat');
  assert.equal(fatMatches[0], 'fat_g');
});

test('search omits selected nutrients to prevent duplicates and permits remove/re-add', () => {
  assert.equal(keys('sugar', ['sugar_g']).includes('sugar_g'), false);
  assert.equal(keys('sugar').includes('sugar_g'), true);
});

test('catalog owns units and optional values preserve null and zero', () => {
  assert.equal(getNutrientDefinition('protein_g').unit, 'g');
  assert.equal(getNutrientDefinition('iron_mg').unit, 'mg');
  assert.equal(validateNutrientValues({ protein_g: 3.25, sugar_g: 0, vitamin_c_mg: null }), null);
  assert.match(validateNutrientValues({ protein_g: -0.1 }), /zero or greater/);
  assert.match(validateNutrientValues({ protein_g: Number.NaN }), /valid number/);
  assert.match(validateNutrientValues({ protein_g: Number.POSITIVE_INFINITY }), /valid number/);
  assert.ok(NUTRIENT_DEFINITIONS.length >= 30);
});
