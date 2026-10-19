import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { MealItem } from '@/types/meal';
import { NUTRITION_CALCULATION_VERSION } from '@/services/nutritionCalculator';

/** Meal persistence shares the app-wide verified Supabase Auth session. */
export const foodDiarySupabase = supabase;

export interface SavedDiaryItem {
  id: string;
  food_id: string | null;
  item_name: string;
  portion_amount: number | null;
  portion_unit: string | null;
  portion_provenance: string;
  carbs_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  fat_g: number | null;
  iron_mg: number | null;
  calcium_mg: number | null;
}

export interface SavedDiaryMeal {
  id: string;
  logged_date: string;
  meal_type: string;
  created_at: string;
  food_diary_items: SavedDiaryItem[];
}

const diaryMealColumns = 'id, logged_date, meal_type, created_at, food_diary_items(id, food_id, item_name, portion_amount, portion_unit, portion_provenance, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg)';

export function newDiaryRequestId(): string {
  const cryptoObject = globalThis.crypto as Crypto | undefined;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function asNullableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializeItem(item: MealItem) {
  if (item.customFood && !item.portion) {
    const foodId = item.nutritionRecord?.foodId || item.foodId;
    if (!foodId.startsWith('custom_')) throw new Error('This custom food does not have a valid saved food ID.');
    return {
      food_id: foodId,
      item_name: item.nutritionRecord?.displayName || item.name,
      portion_amount: null,
      portion_unit: null,
      reference_amount: null,
      reference_unit: null,
      reference_description: null,
      portion_provenance: 'quantity_unknown',
      carbs_g: null, sugar_g: null, fiber_g: null, fat_g: null, iron_mg: null, calcium_mg: null,
      calculation_version: NUTRITION_CALCULATION_VERSION,
    };
  }
  if (!item.portion || !Number.isFinite(item.portion.amount) || item.portion.amount <= 0) {
    throw new Error('Select a portion greater than zero before saving a food.');
  }
  const record = item.nutritionRecord;
  if (!record?.foodId?.trim()) {
    throw new Error(`“${item.name}” has no exact food catalog match. Edit the food or remove it before saving.`);
  }
  const provenance = item.quantity?.provenance ?? (item.portion ? 'user_confirmed' : 'quantity_unknown');
  const mappedProvenance = provenance === 'ai_count_suggested' || provenance === 'standard_serving_assumed'
    ? 'estimated_suggested'
    : provenance;
  const portion = item.portion;
  const reference = record.referenceBasis;
  const estimated = mappedProvenance === 'quantity_unknown' ? null : item.calculatedNutrients;
  return {
    food_id: record.foodId,
    item_name: record.displayName || item.name,
    portion_amount: portion ? asNullableNumber(portion.amount) : null,
    portion_unit: portion?.unit ?? null,
    reference_amount: reference ? reference.amount : null,
    reference_unit: reference?.unit ?? null,
    reference_description: reference?.sourceText ?? null,
    portion_provenance: mappedProvenance,
    // These are already scaled consumed estimates. The server stores them as-is.
    carbs_g: asNullableNumber(estimated?.carbsG),
    sugar_g: asNullableNumber(estimated?.sugarG),
    fiber_g: asNullableNumber(estimated?.fiberG),
    fat_g: asNullableNumber(estimated?.fatG),
    iron_mg: asNullableNumber(estimated?.ironMg),
    calcium_mg: asNullableNumber(estimated?.calciumMg),
    calculation_version: item.quantity?.calculationVersion ?? NUTRITION_CALCULATION_VERSION,
  };
}

export const foodDiaryService = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await foodDiarySupabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async checkReady(): Promise<boolean> {
    const session = await this.getSession();
    if (!session?.user?.id) return false;
    const { data, error } = await foodDiarySupabase.rpc('food_diary_is_ready');
    if (error) return false;
    return data === true;
  },

  async signIn(email: string, password: string) {
    return foodDiarySupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  },

  async signUp(email: string, password: string) {
    return foodDiarySupabase.auth.signUp({ email: email.trim().toLowerCase(), password });
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    return foodDiarySupabase.auth.onAuthStateChange((_event, session) => callback(session));
  },

  async signOut() {
    const { error } = await foodDiarySupabase.auth.signOut();
    if (error) throw error;
  },

  async saveMeal(requestId: string, date: string, mealType: string, items: MealItem[]): Promise<string> {
    const selectedItems = items.filter((item) => (item.customFood && !item.portion) || (item.portion && Number.isFinite(item.portion.amount) && item.portion.amount > 0));
    if (selectedItems.length === 0) throw new Error('Tap + or enter an amount before saving a meal.');
    const session = await this.getSession();
    if (!session?.user?.id) throw new Error('Sign in to your Food Diary account before saving.');
    const payload = selectedItems.map(serializeItem);
    const { data, error } = await foodDiarySupabase.rpc('save_food_diary_meal', {
      p_idempotency_key: requestId,
      p_logged_date: date,
      p_meal_type: mealType,
      p_items: payload,
    });
    if (error) throw new Error(error.message || 'Could not save this meal. Please try again.');
    if (typeof data !== 'string' || !data) throw new Error('The database did not confirm the saved meal.');
    return data;
  },

  async getMealsForDate(date: string): Promise<SavedDiaryMeal[]> {
    const meals = await this.getMealsForRange(date, date);
    return meals.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getMealsForRange(startDate: string, endDate: string): Promise<SavedDiaryMeal[]> {
    const session = await this.getSession();
    if (!session?.user?.id) return [];
    const meals: SavedDiaryMeal[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await foodDiarySupabase.from('food_diary_meals')
        .select(diaryMealColumns)
        .eq('owner_id', session.user.id)
        .gte('logged_date', startDate)
        .lte('logged_date', endDate)
        .order('logged_date', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message || 'Could not load weekly Food Diary records.');
      meals.push(...((data ?? []) as SavedDiaryMeal[]));
      if (!data || data.length < pageSize) break;
    }
    return meals;
  },
};
