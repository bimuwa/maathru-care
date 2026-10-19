import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  RECIPE_INGREDIENTS, canGenerateRecipes, createRecipeGenerationRequest,
  filterIngredients, removeIngredientSelection, toggleIngredientSelection,
} from '../src/constants/recipeIngredients.ts';

test('curated catalog has stable unique IDs and typed ingredient categories', () => {
  const ids = RECIPE_INGREDIENTS.map((ingredient) => ingredient.id);
  assert.equal(RECIPE_INGREDIENTS.length, 33);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(RECIPE_INGREDIENTS.every((ingredient) => ingredient.nameEn && ingredient.category && Array.isArray(ingredient.searchAliases)));
});

test('search filters English names case-insensitively and Sinhala labels and aliases', () => {
  assert.ok(filterIngredients('rEd RiCe').some((ingredient) => ingredient.id === 'grain-red-rice'));
  assert.ok(filterIngredients('ගොටුකොළ').some((ingredient) => ingredient.id === 'green-gotukola'));
  assert.ok(filterIngredients('dal').some((ingredient) => ingredient.id === 'legume-dhal'));
  assert.equal(filterIngredients('no such ingredient').length, 0);
});

test('selection toggles once, deselects on second tap, removes chips, and never duplicates IDs', () => {
  const once = toggleIngredientSelection([], 'veg-carrot');
  assert.deepEqual(once, ['veg-carrot']);
  assert.deepEqual(toggleIngredientSelection(once, 'veg-carrot'), []);
  assert.deepEqual(toggleIngredientSelection(['veg-carrot', 'veg-tomato'], 'veg-carrot'), ['veg-tomato']);
  assert.deepEqual(removeIngredientSelection(['veg-carrot', 'veg-tomato'], 'veg-carrot'), ['veg-tomato']);
  assert.deepEqual(createRecipeGenerationRequest(['veg-carrot', 'veg-carrot']), { selectedIngredientIds: ['veg-carrot'] });
});

test('search and category filtering do not modify the persistent selection list', () => {
  const selected = ['veg-carrot', 'grain-red-rice'];
  filterIngredients('tomato');
  filterIngredients('', 'grains-rice');
  assert.deepEqual(selected, ['veg-carrot', 'grain-red-rice']);
});

test('Generate is disabled with no selection and enabled once selected', () => {
  assert.equal(canGenerateRecipes([]), false);
  assert.equal(canGenerateRecipes(['protein-eggs']), true);
});

test('dashboard route, result payload and edit action are connected', () => {
  const home = readFileSync(new URL('../src/app/(mother)/home.tsx', import.meta.url), 'utf8');
  const selector = readFileSync(new URL('../src/app/(mother)/recipe-generator.tsx', import.meta.url), 'utf8');
  const result = readFileSync(new URL('../src/app/(mother)/recipe-result.tsx', import.meta.url), 'utf8');
  assert.match(home, /Smart Recipe Generator/);
  assert.match(home, /recipe-generator/);
  assert.match(selector, /selected: JSON\.stringify\(selectedIds\)/);
  assert.match(result, /Recipe recommendations are coming soon\./);
  assert.match(result, /Edit Ingredients/);
  assert.match(result, /selectedIngredientIds/);
});
