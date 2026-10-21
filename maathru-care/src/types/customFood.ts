export type CustomFoodVerificationStatus = 'unverified' | 'verified' | 'rejected';
export type CustomFoodNutrientValues = Record<string, number | null>;

/** Database row. Authenticated ownership and verification are server/database controlled. */
export interface UserCustomFood {
  id: string;
  owner_id: string;
  food_id: string;
  display_name: string;
  english_name: string | null;
  sinhala_name: string | null;
  category: string | null;
  serving_unit: string | null;
  carbs_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  iron_mg: number | null;
  calcium_mg: number | null;
  gi_index: number | null;
  other_nutrients: CustomFoodNutrientValues;
  verification_status: CustomFoodVerificationStatus;
  created_at: string;
  updated_at: string;
}

/** Form draft includes a UI-only catalog map which the service splits on save. */
export interface CustomFoodInput {
  display_name: string;
  english_name?: string | null;
  sinhala_name?: string | null;
  category?: string | null;
  serving_unit?: string | null;
  nutrition_values?: CustomFoodNutrientValues;
}
