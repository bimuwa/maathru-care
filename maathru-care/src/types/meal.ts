import type { FoodNutritionRecord, NutrientValues, PortionInput, QuantityEvidence, QuantityProvenance, PortionUnit, ReferenceBasis } from '../services/nutritionCalculator';
import type { RawFoodDetection } from '../services/foodQuantitySuggestions';

export type ScanState =
  | 'idle'
  | 'camera'
  | 'preview'
  | 'compressing'
  | 'analyzing'
  | 'review'
  | 'error'
  | 'no_detection';

export interface MealItem {
  id: string;
  foodId: string;
  name: string;
  confidence: number | null;
  imageUri?: string;
  nutritionRecord: FoodNutritionRecord | null;
  portion: PortionInput | null;
  calculatedNutrients: NutrientValues | null;
  quantity?: QuantityEvidence;
  rawDetections?: RawFoodDetection[];
  scanDetections?: RawFoodDetection[];
  referenceStatus?: 'loading' | 'loaded' | 'unmapped' | 'error';
  customFood?: boolean;

  timestamp: number;
}

/** Design contract only. No writer or production schema supports this yet. */
export interface EstimatedMealItemSnapshotV2 {
  schema_version: 2;
  record_kind: 'estimated';
  food_id: string;
  detected_food_id: string | null;
  quantity_amount: number | null;
  quantity_unit: PortionUnit | null;
  quantity_provenance: Exclude<QuantityProvenance, 'legacy_unconfirmed'>;
  initial_suggestion: QuantityEvidence['initialSuggestion'];
  reference_basis: ReferenceBasis | null;
  reference_nutrients: NutrientValues | null;
  estimated_nutrients: NutrientValues | null;
  nutrition_source: { table: 'maternal_foods'; food_id: string; dataset_version: string | null } | null;
  calculation_version: string;
  count_policy_version: string | null;
  raw_detection_evidence: RawFoodDetection[] | null;
  user_confirmed_at: string | null;
  estimated_at: string;
}
