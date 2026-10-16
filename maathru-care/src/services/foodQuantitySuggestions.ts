import {
  calculateEstimatedPortion, createPortionPreviewItem, NUTRITION_CALCULATION_VERSION,
  type FoodNutritionRecord, type PortionPreviewItem, type PortionUnit, type QuantityEvidence,
} from './nutritionCalculator';

export interface RawFoodDetection {
  food_id: string;
  confidence: number;
  box?: [number, number, number, number];
}
export interface DetectionGroup {
  foodId: string;
  confidence: number;
  detections: RawFoodDetection[];
}

/** Retain every original box. Identity grouping must not destroy count evidence. */
export function groupDetectionEvidence(detections: readonly RawFoodDetection[]): DetectionGroup[] {
  const groups = new Map<string, DetectionGroup>();
  for (const detection of detections) {
    const foodId = typeof detection.food_id === 'string' ? detection.food_id.trim() : '';
    if (!foodId) continue;
    const key = foodId.toLowerCase();
    const group = groups.get(key) ?? { foodId, confidence: 0, detections: [] };
    group.detections.push(detection);
    if (Number.isFinite(detection.confidence)) group.confidence = Math.max(group.confidence, detection.confidence);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function validBox(box: RawFoodDetection['box']): box is NonNullable<RawFoodDetection['box']> {
  return Array.isArray(box) && box.length === 4 && box.every(Number.isFinite) && box[0] >= 0 && box[1] >= 0 && box[2] > box[0] && box[3] > box[1];
}
function overlap(a: NonNullable<RawFoodDetection['box']>, b: NonNullable<RawFoodDetection['box']>) {
  const intersection = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return { iou: intersection / (areaA + areaB - intersection), contained: intersection / Math.min(areaA, areaB) };
}

export const COUNT_POLICY_VERSION = 'distinct-boxes-v1-experimental';
// These detector identities describe individual countable foods. This list
// supplies a UI unit only; it is never treated as a nutrition or weight source.
const COUNTABLE_DETECTED_FOODS = new Set(['chicken_cutlet', 'vegetable_roll', 'asmi', 'bun', 'egg']);
export function isKnownCountableFood(foodId: string): boolean {
  return COUNTABLE_DETECTED_FOODS.has(foodId.trim().toLowerCase().replace(/[\s-]+/g, '_'));
}
/** Heuristic eligibility thresholds, NOT calibrated probabilities of count accuracy. */
export function suggestDistinctCount(detections: readonly RawFoodDetection[], allDetections: readonly RawFoodDetection[] = detections): { count: number | null; reason: string } {
  if (!detections.length || detections.some((d) => !validBox(d.box) || !Number.isFinite(d.confidence) || d.confidence < 0.6 || d.confidence > 1)) {
    return { count: null, reason: 'Choose an amount: box evidence is missing or uncertain.' };
  }
  // Connected duplicate clusters avoid double counting A~B~C chains.
  const parent = detections.map((_, i) => i);
  const root = (index: number): number => parent[index] === index ? index : (parent[index] = root(parent[index]));
  let ambiguous = false;
  for (let i = 0; i < detections.length; i++) {
    for (let j = i + 1; j < detections.length; j++) {
      const relation = overlap(detections[i].box!, detections[j].box!);
      if (relation.iou >= 0.65 || relation.contained >= 0.9) parent[root(j)] = root(i);
      else if (relation.contained > 0.1) ambiguous = true;
    }
    if (allDetections.some((other) => other.food_id.trim().toLowerCase() !== detections[i].food_id.trim().toLowerCase() && validBox(other.box) && overlap(detections[i].box!, other.box).contained > 0.5)) ambiguous = true;
  }
  const count = new Set(parent.map((_, i) => root(i))).size;
  if (ambiguous || count < 2 || count > 20) return { count: null, reason: 'Choose an amount: a group box or overlapping foods cannot establish an individual count.' };
  return { count, reason: 'Estimate from separate visible detections; missed items and group boxes remain possible. Adjust if needed.' };
}

export function createEstimatedPreviewItem(
  id: string, food: FoodNutritionRecord | null, foodId: string, confidence: number | null,
  detections: readonly RawFoodDetection[] = [], allDetections: readonly RawFoodDetection[] = detections,
): PortionPreviewItem & { quantity: QuantityEvidence } {
  if (food && food.foodId.trim().toLowerCase() !== foodId.trim().toLowerCase()) food = null;
  const item = createPortionPreviewItem(id, food, foodId, confidence);
  let reason = 'Choose a food with a documented serving reference.';
  const basis = food?.referenceBasis;
  const countable = basis?.unit === 'piece' || (!basis && isKnownCountableFood(foodId));
  if (countable) reason = 'Tap + to select your portion.';
  else if (basis?.unit === 'g') reason = 'Enter grams; the photo cannot measure weight.';
  else if (basis?.unit === 'cup') reason = 'Enter your cup amount; the photo cannot measure volume.';
  return {
    ...item,
    portion: countable ? { amount: 0, unit: 'piece', confirmedByUser: false } : null,
    calculatedNutrients: null,
    quantity: { provenance: 'quantity_unknown', initialSuggestion: null, reason, calculationVersion: NUTRITION_CALCULATION_VERSION },
  };
}

export function adjustEstimatedQuantity<T extends PortionPreviewItem>(item: T, amount: number, unit: PortionUnit) {
  if (amount === 0 && unit === 'piece' && (!item.nutritionRecord?.referenceBasis || item.nutritionRecord.referenceBasis.unit === 'piece')) {
    return { ok: true as const, item: { ...item, portion: { amount: 0, unit: 'piece', confirmedByUser: false }, calculatedNutrients: null,
      quantity: { ...item.quantity, provenance: 'quantity_unknown' as const, initialSuggestion: null,
        reason: 'Tap + to select your portion.', calculationVersion: NUTRITION_CALCULATION_VERSION } } };
  }
  if (!item.nutritionRecord?.referenceBasis) {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000 || (unit === 'piece' && !Number.isInteger(amount))) {
      return { ok: false as const, reason: 'invalid_amount' };
    }
    if (!['g', 'cup', 'piece'].includes(unit)) return { ok: false as const, reason: 'unsupported_unit' };
    return { ok: true as const, item: { ...item, portion: { amount, unit, confirmedByUser: false }, calculatedNutrients: null,
      quantity: { ...item.quantity, provenance: 'user_adjusted' as const, initialSuggestion: item.quantity?.initialSuggestion ?? null,
        reason: 'Amount adjusted by you. Nutrition is unavailable until a supported reference is selected.', calculationVersion: NUTRITION_CALCULATION_VERSION } } };
  }
  const result = calculateEstimatedPortion(item.nutritionRecord, { amount, unit });
  if (!result.ok) return result;
  return { ok: true as const, item: { ...item, portion: result.portion, calculatedNutrients: result.nutrients,
    quantity: { ...item.quantity, provenance: 'user_adjusted' as const, initialSuggestion: item.quantity?.initialSuggestion ?? null,
      reason: 'Amount adjusted by you; nutrition remains estimated.', calculationVersion: NUTRITION_CALCULATION_VERSION } } };
}
