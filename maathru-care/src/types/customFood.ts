export interface UserCustomFood {
  id: string;
  food_id: string;
  display_name: string;
  english_name: string | null;
  sinhala_name: string | null;
  category: string | null;
  serving_unit: string | null;
  nutrition_values?: Record<string, number | null> | null;
  verification_status: 'unverified';
  created_at: string;
  updated_at: string;
}

export interface CustomFoodInput {
  display_name: string;
  english_name?: string | null;
  sinhala_name?: string | null;
  category?: string | null;
  serving_unit?: string | null;
  nutrition_values?: Record<string, number | null> | null;
}
