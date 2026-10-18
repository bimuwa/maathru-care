// Date-only aggregation and semantic chart rendering; no live database access.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const nativeWeb = require('react-native-web');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, console, require(name) {
    if (name === 'react-native') return nativeWeb;
    if (name === 'expo-router') return { useRouter: () => ({ push() {} }), useFocusEffect() {} };
    if (name.startsWith('@/services/foodDiaryService')) return { foodDiaryService: {} };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}${fs.existsSync(path.join(root, `src/${name.slice(2)}.tsx`)) ? '.tsx' : '.ts'}`);
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name);
      return load(path.relative(root, resolved + (fs.existsSync(`${resolved}.tsx`) ? '.tsx' : '.ts')));
    }
    return require(name);
  } }, { filename });
  return exports;
}
const aggregation = load('src/services/wellnessDiaryAggregation.ts');
const dashboard = load('src/components/ui/WellnessDiaryDashboard.tsx');
const food = (id, name, carbs, sugar, extras = {}) => ({
  id, food_id: id, item_name: name, portion_amount: 1, portion_unit: 'piece', portion_provenance: 'user_adjusted',
  carbs_g: carbs, sugar_g: sugar, fiber_g: 1, fat_g: 2, iron_mg: 0.5, calcium_mg: 10, ...extras,
});
const meal = (id, date, type, items) => ({ id, logged_date: date, meal_type: type, created_at: `${date}T10:00:00Z`, food_diary_items: items });

test('Monday to Sunday spans exactly seven local dates across month and year boundaries', () => {
  assert.equal(aggregation.mondayOf('2027-01-01'), '2026-12-28');
  assert.equal(aggregation.mondayOf('2026-10-18'), '2026-10-12');
  assert.deepEqual(Array.from(aggregation.weekDates('2026-12-28')), [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(aggregation.shiftLocalDate('2026-12-31', 1), '2027-01-01');
  assert.throws(() => aggregation.parseLocalDate('2026-02-30'));
});

test('daily and weekly sums use stored snapshots once and preserve repeated foods in separate meals', () => {
  const meals = [
    meal('breakfast-1', '2026-10-12', 'Breakfast', [food('a', 'Vegetable Roll', 22, 1.4)]),
    meal('lunch-1', '2026-10-12', 'Lunch', [food('b', 'Vegetable Roll', 22, 1.4)]),
    meal('dinner-1', '2026-10-13', 'Dinner', [food('c', 'Rice', 40, 0)]),
  ];
  const day = aggregation.aggregateDiaryDay('2026-10-12', meals);
  const week = aggregation.aggregateDiaryWeek('2026-10-12', meals);
  assert.equal(day.mealCount, 2);
  assert.equal(day.foodCount, 2);
  assert.deepEqual(Array.from(day.meals.map((entry) => entry.id)), ['breakfast-1', 'lunch-1']);
  assert.equal(day.nutrients.carbs_g.value, 44);
  assert.equal(week[0].nutrients.carbs_g.value, day.nutrients.carbs_g.value);
  assert.equal(week[1].nutrients.sugar_g.value, 0);
  assert.equal(week.length, 7);
  assert.equal(week[2].mealCount, 0);
  assert.equal(week[2].nutrients.carbs_g.value, null);
});

test('missing nutrients stay unknown or partial while recorded zero stays zero', () => {
  const meals = [meal('one', '2026-10-12', 'Lunch', [food('a', 'Roll', 0, null), food('b', 'Egg', null, 0)])];
  const day = aggregation.aggregateDiaryDay('2026-10-12', meals);
  assert.equal(day.nutrients.carbs_g.value, 0);
  assert.equal(day.nutrients.carbs_g.partial, true);
  assert.equal(day.nutrients.sugar_g.value, 0);
  assert.equal(day.nutrients.sugar_g.partial, true);
  assert.equal(aggregation.aggregateDiaryDay('2026-10-13', meals).nutrients.carbs_g.value, null);
  assert.equal(aggregation.nutrientTotal([food('a', 'Roll', null, null)], 'carbs_g').value, null);
});

test('week chart and food list render actual names, quantities and no-record markers on web', () => {
  const meals = [meal('one', '2026-10-12', 'Lunch', [food('a', 'Chicken Cutlet', 18, 2)])];
  const days = aggregation.aggregateDiaryWeek('2026-10-12', meals);
  const chart = renderToStaticMarkup(React.createElement(dashboard.WeekChart, { days, selected: '2026-10-12', onSelect() {}, nutrientKey: 'carbs_g' }));
  const list = renderToStaticMarkup(React.createElement(dashboard.MealList, { meals }));
  assert.equal((chart.match(/role="button"/g) || []).length, 7);
  assert.match(chart, /No records/);
  assert.match(chart, /Monday|Mon/);
  assert.match(list, /Chicken Cutlet/);
  assert.match(list, /1 piece/);
  assert.match(list, /Carbs 18\.0 g/);
});

test('screen uses the diary dashboard, keeps GDM risk, and constrains mobile content', () => {
  const screen = fs.readFileSync(path.join(root, 'src/app/(mother)/gdm-care.tsx'), 'utf8');
  const component = fs.readFileSync(path.join(root, 'src/components/ui/WellnessDiaryDashboard.tsx'), 'utf8');
  assert.match(screen, /<WellnessDiaryDashboard mode=\{activeTab\}/);
  assert.match(screen, /renderGdm\(\)/);
  assert.doesNotMatch(screen, /mealService\.getWeeklyTrends|mealService\.getDailyNutrition/);
  assert.match(component, /getMealsForDate\(queryKey\)/);
  assert.match(component, /getMealsForRange\(queryKey, shiftLocalDate\(queryKey, 6\)\)/);
  assert.match(component, /requestVersion\.current === version/);
  assert.match(component, /setMeals\(null\)/);
  assert.match(component, /Try again/);
  assert.match(component, /View Day/);
  assert.match(component, /viewDiary: '1'/);
  assert.match(component, /maxWidth: 640/);
  const scanner = fs.readFileSync(path.join(root, 'src/app/(mother)/meal-scan.tsx'), 'utf8');
  const diary = fs.readFileSync(path.join(root, 'src/components/ui/FoodDiaryHistory.tsx'), 'utf8');
  assert.match(scanner, /if \(date\) setSelectedDate\(initialDate\)/);
  assert.match(scanner, /openAllOnMount=\{viewDiary === '1'\}/);
  assert.match(diary, /if \(openAllOnMount\).*setShowAll\(true\)/);
});
