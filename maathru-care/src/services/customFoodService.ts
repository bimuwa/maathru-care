import { nutritionApi } from '@/services/nutritionApi';
import type { CustomFoodInput, UserCustomFood } from '@/types/customFood';
import { NUTRIENT_DEFINITIONS, validateNutrientValues } from '@/services/nutrientCatalog';

function cleanInput(input: CustomFoodInput) {
  const display_name = input.display_name.trim().replace(/\s+/g, ' ');
  if (!display_name) throw new Error('Enter a food name.');
  if (display_name.length > 100) throw new Error('Food names must be 100 characters or fewer.');
  const optional = (value?: string | null) => value?.trim().replace(/\s+/g, ' ') || null;
  const nutritionValues = input.nutrition_values ?? {};
  const nutritionError = validateNutrientValues(nutritionValues);
  if (nutritionError) throw new Error(nutritionError);
  const mainValues: Record<string, number | null> = {};
  const otherNutrients: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(nutritionValues)) {
    const definition = NUTRIENT_DEFINITIONS.find((item) => item.key === key);
    if (!definition) throw new Error('This nutrition field is not supported.');
    if (definition.mainField) mainValues[definition.mainField] = value ?? null;
    else otherNutrients[key] = value ?? null;
  }
  return {
    display_name,
    english_name: optional(input.english_name),
    sinhala_name: optional(input.sinhala_name),
    category: optional(input.category),
    serving_unit: optional(input.serving_unit),
    ...(input.nutrition_values !== undefined ? {
      ...Object.fromEntries(['carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg', 'gi_index'].map((key) => [key, mainValues[key] ?? null])),
      other_nutrients: otherNutrients,
    } : {}),
  };
}

export function customFoodNutritionValues(food: Pick<UserCustomFood, 'carbs_g' | 'sugar_g' | 'fiber_g' | 'fat_g' | 'iron_mg' | 'calcium_mg' | 'gi_index' | 'other_nutrients'>) {
  const values: Record<string, number | null> = { ...(food.other_nutrients ?? {}) };
  for (const definition of NUTRIENT_DEFINITIONS) {
    if (!definition.mainField) continue;
    const value = food[definition.mainField];
    if (value !== null && value !== undefined) values[definition.key] = value;
  }
  return values;
}

export const customFoodService = {
  async list(): Promise<UserCustomFood[]> {
    return nutritionApi.request<UserCustomFood[]>('/foods/custom');
  },
  async search(query: string): Promise<UserCustomFood[]> {
    const term = query.trim().toLocaleLowerCase();
    if (term.length < 2) return [];
    const params = new URLSearchParams({ q: term });
    return nutritionApi.request<UserCustomFood[]>(`/foods/custom/search?${params.toString()}`);
  },
  async create(input: CustomFoodInput): Promise<UserCustomFood> {
    return nutritionApi.request<UserCustomFood>('/foods/custom', { method: 'POST', body: JSON.stringify(cleanInput(input)) });
  },
  async update(id: string, input: CustomFoodInput): Promise<UserCustomFood> {
    if (!id) throw new Error('This saved food could not be identified. Refresh My Foods and try again.');
    return nutritionApi.request<UserCustomFood>(`/foods/custom/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(cleanInput(input)) });
  },
  async remove(id: string): Promise<void> {
    if (!id) throw new Error('This saved food could not be identified. Refresh My Foods and try again.');
    await nutritionApi.request<void>(`/foods/custom/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
