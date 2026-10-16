// Semantic web rendering and isolated real scanner handlers; no production requests.
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
let lookupResponse = { data: null, error: null };
const databaseReads = [];
const query = { select() { return this; }, eq(field, value) { databaseReads.push([field, value]); return this; }, maybeSingle: async () => lookupResponse };
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true };

function load(relative) {
  const filename = path.join(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions }).outputText;
  vm.runInNewContext(code, { exports, console, require(name) {
    if (name === 'react-native') return { ...nativeWeb, Modal: ({ children }) => React.createElement(nativeWeb.View, null, children) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) };
    if (name === 'lucide-react-native') return new Proxy({}, { get: () => () => null });
    if (name === '@supabase/supabase-js') return { createClient: () => ({}) };
    if (name === '@react-native-async-storage/async-storage') return { default: {} };
    if (name.startsWith('@/')) { const relative = `src/${name.slice(2)}`; return load(relative + (fs.existsSync(path.join(root, `${relative}.tsx`)) ? '.tsx' : '.ts')); }
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name);
      if (resolved === path.join(root, 'src/lib/supabase')) return { supabase: { from: () => query } };
      return load(path.relative(root, resolved + (fs.existsSync(`${resolved}.tsx`) ? '.tsx' : '.ts')));
    }
    return require(name);
  } }, { filename });
  return exports;
}

const calculator = load('src/services/nutritionCalculator.ts');
const estimates = load('src/services/foodQuantitySuggestions.ts');
const rice = calculator.mapFoodNutritionRecord({ food_id: 'white_rice', display_name: 'White Rice', serving_unit: '1 cup',
  carbs_g: 40, sugar_g: 0, fiber_g: 2, fat_g: 1, iron_mg: 1, calcium_mg: null });
const pending = () => calculator.createPortionPreviewItem('rice-1', rice, rice.foodId, 0.9);
const plate = load('src/components/ui/MealPlateCard.tsx').MealPlateCard;
const renderPlate = items => renderToStaticMarkup(React.createElement(plate, {
  items, mealType: 'Lunch', onRemoveItem() {}, onUpdateQuantity() {},
}));

// Extract existing function bodies for boundary tests without replacing their logic.
function sourceFile(relative) {
  return ts.createSourceFile(relative, fs.readFileSync(path.join(root, relative), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function findNodes(source, predicate) {
  const found = [];
  function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
  visit(source);
  return found;
}
function handler(relative, name, context) {
  const source = sourceFile(relative);
  const declaration = findNodes(source, node => ts.isVariableDeclaration(node) && node.name.getText(source) === name)[0];
  assert.ok(declaration, `Missing handler ${name}`);
  return vm.runInNewContext(ts.transpileModule(`(${declaration.initializer.getText(source)})`, { compilerOptions }).outputText, context);
}
const screenFile = 'src/app/(mother)/meal-scan.tsx';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('empty plate renders its guidance without pending portions', () => {
  const html = renderPlate([]);
  assert.match(html, /Lunch Plate/);
  assert.match(html, /Your plate is empty/);
  assert.doesNotMatch(html, /Portion unknown/);
});

test('long food names and unknown portions hide reference-only nutrients; a valid amount reveals estimates', () => {
  const item = { ...pending(), name: 'White Rice With A Long Descriptive Food Name' };
  const before = renderPlate([item]);
  assert.match(before, /White Rice With A Long Descriptive Food Name/);
  assert.match(before, /Choose your amount/);
  assert.match(before, /Amount for/);
  assert.doesNotMatch(before, /Confirm Portion/);
  assert.match(before, /Choose an amount to see estimated nutrition/);
  assert.doesNotMatch(before, /Unavailable|Reference only|Carbs/);
  const result = calculator.confirmPortionForPreview(item, 0.5, 'cup');
  assert.equal(result.ok, true);
  const after = renderPlate([result.item]);
  assert.match(after, /Confirmed by you/);
  assert.match(after, /20\.0 g/);
  assert.match(after, /0\.0 g/);
  assert.match(after, /Unavailable/); // Missing calcium remains unknown.
});

test('multiple foods retain individual portion actions and combine confirmed nutrients', () => {
  const first = calculator.confirmPortionForPreview(pending(), 1, 'cup').item;
  const second = { ...calculator.confirmPortionForPreview(pending(), 0.5, 'cup').item, id: 'rice-2' };
  const html = renderPlate([first, second]);
  assert.match(html, /2 foods added/);
  assert.match(html, /60\.0 g/);
  assert.equal((html.match(/Amount for White Rice/g) || []).length, 2);
});

test('one authenticated Save Meal action stays below the scroll content with safe-area clearance', () => {
  const source = sourceFile(screenFile);
  const footers = findNodes(source, node => ts.isJsxOpeningElement(node) &&
    node.attributes.properties.some(attr => attr.name?.getText(source) === 'testID' && attr.initializer?.text === 'meal-save-footer'));
  assert.equal(footers.length, 1);
  let ancestor = footers[0].parent;
  while (ancestor && !(ts.isJsxElement(ancestor) && ancestor.openingElement.tagName.getText(source) === 'ScrollView')) ancestor = ancestor.parent;
  assert.equal(ancestor, undefined, 'Save action must remain visible outside the scroll content');
  const saveButtons = findNodes(footers[0].parent, node => ts.isJsxOpeningElement(node) &&
    node.tagName.getText(source) === 'TouchableOpacity' && node.attributes.properties.some(attr => attr.name?.getText(source) === 'onPress' && attr.initializer?.getText(source).includes('handleSaveMeal')));
  assert.equal(saveButtons.length, 1);
  assert.match(saveButtons[0].getText(source), /disabled=\{isSavingMeal \|\|/);
  assert.match(footers[0].parent.getText(source), /Save Meal/);
  assert.match(footers[0].parent.getText(source), /Food Diary account/);
  assert.match(source.text, /foodDiaryService\.saveMeal\(requestId, localDate, mealType, selectedItems\)/);
  assert.match(saveButtons[0].getText(source), /!hasSelectedPortion/);
  assert.match(source.text, /const hasSelectedPortion = mealItems\.some\(\(item\) => item\.portion && Number\.isFinite\(item\.portion\.amount\) && item\.portion\.amount > 0\)/);
  assert.match(source.text, /FoodDiaryHistory/);
  assert.match(source.text, /KeyboardAvoidingView style=\{\{ flex: 1, minHeight: 0 \}\}/);
  assert.match(source.text, /contentContainerStyle=\{\{ paddingBottom: 32 \+ Math.max\(insets.bottom, 8\) \}\}/);
  assert.throws(() => calculator.assertNewPortionPersistenceSupported());
});

test('confirmed save clears scanner draft; failed save retains draft and retry key', async () => {
  const original = [{ id: 'food-1', name: 'Rice', nutritionRecord: { foodId: 'white_rice' }, portion: { amount: 1, unit: 'cup' }, calculatedNutrients: { carbsG: 40 } }];
  let currentItems = original, success = false, reset = 0, calls = [], saving = false;
  let saveImpl = async (key) => { calls.push(key); throw new Error('temporary network issue'); };
  const context = {
    isSavingMeal: false, mealItems: original, diarySession: { user: { id: 'auth-user' } }, isDiaryReady: true,
    selectedDate: new Date(2026, 9, 16), mealType: 'Lunch', saveRequest: { current: null }, saveInFlight: { current: false }, newDiaryRequestId: () => 'same-request',
    foodDiaryService: { saveMeal: async (key) => saveImpl(key) },
    setIsSavingMeal: value => { saving = value; }, setSavedMealsRefresh() {},
    setMealItems: value => { currentItems = value; }, resetScanWorkspace: () => { reset++; },
    setShowSuccessModal: value => { success = value; }, Alert: { alert() {} },
  };
  const save = handler(screenFile, 'handleSaveMeal', context);
  await save();
  assert.equal(currentItems, original, 'A failed save must preserve the draft');
  assert.equal(reset, 0);
  assert.equal(saving, false);
  saveImpl = async (key) => { calls.push(key); return 'saved-meal-id'; };
  await save();
  assert.deepEqual(calls, ['same-request', 'same-request']);
  assert.equal(currentItems.length, 0);
  assert.equal(reset, 1);
  assert.equal(success, true);
});

test('Save Meal ignores zero quantity cards and does not start an all-zero save', async () => {
  const zero = { ...makeRoll(), id: 'zero-roll' };
  const one = estimates.adjustEstimatedQuantity({ ...makeRoll(), id: 'one-roll' }, 1, 'piece').item;
  let captured, calls = 0;
  const context = { isSavingMeal: false, mealItems: [zero], diarySession: { user: { id: 'auth-user' } }, isDiaryReady: true,
    selectedDate: new Date(2026, 9, 16), mealType: 'Lunch', saveRequest: { current: null }, saveInFlight: { current: false },
    newDiaryRequestId: () => 'save-selected', foodDiaryService: { saveMeal: async (_id, _date, _type, items) => { calls++; captured = items; return 'saved-id'; } },
    setIsSavingMeal() {}, setSavedMealsRefresh() {}, setMealItems() {}, resetScanWorkspace() {}, setShowSuccessModal() {}, Alert: { alert() {} } };
  await handler(screenFile, 'handleSaveMeal', context)();
  assert.equal(calls, 0);
  context.mealItems = [zero, one];
  await handler(screenFile, 'handleSaveMeal', context)();
  assert.equal(calls, 1);
  assert.deepEqual(captured.map(item => item.id), ['one-roll']);
});

test('rapid double-tap starts only one in-flight diary save', async () => {
  let calls = 0, finish;
  const original = [{ id: 'food-1', name: 'Rice', nutritionRecord: { foodId: 'white_rice' }, portion: { amount: 1, unit: 'cup' }, calculatedNutrients: { carbsG: 40 } }];
  const context = {
    isSavingMeal: false, mealItems: original, diarySession: { user: { id: 'auth-user' } }, isDiaryReady: true,
    selectedDate: new Date(2026, 9, 16), mealType: 'Lunch', saveRequest: { current: null }, saveInFlight: { current: false }, newDiaryRequestId: () => 'same-request',
    foodDiaryService: { saveMeal: async () => { calls++; return new Promise(resolve => { finish = () => resolve('meal-id'); }); } },
    setIsSavingMeal() {}, setSavedMealsRefresh() {}, setMealItems() {}, resetScanWorkspace() {}, setShowSuccessModal() {}, Alert: { alert() {} },
  };
  const save = handler(screenFile, 'handleSaveMeal', context);
  const first = save();
  const second = save();
  await Promise.resolve();
  assert.equal(calls, 1);
  finish();
  await Promise.all([first, second]);
});

test('food history preview and full-date view reload persisted records per selected date', () => {
  const history = fs.readFileSync(path.join(root, 'src/components/ui/FoodDiaryHistory.tsx'), 'utf8');
  assert.match(history, /meals\.slice\(0, 3\)/);
  assert.match(history, /View All/);
  assert.match(history, /foodDiaryService\.getMealsForDate\(selectedDate\)/);
  assert.match(history, /setHistoryDate\(\(d\) => shiftDate\(d, -1\)\)/);
  assert.match(history, /Nutrient values are estimates when available/);
});

test('wellness pages do not show synthetic calorie or unsupported sugar targets', () => {
  for (const page of ['gdm-care.tsx', 'nutrition.tsx']) {
    const source = fs.readFileSync(path.join(root, 'src/app/(mother)', page), 'utf8');
    assert.doesNotMatch(source, /1800|GDM_HIGH_SUGAR_LIMIT|Target Exceeded|Sugar Limit/);
    if (page === 'nutrition.tsx') { assert.match(source, /Calorie totals are unavailable/); assert.match(source, /Not recorded/); }
  }
  const dashboard = fs.readFileSync(path.join(root, 'src/components/ui/WellnessDiaryDashboard.tsx'), 'utf8');
  assert.match(dashboard, /Calorie totals are unavailable/);
  assert.match(dashboard, /No meals recorded/);
});

test('portion submit rejects invalid/unsupported values and confirms only an explicit valid amount', () => {
  const relative = 'src/components/ui/QuantityEditModal.tsx';
  for (const qty of ['', '0', '-1', 'NaN', 'Infinity', '0x10', '1e2', 'abc']) {
    let error;
    handler(relative, 'submit', { qty, food: rice, unit: 'cup', calculateConfirmedPortion: calculator.calculateConfirmedPortion,
      setError: value => { error = value; }, onSave: () => assert.fail('Invalid quantity confirmed') })();
    assert.ok(error);
  }
  let confirmed;
  handler(relative, 'submit', { qty: '0,5', food: rice, unit: 'cup', calculateConfirmedPortion: calculator.calculateConfirmedPortion,
    setError: () => assert.fail('Valid amount rejected'), onSave: (amount, unit) => { confirmed = [amount, unit]; } })();
  assert.deepEqual(confirmed, [0.5, 'cup']);
  let rejected = false;
  handler(relative, 'submit', { qty: '100', food: rice, unit: 'g', calculateConfirmedPortion: calculator.calculateConfirmedPortion,
    setError: () => { rejected = true; }, onSave: () => assert.fail('Unsupported conversion confirmed') })();
  assert.equal(rejected, true);
});

test('discarded scan cannot restore stale detections', async () => {
  const response = deferred();
  const request = { current: 0 };
  const states = [];
  const context = { scanRequestId: request,
    setImageUri() {}, setScanState: state => states.push(state), setErrorMsg() {}, setImageAspectRatio() {},
    setIsLookingUp() {}, setCorrectionCandidateId() {}, setIsSearchModalVisible() {}, setSearchQuery() {}, setSearchResults() {},
    setPendingMealItems() {}, setPendingPreviousMealItems() {}, setPendingFoodNames() {}, setGdmWarnings() {},
    referenceVersions: { current: new Map() },
    ImageManipulator: { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async () => ({ uri: 'data:image/jpeg,test', width: 640, height: 480 }) },
    analyzeMealImage: () => response.promise, groupFoodDetections: calculator.groupFoodDetections,
    setReviewCandidates: value => { assert.equal(value.length, 0, 'Stale result repopulated review'); }, setCorrectedFoodIds() {}, setSelectedDetectionIds() {}, setCorrectionCandidateId() {}, console };
  const process = handler(screenFile, 'processImage', context);
  const running = process('data:image/jpeg,test');
  await new Promise(resolve => setImmediate(resolve));
  handler(screenFile, 'resetScanWorkspace', context)();
  response.resolve({ success: true, count: 1, detections: [{ food_id: 'white_rice', confidence: 0.9 }] });
  await running;
  assert.deepEqual(states, ['compressing', 'analyzing', 'idle']);
});

test('successful scan adds foods automatically and retains all original boxes', async () => {
  let items = [], state, lookups = 0;
  const context = { scanRequestId: { current: 0 }, setImageUri() {}, setImageAspectRatio() {}, setErrorMsg() {},
    setScanState: value => { state = value; }, setIsLookingUp() {}, setMealItems: update => { items = update(items); },
    groupDetectionEvidence: estimates.groupDetectionEvidence, createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    ImageManipulator: { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async () => ({ uri: 'local-test', width: 640, height: 480 }) },
    analyzeMealImage: async () => ({ success: true, count: 4, detections: fourRolls }),
    loadNutritionForItem: async (item, all) => { lookups++; assert.equal(item.rawDetections.length, 4); assert.equal(all.length, 4); }, console };
  await handler(screenFile, 'processImage', context)('local-test');
  assert.equal(items.length, 1);
  assert.equal(state, 'review');
  assert.equal(lookups, 1);
  assert.equal(items[0].scanDetections.length, 4);
  assert.equal(items[0].portion.amount, 0); // Visible zero, without inventing nutrition.
  assert.equal(items[0].calculatedNutrients, null);
});

test('lookup failure retains food and permits retry; stale lookup cannot replace a correction', async () => {
  let items = [{ ...pending(), referenceStatus: 'loading' }];
  const context = { referenceVersions: { current: new Map() }, mounted: { current: true },
    setMealItems: update => { items = update(items); },
    mealService: { getNutritionForFood: async () => { throw new Error('offline'); } },
    createEstimatedPreviewItem: estimates.createEstimatedPreviewItem, console: { error() {} } };
  const run = handler(screenFile, 'loadNutritionForItem', context);
  await run(items[0]);
  assert.equal(items[0].referenceStatus, 'error');
  const response = deferred();
  context.mealService.getNutritionForFood = () => response.promise;
  const loading = run(items[0]);
  context.referenceVersions.current.set(items[0].id, 3); // User selected another food.
  response.resolve(rice);
  await loading;
  assert.equal(items[0].portion, null);
});

test('correction search ignores a stale response when its modal closes', async () => {
  const source = sourceFile(screenFile);
  const effect = findNodes(source, node => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes('Food correction search failed:'))[0].arguments[0];
  const response = deferred();
  let runSearch, results;
  const query = { select() { return this; }, ilike() { return this; }, limit() { return response.promise; } };
  const start = vm.runInNewContext(ts.transpileModule(`(${effect.getText(source)})`, { compilerOptions }).outputText, {
    isSearchModalVisible: true, searchQuery: 'Rice', supabase: { from: () => query }, setSearchError() {}, setIsSearching() {},
    setSearchResults: value => { results = value; }, setTimeout: fn => { runSearch = fn; return 1; }, clearTimeout() {}, console,
  });
  const cleanup = start();
  const running = runSearch();
  cleanup();
  response.resolve({ data: [{ food_id: 'white_rice' }], error: null });
  await running;
  assert.equal(results, undefined);
});

test('search service errors are shown separately from an empty search result', async () => {
  const source = sourceFile(screenFile);
  const effect = findNodes(source, node => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes('Food correction search failed:'))[0].arguments[0];
  let runSearch, message, searching;
  const query = { select() { return this; }, ilike() { return this; }, limit: async () => ({ data: null, error: { message: 'offline' } }) };
  const start = vm.runInNewContext(ts.transpileModule(`(${effect.getText(source)})`, { compilerOptions }).outputText, {
    isSearchModalVisible: true, searchQuery: 'Rice', supabase: { from: () => query },
    setSearchError: value => { message = value; }, setIsSearching: value => { searching = value; }, setSearchResults() {},
    setTimeout: fn => { runSearch = fn; return 1; }, clearTimeout() {}, console: { error() {} },
  });
  const cleanup = start();
  await runSearch();
  cleanup();
  assert.match(message, /Food search is unavailable/);
  assert.equal(searching, false);
});

test('portion modal explains reference units and does not auto-confirm on render', () => {
  const Modal = load('src/components/ui/QuantityEditModal.tsx').QuantityEditModal;
  for (const [serving, unitText] of [['100 g', 'grams'], ['1 piece', 'pieces'], ['1 cup', 'cups']]) {
    const food = { ...rice, referenceBasis: calculator.parseReferenceBasis(serving) };
    const html = renderToStaticMarkup(React.createElement(Modal, { visible: true, food, foodName: 'Test food',
      initialAmount: null, initialUnit: null, onSave: () => assert.fail('Portion auto-confirmed'), onCancel() {} }));
    assert.match(html, new RegExp(unitText));
    assert.match(html, /Enter amount/);
    assert.match(html, /Nutrition reference:/);
  }
  const missing = renderToStaticMarkup(React.createElement(Modal, { visible: true, food: null, foodName: 'Unmapped food',
    initialAmount: null, initialUnit: null, onSave: () => assert.fail('Missing reference confirmed'), onCancel() {} }));
  assert.match(missing, /Nutrition is unavailable/);
  assert.match(missing, /aria-disabled="true"/);
});

test('actual meal service distinguishes lookup failures from unmapped food and keeps saving blocked', async () => {
  const service = load('src/services/mealService.ts').mealService;
  lookupResponse = { data: null, error: { message: 'Test network error', code: 'TEST' } };
  await assert.rejects(service.getNutritionForFood('white_rice'), /Food nutrition lookup failed/);
  lookupResponse = { data: null, error: null };
  assert.equal(await service.getNutritionForFood('unknown_food'), null);
  assert.deepEqual(databaseReads, [['food_id', 'white_rice'], ['food_id', 'unknown_food']]);
  const reads = databaseReads.length;
  await assert.rejects(service.saveMealSession('synthetic-user', 'Lunch', new Date(), [pending()]), /Confirmed meal portions cannot be saved/);
  assert.equal(databaseReads.length, reads, 'Preview saving must not access the database');
});

test('detection selection and correction controls keep confidence and exact IDs', () => {
  const { DetectionResultCard } = load('src/components/ui/DetectionResultCard.tsx');
  let toggled = false, opened = false, correction;
  const card = DetectionResultCard({ foodName: 'white_rice', confidence: 0.83, isSelected: true,
    onToggle: () => { toggled = true; }, onOpenCorrection: () => { opened = true; },
    foodIdOptions: ['white_rice', 'brown_rice'], onCorrectFood: id => { correction = id; } });
  const buttons = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === nativeWeb.TouchableOpacity) buttons.push(node);
    React.Children.forEach(node.props?.children, visit);
  }
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node?.props ? '' : React.Children.toArray(node.props.children).map(text).join('');
  visit(card);
  buttons.find(button => button.props.accessibilityRole === 'checkbox').props.onPress();
  buttons.find(button => text(button).includes('Search to correct')).props.onPress();
  buttons.find(button => text(button) === 'brown rice').props.onPress();
  assert.equal(toggled, true);
  assert.equal(opened, true);
  assert.equal(correction, 'brown_rice');
  assert.match(text(card), /83%/);
});

test('web portion editor tracks keyboard viewport changes and removes its listener', () => {
  const source = sourceFile('src/components/ui/QuantityEditModal.tsx');
  const effect = findNodes(source, node => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes('window.visualViewport'))[0].arguments[0];
  let resize, removed;
  const heights = [];
  const viewport = { height: 568, addEventListener: (_, handler) => { resize = handler; }, removeEventListener: (_, handler) => { removed = handler; } };
  const start = vm.runInNewContext(ts.transpileModule(`(${effect.getText(source)})`, { compilerOptions }).outputText, {
    visible: true, Platform: { OS: 'web' }, window: { visualViewport: viewport }, setWebViewportHeight: height => heights.push(height),
  });
  const cleanup = start();
  viewport.height = 280;
  resize();
  cleanup();
  assert.deepEqual(heights, [568, 280]);
  assert.equal(removed, resize);
});

test('adding a food brings the plate into view without opening or confirming a portion', () => {
  const source = sourceFile(screenFile);
  const effect = findNodes(source, node => ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' &&
    node.arguments[0]?.getText(source).includes('previousPlateCount.current'))[0].arguments[0];
  const scrolls = [];
  const items = [pending()];
  const run = vm.runInNewContext(ts.transpileModule(`(${effect.getText(source)})`, { compilerOptions }).outputText, {
    mealItems: items, previousPlateCount: { current: 0 }, plateTop: { current: 280 }, scrollRef: { current: { scrollTo: value => scrolls.push(value.y) } },
  });
  run();
  run(); // A confirmation/rerender without a new food must not jump the page.
  assert.deepEqual(scrolls, [280]);
  assert.equal(items[0].portion, null);
});

// SYNTHETIC box fixtures: algorithm tests, not real YOLO outputs or count validation.
const fourRolls = [0, 1, 2, 3].map(index => ({ food_id: 'vegetable_roll', confidence: 0.9,
  box: [index * 100, 0, index * 100 + 60, 80] }));
const roll = calculator.mapFoodNutritionRecord({ food_id: 'vegetable_roll', display_name: 'Vegetable Roll', serving_unit: '1 piece (70g)',
  carbs_g: 22, sugar_g: 1.4, fiber_g: 1.8, fat_g: 9.5, iron_mg: 0.8, calcium_mg: 18 });
const makeRoll = (detections = fourRolls) => estimates.createEstimatedPreviewItem('roll-1', roll, roll.foodId, 0.9, detections);

test('detector boxes do not imply item count; a piece reference starts at zero', () => {
  const item = makeRoll();
  assert.equal(item.portion.amount, 0);
  assert.equal(item.portion.unit, 'piece');
  assert.equal(item.portion.confirmedByUser, false);
  assert.equal(item.quantity.provenance, 'quantity_unknown');
  assert.equal(item.calculatedNutrients, null);
  const html = renderPlate([item]);
  assert.match(html, /Tap \+ to select your portion/);
  assert.match(html, /How many did you eat\?/);
  assert.match(html, /value="0"/);
  assert.match(html, /Decrease pieces for Vegetable Roll/);
  assert.match(html, /Increase pieces for Vegetable Roll/);
  assert.match(html, /aria-disabled="true"[^>]*Decrease pieces for Vegetable Roll/);
  assert.doesNotMatch(html, /Confirmed by you|Confirm Portion/);
});

test('unmapped chicken cutlet renders an inline stepper without fabricated nutrients', () => {
  const item = estimates.createEstimatedPreviewItem('cutlet-1', null, 'chicken_cutlet', 0.9);
  item.referenceStatus = 'unmapped';
  assert.equal(item.portion.amount, 0);
  assert.equal(item.calculatedNutrients, null);
  const html = renderToStaticMarkup(React.createElement(plate, { items: [item], mealType: 'Lunch',
    onRemoveItem() {}, onUpdateQuantity() {}, onEditFood() {} }));
  assert.match(html, /Quantity/);
  assert.match(html, /Decrease pieces for chicken_cutlet/);
  assert.match(html, /Increase pieces for chicken_cutlet/);
  assert.match(html, /value="0"/);
  assert.match(html, /Nutrition reference required/);
  assert.match(html, /Choose Nutrition Reference/);
  assert.doesNotMatch(html, /Carbs [\d.]|Sugar [\d.]/);
  const two = estimates.adjustEstimatedQuantity(item, 2, 'piece');
  assert.equal(two.ok, true);
  assert.equal(two.item.portion.amount, 2);
  assert.equal(two.item.calculatedNutrients, null);
  assert.match(renderPlate([two.item]), /value="2"/);
  const one = estimates.adjustEstimatedQuantity(two.item, 1, 'piece');
  assert.equal(one.item.portion.amount, 1);
});

test('unrecognized food asks for a unit and amount without guessing piece count', () => {
  const item = estimates.createEstimatedPreviewItem('unknown-1', null, 'unknown_food', 0.8);
  const html = renderPlate([item]);
  assert.equal(item.portion, null);
  assert.match(html, /Measure unknown_food in piece/);
  assert.match(html, /Measure unknown_food in g/);
  assert.match(html, /Select a unit/);
  assert.doesNotMatch(html, /Increase pieces for unknown_food/);
});

test('a late nutrition lookup preserves the count chosen while it was loading', async () => {
  const response = deferred();
  let items = [{ ...estimates.createEstimatedPreviewItem('cutlet-1', null, 'chicken_cutlet', 0.9), referenceStatus: 'loading' }];
  const context = { referenceVersions: { current: new Map() }, mounted: { current: true },
    setMealItems: update => { items = update(items); },
    mealService: { getNutritionForFood: async () => response.promise },
    createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    adjustEstimatedQuantity: estimates.adjustEstimatedQuantity, console };
  const running = handler(screenFile, 'loadNutritionForItem', context)(items[0]);
  items[0] = estimates.adjustEstimatedQuantity(items[0], 2, 'piece').item;
  response.resolve(calculator.mapFoodNutritionRecord({ food_id: 'chicken_cutlet', display_name: 'Chicken Cutlet', serving_unit: '1 piece', carbs_g: 18 }));
  await running;
  assert.equal(items[0].portion.amount, 2);
  assert.equal(items[0].calculatedNutrients.carbsG, 36);
  assert.equal(items[0].referenceStatus, 'loaded');
});

test('duplicate boxes, containment and transitive duplicate chains are not double counted', () => {
  const duplicate = { ...fourRolls[0], box: [1, 1, 61, 81] };
  const nested = { ...fourRolls[0], box: [10, 10, 45, 65] };
  assert.equal(makeRoll([...fourRolls, duplicate, nested]).portion.amount, 0);
  const chain = [0, 10, 20].map(x => ({ ...fourRolls[0], box: [x, 0, 100 + x, 100] }));
  assert.equal(estimates.suggestDistinctCount(chain).count, null); // One merged cluster, not three items.
});

test('piece count stays zero regardless of uncertain detector counts', () => {
  for (const detections of [fourRolls.slice(0, 1), [{ ...fourRolls[0], box: [0, 0, 400, 400] }],
    [{ ...fourRolls[0], box: [0, 0, 100, 100] }, { ...fourRolls[0], box: [50, 0, 150, 100] }],
    [{ ...fourRolls[0], box: [1, 2, 0, 0] }, fourRolls[1]],
    [{ ...fourRolls[0], confidence: 0.3 }, fourRolls[1]], [{ ...fourRolls[0], box: undefined }, fourRolls[1]]]) {
    const item = makeRoll(detections);
    assert.equal(item.portion.amount, 0);
    assert.equal(item.calculatedNutrients, null);
    assert.equal(item.quantity.provenance, 'quantity_unknown');
    assert.equal(estimates.suggestDistinctCount(detections).count, null);
  }
});

test('two classes retain raw detections; dhal box count never becomes servings; cross-class conflicts downgrade counts', () => {
  const dhalBoxes = fourRolls.slice(0, 2).map(d => ({ ...d, food_id: 'dhal_curry', box: [d.box[0], 200, d.box[2], 280] }));
  const groups = estimates.groupDetectionEvidence([...fourRolls, ...dhalBoxes]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].detections.length, 4);
  const dhal = { ...rice, foodId: 'dhal_curry', referenceBasis: calculator.parseReferenceBasis('half cup (100g)') };
  const item = estimates.createEstimatedPreviewItem('dhal-1', dhal, dhal.foodId, 0.9, dhalBoxes);
  assert.equal(item.portion, null);
  assert.equal(item.quantity.provenance, 'quantity_unknown');
  assert.equal(estimates.suggestDistinctCount(fourRolls, [...fourRolls, { ...fourRolls[0], food_id: 'dhal_curry' }]).count, null);
});

test('adjustment to two pieces updates all nutrients without a default serving', () => {
  const result = estimates.adjustEstimatedQuantity(makeRoll(), 2, 'piece');
  assert.equal(result.ok, true);
  assert.equal(result.item.calculatedNutrients.carbsG, 44);
  assert.equal(result.item.calculatedNutrients.fatG, 19);
  assert.equal(result.item.portion.confirmedByUser, false);
  assert.equal(result.item.quantity.provenance, 'user_adjusted');
  assert.equal(result.item.quantity.initialSuggestion, null);
  assert.equal(calculator.confirmPortionForPreview(result.item, 2, 'piece').item.quantity.provenance, 'user_confirmed');
  assert.equal(estimates.adjustEstimatedQuantity(makeRoll(), 70, 'g').ok, false);
  assert.equal(estimates.adjustEstimatedQuantity(makeRoll(), Infinity, 'piece').ok, false);
  assert.equal(estimates.adjustEstimatedQuantity(makeRoll(), 1e308, 'piece').ok, false);
});

test('inline quantity changes scale 1 to 2 to 3 pieces and back independently per food', () => {
  const first = makeRoll();
  const second = { ...makeRoll(), id: 'roll-2' };
  assert.equal(first.portion.amount, 0);
  assert.equal(calculator.summarizeEstimatedMeal([first, second]).quantifiedCount, 0);
  const one = estimates.adjustEstimatedQuantity(first, 1, 'piece');
  assert.equal(one.item.calculatedNutrients.carbsG, 22);
  const oneHtml = renderPlate([one.item]);
  for (const label of ['Carbohydrates', 'Sugar', 'Fiber', 'Fat', 'Iron', 'Calcium']) assert.match(oneHtml, new RegExp(`${label}: [\\d.]+ (?:g|mg)`));
  assert.match(oneHtml, /Carbohydrates: 22\.0 g/);
  const two = estimates.adjustEstimatedQuantity(one.item, 2, 'piece');
  assert.equal(two.ok, true);
  assert.equal(two.item.calculatedNutrients.carbsG, 44);
  const three = estimates.adjustEstimatedQuantity(two.item, 3, 'piece');
  assert.equal(three.item.calculatedNutrients.carbsG, 66);
  const backToTwo = estimates.adjustEstimatedQuantity(three.item, 2, 'piece');
  assert.equal(backToTwo.item.calculatedNutrients.carbsG, 44);
  assert.equal(backToTwo.item.portion.amount, 2);
  assert.equal(second.portion.amount, 0);
  assert.equal(second.calculatedNutrients, null);
  const backToOne = estimates.adjustEstimatedQuantity(backToTwo.item, 1, 'piece');
  assert.equal(backToOne.item.calculatedNutrients.carbsG, 22);
  const zero = estimates.adjustEstimatedQuantity(backToOne.item, 0, 'piece');
  assert.equal(zero.item.portion.amount, 0);
  assert.equal(zero.item.calculatedNutrients, null);
  assert.equal(calculator.summarizeEstimatedMeal([zero.item, second]).quantifiedCount, 0);
  assert.doesNotMatch(renderPlate([zero.item]), /Carbohydrates:/);
});

test('missing and ambiguous bases, exact mapping, weight-only references and null nutrients stay honest', () => {
  for (const serving of [null, 'serving', '1 cup or 100g', '0 pieces']) {
    const food = { ...roll, referenceBasis: calculator.parseReferenceBasis(serving) };
    assert.equal(estimates.createEstimatedPreviewItem('unknown', food, roll.foodId, 0.9, fourRolls).portion.amount, 0);
  }
  const missing = estimates.createEstimatedPreviewItem('unknown', null, 'unmapped_food', 0.8, fourRolls);
  assert.equal(missing.foodId, 'unmapped_food');
  assert.equal(missing.nutritionRecord, null);
  assert.equal(estimates.createEstimatedPreviewItem('mismatch', roll, 'chicken_cutlet', 0.8, fourRolls).nutritionRecord, null);
  const grams = { ...roll, referenceBasis: calculator.parseReferenceBasis('100g') };
  assert.equal(estimates.createEstimatedPreviewItem('grams', grams, grams.foodId, 0.9, fourRolls).portion, null);
  const incomplete = { ...roll, nutrients: { ...roll.nutrients, ironMg: null, sugarG: 0 } };
  const item = estimates.adjustEstimatedQuantity(estimates.createEstimatedPreviewItem('partial', incomplete, incomplete.foodId, 0.9, fourRolls), 1, 'piece').item;
  assert.equal(item.calculatedNutrients.ironMg, null);
  assert.equal(item.calculatedNutrients.sugarG, 0);
  const summary = calculator.summarizeEstimatedMeal([item, missing]);
  assert.equal(summary.nutrients.carbsG, 22);
  assert.equal(summary.nutrients.ironMg, null);
  assert.equal(summary.unquantifiedCount, 1);
  assert.equal(summary.complete, false);
  assert.match(renderPlate([missing, item]), /Estimate includes 1 of 2 foods/);
});

test('actual inline change handler validates, recalculates and labels adjustment; reference-only cards exclude totals', () => {
  let items = [makeRoll()];
  const adjust = handler(screenFile, 'handleUpdateQuantity', {
    mealItems: items, adjustEstimatedQuantity: estimates.adjustEstimatedQuantity,
    setMealItems: fn => { items = fn(items); },
    Alert: { alert: () => assert.fail('Valid adjustment rejected') },
  });
  adjust('roll-1', 2, 'piece');
  assert.equal(items[0].calculatedNutrients.carbsG, 44);
  assert.match(renderPlate(items), /Adjusted by you/);
  const zero = handler(screenFile, 'handleUpdateQuantity', {
    mealItems: items, adjustEstimatedQuantity: estimates.adjustEstimatedQuantity,
    setMealItems: fn => { items = fn(items); }, Alert: { alert: () => assert.fail('Zero was rejected') },
  });
  zero('roll-1', 0, 'piece');
  assert.equal(items[0].portion.amount, 0);
  assert.equal(items[0].calculatedNutrients, null);
  const clear = handler(screenFile, 'handleUpdateQuantity', {
    mealItems: items, setMealItems: fn => { items = fn(items); },
  });
  clear('roll-1', null, 'piece');
  assert.equal(items[0].portion, null);
  assert.equal(items[0].calculatedNutrients, null);
  assert.match(renderPlate(items), /Choose an amount to see estimated nutrition/);
  assert.doesNotMatch(renderPlate(items), /Unavailable|Carbs/);
  const unknownRecord = { ...roll, referenceBasis: null };
  const unknown = estimates.createEstimatedPreviewItem('unknown-reference', unknownRecord, roll.foodId, 0.9, fourRolls.slice(0, 1));
  const html = renderPlate([unknown]);
  assert.doesNotMatch(html, /Reference only|Unavailable|Carbs/);
  assert.match(html, /Choose an amount to see estimated nutrition/);
  assert.match(html, /Choose your amount/);
});


test('inline input and preset handlers recalculate without a modal and reject invalid edits', () => {
  let current = makeRoll(), invalid, text;
  const context = { basis: roll.referenceBasis, unit: 'piece', setText: value => { text = value; }, setInvalid: value => { invalid = value; },
    onChange: (amount, unit) => { current = estimates.adjustEstimatedQuantity(current, amount, unit).item; },
    onClear: () => { current = { ...current, portion: null, calculatedNutrients: null, quantity: { ...current.quantity, provenance: 'quantity_unknown' } }; } };
  const update = handler('src/components/ui/InlineQuantityEditor.tsx', 'update', context);
  update('2');
  assert.equal(current.calculatedNutrients.carbsG, 44);
  assert.equal(current.quantity.provenance, 'user_adjusted');
  assert.equal(current.portion.confirmedByUser, false);
  for (const invalidText of ['', '-1', 'Infinity', '0x10', '1e3']) {
    update(invalidText);
    assert.equal(invalid, true);
    assert.equal(current.calculatedNutrients, null);
  }
  update('0');
  assert.equal(invalid, false);
  assert.equal(current.portion.amount, 0);
  assert.equal(current.calculatedNutrients, null);
  handler('src/components/ui/InlineQuantityEditor.tsx', 'choose', context)(3);
  assert.equal(invalid, false);
  assert.equal(text, '3');
  assert.equal(current.calculatedNutrients.carbsG, 66);
});

test('successful scan through actual lookup and calculator shows automatic real-reference estimates without clinical warnings', async () => {
  let items = [];
  const context = { scanRequestId: { current: 0 }, referenceVersions: { current: new Map() }, mounted: { current: true },
    setImageUri() {}, setImageAspectRatio() {}, setErrorMsg() {}, setScanState() {}, setIsLookingUp() {},
    setMealItems: update => { items = update(items); },
    groupDetectionEvidence: estimates.groupDetectionEvidence, createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    adjustEstimatedQuantity: estimates.adjustEstimatedQuantity,
    ImageManipulator: { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async () => ({ uri: 'synthetic-test', width: 640, height: 480 }) },
    analyzeMealImage: async () => ({ success: true, count: 4, detections: fourRolls }),
    mealService: { getNutritionForFood: async id => { assert.equal(id, 'vegetable_roll'); return roll; } }, console };
  context.loadNutritionForItem = handler(screenFile, 'loadNutritionForItem', context);
  await handler(screenFile, 'processImage', context)('synthetic-test');
  assert.equal(items.length, 1);
  assert.equal(items[0].referenceStatus, 'loaded');
  assert.equal(items[0].portion.amount, 0);
  assert.equal(items[0].calculatedNutrients, null);
  assert.equal(items[0].quantity.provenance, 'quantity_unknown');
  assert.doesNotMatch(fs.readFileSync(path.join(root, screenFile), 'utf8'), /Sugar Limit|High Risk GDM should keep|Target Exceeded/);
});

test('manual identity correction replaces nutrition, clears automatic count and preserves exact ID', () => {
  let items = [makeRoll()], modal, correction;
  const context = { correctionCandidateId: 'roll-1', mealItems: items, referenceVersions: { current: new Map() },
    mapFoodNutritionRecord: calculator.mapFoodNutritionRecord, createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    setMealItems: update => { items = update(items); }, setCorrectionCandidateId: value => { correction = value; },
    setIsSearchModalVisible: value => { modal = value; }, setSearchQuery() {}, setSearchResults() {} };
  handler(screenFile, 'handleSelectManualFood', context)({ food_id: 'white_rice', display_name: 'White Rice', serving_unit: '1 cup', carbs_g: 40 });
  assert.equal(items.length, 1);
  assert.equal(items[0].foodId, 'white_rice');
  assert.equal(items[0].portion, null);
  assert.equal(items[0].quantity.provenance, 'quantity_unknown');
  assert.equal(items[0].confidence, null);
  assert.equal(items[0].rawDetections.length, 0);
  assert.equal(items[0].calculatedNutrients, null);
  assert.equal(modal, false);
  assert.equal(correction, null);
});

test('editing a food with the same reference unit preserves its chosen quantity and recalculates', () => {
  let items = [estimates.adjustEstimatedQuantity(makeRoll(), 2, 'piece').item];
  const context = { correctionCandidateId: 'roll-1', mealItems: items, referenceVersions: { current: new Map() },
    mapFoodNutritionRecord: calculator.mapFoodNutritionRecord, createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    adjustEstimatedQuantity: estimates.adjustEstimatedQuantity,
    setMealItems: update => { items = update(items); }, setCorrectionCandidateId() {}, setIsSearchModalVisible() {}, setSearchQuery() {}, setSearchResults() {} };
  handler(screenFile, 'handleSelectManualFood', context)({ food_id: 'chicken_cutlet', display_name: 'Chicken Cutlet', serving_unit: '1 piece', carbs_g: 18, sugar_g: 2, fiber_g: 1, fat_g: 5, iron_mg: 1, calcium_mg: 10 });
  assert.equal(items[0].portion.amount, 2);
  assert.equal(items[0].portion.unit, 'piece');
  assert.equal(items[0].calculatedNutrients.carbsG, 36);
});

test('choosing a valid reference after an unmatched count preserves two pieces', () => {
  const unmatched = estimates.createEstimatedPreviewItem('cutlet-1', null, 'chicken_cutlet', 0.9);
  let items = [estimates.adjustEstimatedQuantity(unmatched, 2, 'piece').item];
  const context = { correctionCandidateId: 'cutlet-1', mealItems: items, referenceVersions: { current: new Map() },
    mapFoodNutritionRecord: calculator.mapFoodNutritionRecord, createEstimatedPreviewItem: estimates.createEstimatedPreviewItem,
    adjustEstimatedQuantity: estimates.adjustEstimatedQuantity,
    setMealItems: update => { items = update(items); }, setCorrectionCandidateId() {}, setIsSearchModalVisible() {}, setSearchQuery() {}, setSearchResults() {} };
  handler(screenFile, 'handleSelectManualFood', context)({ food_id: 'chicken_cutlet', display_name: 'Chicken Cutlet', serving_unit: '1 piece', carbs_g: 18 });
  assert.equal(items[0].portion.amount, 2);
  assert.equal(items[0].calculatedNutrients.carbsG, 36);
  assert.equal(items[0].quantity.provenance, 'user_adjusted');
});

test('unknown and quantified foods remain distinct and disclaimer appears once', () => {
  const unknown = estimates.createEstimatedPreviewItem('unknown', { ...roll, referenceBasis: null }, roll.foodId, 0.9, fourRolls.slice(0, 1));
  const html = renderPlate([estimates.adjustEstimatedQuantity(makeRoll(), 1, 'piece').item, unknown]);
  assert.match(html, /Estimate includes 1 of 2 foods/);
  assert.doesNotMatch(html, /unknown portions excluded|foods included/);
  assert.equal(html.split('මෙහි පෙන්වන පෝෂණ අගයන්').length - 1, 1);
});
