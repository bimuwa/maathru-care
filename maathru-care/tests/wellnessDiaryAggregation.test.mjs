import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateDiaryDay,
  aggregateDiaryWeek,
  mondayOf,
  parseLocalDate,
  shiftLocalDate,
  weekDates,
} from '../src/services/wellnessDiaryAggregation.ts';

const item = (id, values = {}) => ({
  id,
  food_id: id,
  item_name: id,
  portion_amount: 1,
  portion_unit: 'piece',
  portion_provenance: 'user_confirmed',
  carbs_g: null,
  sugar_g: null,
  fiber_g: null,
  fat_g: null,
  iron_mg: null,
  calcium_mg: null,
  ...values,
});

const meal = (id, date, items, mealType = 'Lunch') => ({
  id,
  logged_date: date,
  meal_type: mealType,
  created_at: `${date}T12:00:00.000Z`,
  food_diary_items: items,
});

test('week starts Monday and handles month, year, and leap-day boundaries', () => {
  assert.equal(mondayOf('2024-02-29'), '2024-02-26');
  assert.deepEqual(weekDates('2024-02-28'), [
    '2024-02-26', '2024-02-27', '2024-02-28', '2024-02-29',
    '2024-03-01', '2024-03-02', '2024-03-03',
  ]);
  assert.deepEqual(weekDates('2025-01-01'), [
    '2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02',
    '2025-01-03', '2025-01-04', '2025-01-05',
  ]);
  assert.equal(shiftLocalDate('2024-02-28', 1), '2024-02-29');
  assert.throws(() => parseLocalDate('2025-02-29'), /Invalid diary date/);
});

test('daily totals sum saved snapshots once and keep each meal and item distinct', () => {
  const meals = [
    meal('breakfast', '2026-10-16', [item('roll-a', { carbs_g: 22, sugar_g: 1.4 })], 'Breakfast'),
    meal('lunch', '2026-10-16', [item('roll-b', { carbs_g: 44, sugar_g: 2.8 })]),
    meal('other-date', '2026-10-17', [item('other', { carbs_g: 500 })]),
  ];
  const day = aggregateDiaryDay('2026-10-16', meals);
  assert.equal(day.mealCount, 2);
  assert.equal(day.foodCount, 2);
  assert.deepEqual(day.meals.map((record) => record.id), ['breakfast', 'lunch']);
  assert.equal(day.nutrients.carbs_g.value, 66);
  assert.ok(Math.abs(day.nutrients.sugar_g.value - 4.2) < Number.EPSILON * 8);
  assert.equal(day.nutrients.carbs_g.partial, false);
});

test('missing values remain unavailable and partial coverage is explicit', () => {
  const day = aggregateDiaryDay('2026-10-16', [meal('partial', '2026-10-16', [
    item('known', { carbs_g: 0, iron_mg: 3 }),
    item('unknown'),
  ])]);
  assert.deepEqual(day.nutrients.carbs_g, { value: 0, knownItems: 1, itemCount: 2, partial: true });
  assert.deepEqual(day.nutrients.sugar_g, { value: null, knownItems: 0, itemCount: 2, partial: true });
});

test('weekly days agree with daily totals and no-record days stay empty', () => {
  const meals = [meal('monday', '2026-10-12', [item('food', { carbs_g: 12 })])];
  const week = aggregateDiaryWeek('2026-10-16', meals);
  assert.equal(week.length, 7);
  assert.equal(week[0].date, '2026-10-12');
  assert.equal(week[0].nutrients.carbs_g.value, aggregateDiaryDay('2026-10-12', meals).nutrients.carbs_g.value);
  assert.equal(week[1].mealCount, 0);
  assert.equal(week[1].nutrients.carbs_g.value, null);
});
