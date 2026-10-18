/**
 * Nutrition calculation primitives shared by meal entry and daily totals.
 * Quantities are expressed in the same explicit unit as the food's reference
 * basis. This module intentionally does not infer quantity from detections or
 * convert between units.
 */

export const NUTRIENT_KEYS = [
  'carbsG',
  'sugarG',
  'fiberG',
  'fatG',
  'ironMg',
  'calciumMg',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type NutrientValues = Record<NutrientKey, number | null>;
export type PortionUnit = 'g' | 'piece' | 'cup';

export interface ReferenceBasis {
  amount: number;
  unit: PortionUnit;
  /** Original database value, retained for display and audit. */
  sourceText: string;
}

export interface FoodNutritionRecord {
  foodId: string;
  displayName: string;
  sourceServingUnit: string | null;
  referenceBasis: ReferenceBasis | null;
  nutrients: NutrientValues;
  dataIssues: string[];
}

export interface PortionInput {
  amount: number;
  unit: string;
  /** Must be set only after explicit user confirmation. */
  confirmedByUser: boolean;
}

export type CalculationError =
  | 'portion_not_confirmed'
  | 'invalid_amount'
  | 'unsupported_unit'
  | 'reference_basis_unknown'
  | 'unit_mismatch';

export type PortionCalculation =
  | {
      ok: true;
      scale: number;
      nutrients: NutrientValues;
      referenceBasis: ReferenceBasis;
      portion: { amount: number; unit: PortionUnit; confirmedByUser: true };
    }
  | { ok: false; reason: CalculationError };

export interface FoodDetectionIdentity {
  food_id: string;
  confidence: number;
}

export interface FoodCandidate {
  foodId: string;
  confidence: number;
  /** Null until the user confirms an amount. */
  confirmedPortion: null;
}

export interface PortionPreviewItem {
  id: string;
  foodId: string;
  name: string;
  confidence: number | null;
  nutritionRecord: FoodNutritionRecord | null;
  portion: PortionInput | null;
  calculatedNutrients: NutrientValues | null;
  quantity?: QuantityEvidence;
}

export type QuantityProvenance = 'ai_count_suggested' | 'standard_serving_assumed' | 'user_adjusted' | 'user_confirmed' | 'quantity_unknown' | 'legacy_unconfirmed';
export const NUTRITION_CALCULATION_VERSION = 'reference-scaling-v2';
export interface QuantityEvidence {
  provenance: QuantityProvenance;
  initialSuggestion: { amount: number; unit: PortionUnit; provenance: 'ai_count_suggested' | 'standard_serving_assumed' } | null;
  reason: string;
  calculationVersion: typeof NUTRITION_CALCULATION_VERSION;
}

/** Identity correction is explicit and swaps the nutrition record by exact ID. */
export function correctFoodCandidate(
  candidate: FoodCandidate,
  correctedFood: FoodNutritionRecord | null,
): FoodCandidate {
  return {
    ...candidate,
    foodId: correctedFood?.foodId ?? candidate.foodId,
    confirmedPortion: null,
  };
}

export function resolveCorrectedFoodId(detectedFoodId: string, correctedFoodId?: string | null): string {
  return correctedFoodId?.trim() || detectedFoodId.trim();
}

export function createPortionPreviewItem(
  id: string,
  food: FoodNutritionRecord | null,
  foodId: string,
  confidence: number | null,
): PortionPreviewItem {
  return {
    id,
    foodId: food?.foodId ?? foodId,
    name: food?.displayName ?? foodId,
    confidence,
    nutritionRecord: food,
    portion: null,
    calculatedNutrients: null,
  };
}

/** Recalculate immediately while requiring an explicit positive confirmation. */
export function confirmPortionForPreview<T extends PortionPreviewItem>(
  item: T,
  amount: number,
  unit: string,
): { ok: true; item: T } | { ok: false; reason: CalculationError } {
  if (!item.nutritionRecord) return { ok: false, reason: 'reference_basis_unknown' };
  const calculation = calculateConfirmedPortion(item.nutritionRecord, {
    amount,
    unit,
    confirmedByUser: true,
  });
  if (!calculation.ok) return calculation;
  return {
    ok: true,
    item: {
      ...item,
      portion: calculation.portion,
      calculatedNutrients: calculation.nutrients,
      ...(item.quantity ? { quantity: { ...item.quantity, provenance: 'user_confirmed' as const } } : {}),
    },
  };
}

/** New-format persistence stays disabled until the DB can store portion semantics. */
export const NEW_PORTION_PERSISTENCE_SUPPORTED = false;
export const NEW_PORTION_PERSISTENCE_BLOCKED_REASON =
  'Confirmed meal portions cannot be saved until the database stores amount, unit, reference basis, and confirmation status.';

export function assertNewPortionPersistenceSupported(): void {
  if (!NEW_PORTION_PERSISTENCE_SUPPORTED) throw new Error(NEW_PORTION_PERSISTENCE_BLOCKED_REASON);
}

const SUPPORTED_UNITS = new Set<PortionUnit>(['g', 'piece', 'cup']);

/**
 * Parse only explicit, narrowly defined bases found in the current export.
 * Embedded gram/ml notes are retained as part of sourceText but are not used
 * to convert cups or pieces to grams.
 */
export function parseReferenceBasis(value: string | null | undefined): ReferenceBasis | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  let match = text.match(/^100\s*g$/i);
  if (match) return { amount: 100, unit: 'g', sourceText: text };

  match = text.match(/^(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?)(?:\s*\((?:approx(?:imately)?\s*)?\d+(?:\.\d+)?\s*g\))?$/i);
  if (match) return { amount: Number(match[1]), unit: 'piece', sourceText: text };

  match = text.match(/^(\d+(?:\.\d+)?)\s*cups?(?:\s*\((?:approx(?:imately)?\s*)?\d+(?:\.\d+)?\s*(?:g|ml)(?:\s+cooked)?\))?$/i);
  if (match) return { amount: Number(match[1]), unit: 'cup', sourceText: text };

  match = text.match(/^half\s+cup(?:\s*\(\d+(?:\.\d+)?\s*g(?:\s+cooked)?\))?$/i);
  if (match) return { amount: 0.5, unit: 'cup', sourceText: text };

  return null;
}

function parseNutrient(value: unknown, field: NutrientKey, issues: string[]): number | null {
  if (value === null || value === undefined || value === '') {
    issues.push(`missing:${field}`);
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    issues.push(`invalid:${field}`);
    return null;
  }
  return parsed;
}

/** Map a Supabase row or CSV row without collapsing missing values into zero. */
export function mapFoodNutritionRecord(row: Record<string, unknown>): FoodNutritionRecord {
  const issues: string[] = [];
  const rawFoodId = row.food_id;
  const rawName = row.display_name;
  const rawServingUnit = row.serving_unit;
  const foodId = typeof rawFoodId === 'string' ? rawFoodId.trim() : '';
  const displayName = typeof rawName === 'string' ? rawName.trim() : '';
  const sourceServingUnit = typeof rawServingUnit === 'string' ? rawServingUnit.trim() : null;
  const referenceBasis = parseReferenceBasis(sourceServingUnit);

  if (!foodId) issues.push('missing:food_id');
  if (!displayName) issues.push('missing:display_name');
  if (!referenceBasis) issues.push('unknown:serving_unit');

  const nutrients = {} as NutrientValues;
  const sourceFields: Record<NutrientKey, string> = {
    carbsG: 'carbs_g',
    sugarG: 'sugar_g',
    fiberG: 'fiber_g',
    fatG: 'fat_g',
    ironMg: 'iron_mg',
    calciumMg: 'calcium_mg',
  };
  for (const key of NUTRIENT_KEYS) {
    nutrients[key] = parseNutrient(row[sourceFields[key]], key, issues);
  }

  return { foodId, displayName, sourceServingUnit, referenceBasis, nutrients, dataIssues: issues };
}

/** Exact ID lookup only; fuzzy name matching is intentionally excluded. */
export function findFoodById(
  foods: readonly FoodNutritionRecord[],
  foodId: string,
): FoodNutritionRecord | null {
  const requestedId = foodId.trim().toLowerCase();
  return foods.find((food) => food.foodId.toLowerCase() === requestedId) ?? null;
}

/**
 * Collapse repeated detections to food identities. The result has no numeric
 * quantity, so callers cannot accidentally treat the detection count as a
 * portion amount.
 */
export function groupFoodDetections(detections: readonly FoodDetectionIdentity[]): FoodCandidate[] {
  const byId = new Map<string, FoodCandidate>();
  for (const detection of detections) {
    const foodId = detection.food_id.trim();
    if (!foodId) continue;
    const key = foodId.toLowerCase();
    const previous = byId.get(key);
    if (!previous) {
      byId.set(key, {
        foodId,
        confidence: Number.isFinite(detection.confidence) ? detection.confidence : 0,
        confirmedPortion: null,
      });
    } else if (Number.isFinite(detection.confidence)) {
      previous.confidence = Math.max(previous.confidence, detection.confidence);
    }
  }
  return [...byId.values()];
}

export function calculateConfirmedPortion(
  food: FoodNutritionRecord,
  portion: PortionInput,
): PortionCalculation {
  if (!portion || portion.confirmedByUser !== true) {
    return { ok: false, reason: 'portion_not_confirmed' };
  }
  const result = calculateEstimatedPortion(food, portion);
  return result.ok ? { ...result, portion: { ...result.portion, confirmedByUser: true } } : result;
}

/** Same reference scaling for estimates, without falsely asserting confirmation. */
export function calculateEstimatedPortion(
  food: FoodNutritionRecord,
  portion: Pick<PortionInput, 'amount' | 'unit'>,
): { ok: true; scale: number; nutrients: NutrientValues; referenceBasis: ReferenceBasis; portion: { amount: number; unit: PortionUnit; confirmedByUser: false } } | { ok: false; reason: CalculationError } {
  if (!Number.isFinite(portion.amount) || portion.amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (!SUPPORTED_UNITS.has(portion.unit as PortionUnit)) {
    return { ok: false, reason: 'unsupported_unit' };
  }
  if (!food.referenceBasis || !Number.isFinite(food.referenceBasis.amount) || food.referenceBasis.amount <= 0) {
    return { ok: false, reason: 'reference_basis_unknown' };
  }
  if (portion.unit !== food.referenceBasis.unit) {
    return { ok: false, reason: 'unit_mismatch' };
  }

  const unit = portion.unit as PortionUnit;
  const scale = portion.amount / food.referenceBasis.amount;
  if (!Number.isFinite(scale)) return { ok: false, reason: 'invalid_amount' };
  const nutrients = {} as NutrientValues;
  for (const key of NUTRIENT_KEYS) {
    const value = food.nutrients[key];
    nutrients[key] = value === null ? null : value * scale;
    if (nutrients[key] !== null && !Number.isFinite(nutrients[key])) return { ok: false, reason: 'invalid_amount' };
  }

  return {
    ok: true,
    scale,
    nutrients,
    referenceBasis: food.referenceBasis,
    portion: { amount: portion.amount, unit, confirmedByUser: false },
  };
}

/** Unknown foods are excluded explicitly; missing fields within quantified foods stay null. */
export function summarizeEstimatedMeal(items: readonly PortionPreviewItem[]) {
  const quantified = items.filter((item) => item.portion && item.calculatedNutrients);
  const nutrients = sumNutrition(quantified.map((item) => item.calculatedNutrients!));
  return {
    nutrients,
    quantifiedCount: quantified.length,
    unquantifiedCount: items.length - quantified.length,
    missingNutrients: NUTRIENT_KEYS.filter((key) => nutrients[key] === null),
    complete: quantified.length === items.length && items.length > 0 && NUTRIENT_KEYS.every((key) => nutrients[key] !== null),
  };
}

/** A nutrient total remains unknown if any included item is unknown for it. */
export function sumNutrition(values: readonly NutrientValues[]): NutrientValues {
  const total = {} as NutrientValues;
  for (const key of NUTRIENT_KEYS) {
    total[key] = values.length === 0 || values.some((value) => value[key] === null)
      ? null
      : values.reduce((sum, value) => sum + (value[key] as number), 0);
  }
  return total;
}

export interface LegacyMealItem {
  recordKind: 'legacy';
  foodId: string;
  itemName: string;
  /** Historical serving_multiplier, not a newly confirmed portion. */
  legacyMultiplier: number | null;
  portionStatus: 'legacy-unconfirmed';
  nutrientsPerStoredServing: NutrientValues;
  dataIssues: string[];
}

/** Preserve the old saved snapshot shape and make its unconfirmed status clear. */
export function readLegacyMealItem(row: Record<string, unknown>): LegacyMealItem {
  const issues: string[] = [];
  const rawMultiplier = row.serving_multiplier;
  const multiplier = rawMultiplier === null || rawMultiplier === undefined || rawMultiplier === ''
    ? null
    : typeof rawMultiplier === 'number' ? rawMultiplier : Number(rawMultiplier);
  const validMultiplier = multiplier !== null && Number.isFinite(multiplier) && multiplier >= 0
    ? multiplier
    : null;
  if (validMultiplier === null) issues.push('invalid:serving_multiplier');

  const nutrientsPerStoredServing = {} as NutrientValues;
  const sourceFields: Record<NutrientKey, string> = {
    carbsG: 'carbs_g',
    sugarG: 'sugar_g',
    fiberG: 'fiber_g',
    fatG: 'fat_g',
    ironMg: 'iron_mg',
    calciumMg: 'calcium_mg',
  };
  for (const key of NUTRIENT_KEYS) {
    nutrientsPerStoredServing[key] = parseNutrient(row[sourceFields[key]], key, issues);
  }

  return {
    recordKind: 'legacy',
    foodId: typeof row.food_id === 'string' ? row.food_id : '',
    itemName: typeof row.item_name === 'string' ? row.item_name : '',
    legacyMultiplier: validMultiplier,
    portionStatus: 'legacy-unconfirmed',
    nutrientsPerStoredServing,
    dataIssues: issues,
  };
}

/** Reproduce historical totals for readable legacy rows without calling them confirmed. */
export function calculateLegacyMealItem(item: LegacyMealItem): NutrientValues {
  const result = {} as NutrientValues;
  for (const key of NUTRIENT_KEYS) {
    const value = item.nutrientsPerStoredServing[key];
    result[key] = value === null || item.legacyMultiplier === null
      ? null
      : value * item.legacyMultiplier;
  }
  return result;
}
