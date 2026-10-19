import { nutritionApi } from '@/services/nutritionApi';
import type { CustomFoodInput, UserCustomFood } from '@/types/customFood';
import { validateNutrientValues } from '@/services/nutrientCatalog';

function cleanInput(input: CustomFoodInput) {
  const display_name = input.display_name.trim().replace(/\s+/g, ' ');
  if (!display_name) throw new Error('Enter a food name.');
  if (display_name.length > 100) throw new Error('Food names must be 100 characters or fewer.');
  const optional = (value?: string | null) => value?.trim().replace(/\s+/g, ' ') || null;
  const nutritionValues = input.nutrition_values ?? {};
  const nutritionError = validateNutrientValues(nutritionValues);
  if (nutritionError) throw new Error(nutritionError);
  return {
    display_name,
    english_name: optional(input.english_name),
    sinhala_name: optional(input.sinhala_name),
    category: optional(input.category),
    serving_unit: optional(input.serving_unit),
    ...(input.nutrition_values !== undefined ? { nutrition_values: Object.fromEntries(Object.entries(nutritionValues).map(([key, value]) => [key, value ?? null])) } : {}),
  };
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
