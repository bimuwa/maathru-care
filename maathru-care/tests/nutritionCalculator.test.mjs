import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  calculateConfirmedPortion,
  calculateLegacyMealItem,
  assertNewPortionPersistenceSupported,
  confirmPortionForPreview,
  createPortionPreviewItem,
  correctFoodCandidate,
  findFoodById,
  groupFoodDetections,
  mapFoodNutritionRecord,
  parseReferenceBasis,
  readLegacyMealItem,
  resolveCorrectedFoodId,
  NEW_PORTION_PERSISTENCE_SUPPORTED,
  sumNutrition,
} from '../src/services/nutritionCalculator.ts';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((value) => value !== '')) rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

const maternalFoodsCsv = fileURLToPath(new URL('../../bin/maternal_foods_rows_supabase.csv', import.meta.url));
const mealItemsCsv = fileURLToPath(new URL('../../bin/meal_items_rows_supabase.csv', import.meta.url));
const foodRows = parseCsv(readFileSync(maternalFoodsCsv, 'utf8'));
const foods = foodRows.map(mapFoodNutritionRecord);
const mealItemRows = parseCsv(readFileSync(mealItemsCsv, 'utf8'));
const food = (id) => {
  const result = findFoodById(foods, id);
  assert.ok(result, `Expected exported food ${id} to exist`);
  return result;
};
const portion = (amount, unit) => ({ amount, unit, confirmedByUser: true });

test('export fixtures load and Vegetable Roll calculates one confirmed piece', () => {
  const result = calculateConfirmedPortion(food('vegetable_roll'), portion(1, 'piece'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.scale, 1);
  assert.equal(result.referenceBasis.sourceText, '1 piece (70g)');
  assert.deepEqual(result.nutrients, {
    carbsG: 22,
    sugarG: 1.4,
    fiberG: 1.8,
    fatG: 9.5,
    ironMg: 0.8,
    calciumMg: 18,
  });
});

test('Vegetable Roll calculates two pieces as twice the one-piece reference', () => {
  const result = calculateConfirmedPortion(food('vegetable_roll'), portion(2, 'piece'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.scale, 2);
  assert.equal(result.nutrients.carbsG, 44);
  assert.equal(result.nutrients.sugarG, 2.8);
  assert.equal(result.nutrients.fiberG, 3.6);
  assert.equal(result.nutrients.fatG, 19);
});

test('Barley uses its per-100g basis for 100g and 50g confirmations', () => {
  const barley = food('barley');
  assert.deepEqual(barley.referenceBasis, { amount: 100, unit: 'g', sourceText: '100g' });
  const full = calculateConfirmedPortion(barley, portion(100, 'g'));
  const half = calculateConfirmedPortion(barley, portion(50, 'g'));
  assert.equal(full.ok, true);
  assert.equal(half.ok, true);
  if (!full.ok || !half.ok) return;
  assert.equal(full.nutrients.carbsG, 60.9);
  assert.equal(half.nutrients.carbsG, 30.45);
  assert.equal(half.nutrients.fiberG, 7.74);
});

test('White Rice uses its documented cup basis without converting cups to grams', () => {
  const rice = food('white_rice');
  assert.deepEqual(rice.referenceBasis, { amount: 1, unit: 'cup', sourceText: '1 cup (150g)' });
  const oneCup = calculateConfirmedPortion(rice, portion(1, 'cup'));
  const halfCup = calculateConfirmedPortion(rice, portion(0.5, 'cup'));
  assert.equal(oneCup.ok, true);
  assert.equal(halfCup.ok, true);
  if (!oneCup.ok || !halfCup.ok) return;
  assert.equal(oneCup.nutrients.carbsG, 53);
  assert.equal(halfCup.nutrients.carbsG, 26.5);
  assert.equal(halfCup.nutrients.calciumMg, 5);
});

test('duplicate YOLO detections yield food identities with no inferred quantity', () => {
  const candidates = groupFoodDetections([
    { food_id: 'vegetable_roll', confidence: 0.91 },
    { food_id: 'vegetable_roll', confidence: 0.83 },
  ]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].foodId, 'vegetable_roll');
  assert.equal(candidates[0].confidence, 0.91);
  assert.equal(candidates[0].confirmedPortion, null);
  assert.equal('quantity' in candidates[0], false);
  assert.equal('servingMultiplier' in candidates[0], false);
});

test('correcting a detection changes the exact food ID used for nutrition lookup', () => {
  const original = groupFoodDetections([{ food_id: 'rice', confidence: 0.8 }])[0];
  const corrected = correctFoodCandidate(original, food('white_rice'));
  assert.equal(resolveCorrectedFoodId(original.foodId, corrected.foodId), 'white_rice');
  assert.equal(findFoodById(foods, resolveCorrectedFoodId(original.foodId, corrected.foodId))?.foodId, 'white_rice');
  assert.equal(resolveCorrectedFoodId('chicken_cutlet', undefined), 'chicken_cutlet');
});

test('unmapped foods remain visible without substituting a nutrition record', () => {
  assert.equal(findFoodById(foods, 'chicken_cutlet'), null);
  const preview = createPortionPreviewItem('preview-1', null, 'chicken_cutlet', 0.89);
  assert.equal(preview.foodId, 'chicken_cutlet');
  assert.equal(preview.nutritionRecord, null);
  assert.equal(preview.portion, null);
  assert.equal(preview.calculatedNutrients, null);
  assert.deepEqual(confirmPortionForPreview(preview, 1, 'piece'), { ok: false, reason: 'reference_basis_unknown' });
});

test('portion preview is unconfirmed until user submits and recalculates immediately after edits', () => {
  const preview = createPortionPreviewItem('preview-roll', food('vegetable_roll'), 'vegetable_roll', 0.95);
  assert.equal(preview.portion, null);
  assert.equal(preview.calculatedNutrients, null);
  const one = confirmPortionForPreview(preview, 1, 'piece');
  assert.equal(one.ok, true);
  if (!one.ok) return;
  assert.equal(one.item.calculatedNutrients.carbsG, 22);
  const two = confirmPortionForPreview(one.item, 2, 'piece');
  assert.equal(two.ok, true);
  if (!two.ok) return;
  assert.equal(two.item.calculatedNutrients.carbsG, 44);
  assert.equal(two.item.portion.confirmedByUser, true);
});

test('new-format save remains intentionally blocked until persistence schema exists', () => {
  assert.equal(NEW_PORTION_PERSISTENCE_SUPPORTED, false);
  assert.throws(assertNewPortionPersistenceSupported, /database stores amount, unit, reference basis, and confirmation status/);
});

test('missing chicken_cutlet lookup remains missing; it is not fuzzy-substituted', () => {
  assert.equal(findFoodById(foods, 'chicken_cutlet'), null);
});

test('missing nutrients remain null while a genuine zero remains zero', () => {
  const partial = mapFoodNutritionRecord({
    food_id: 'partial_food',
    display_name: 'Partial food',
    serving_unit: '100g',
    carbs_g: '0',
    sugar_g: null,
    fiber_g: '2',
    fat_g: 'bad-value',
    iron_mg: '-1',
    calcium_mg: '0',
  });
  const result = calculateConfirmedPortion(partial, portion(100, 'g'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.nutrients.carbsG, 0);
  assert.equal(result.nutrients.sugarG, null);
  assert.equal(result.nutrients.fatG, null);
  assert.equal(result.nutrients.ironMg, null);
  assert.equal(result.nutrients.calciumMg, 0);
  assert.ok(partial.dataIssues.includes('missing:sugarG'));
  assert.ok(partial.dataIssues.includes('invalid:fatG'));
  assert.ok(partial.dataIssues.includes('invalid:ironMg'));
  assert.equal(sumNutrition([result.nutrients]).sugarG, null);
});

test('portion input rejects unconfirmed, zero, negative, non-finite, and unsupported values', () => {
  const vegetableRoll = food('vegetable_roll');
  assert.deepEqual(calculateConfirmedPortion(vegetableRoll, { amount: 1, unit: 'piece', confirmedByUser: false }), {
    ok: false,
    reason: 'portion_not_confirmed',
  });
  for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(calculateConfirmedPortion(vegetableRoll, portion(amount, 'piece')), {
      ok: false,
      reason: 'invalid_amount',
    });
  }
  assert.deepEqual(calculateConfirmedPortion(vegetableRoll, portion(1, 'cup')), {
    ok: false,
    reason: 'unit_mismatch',
  });
  assert.deepEqual(calculateConfirmedPortion(vegetableRoll, portion(1, 'ml')), {
    ok: false,
    reason: 'unsupported_unit',
  });
  assert.equal(parseReferenceBasis('serving (40g)'), null);
  assert.equal(parseReferenceBasis('1 cup (150g curd + 2 tbsp treacle)'), null);
});

test('existing meal-item exports remain readable as explicitly unconfirmed legacy rows', () => {
  assert.equal(mealItemRows.length, 20);
  const legacyRows = mealItemRows.map(readLegacyMealItem);
  assert.ok(legacyRows.every((item) => item.recordKind === 'legacy'));
  assert.ok(legacyRows.every((item) => item.portionStatus === 'legacy-unconfirmed'));

  const vegetableRollEleven = legacyRows.find((item) => item.foodId === 'vegetable_roll' && item.legacyMultiplier === 11);
  assert.ok(vegetableRollEleven);
  const calculated = calculateLegacyMealItem(vegetableRollEleven);
  assert.equal(calculated.carbsG, 242);
  assert.equal(calculated.calciumMg, 198);
});
