import { supabase } from '../lib/supabase';
import { MealItem } from '../types/meal';
import { assertNewPortionPersistenceSupported, mapFoodNutritionRecord } from './nutritionCalculator';

export const NEW_PORTION_SAVE_BLOCKED_REASON =
  'Meal saving is temporarily unavailable until the database can store the confirmed portion amount, unit, reference basis, and confirmation status. Your meal preview has not been saved.';

export const mealService = {
  async getNutritionForFood(foodId: string) {
    // YOLO labels use food_id. Exact IDs only prevent accidental substitutions.
    const exactId = foodId.trim();
    const { data: exactData, error: exactError } = await supabase
      .from('maternal_foods')
      .select('*')
      .eq('food_id', exactId)
      .maybeSingle();

    if (exactError) {
      console.error(`[DB Error] Exact match failed for "${exactId}": ${exactError.message} | code: ${exactError.code}`);
      throw new Error('Food nutrition lookup failed. Please try again.');
    }

    if (exactData) {
      return mapFoodNutritionRecord(exactData);
    }
    console.warn(`[DB Miss] No exact maternal_foods row for "${exactId}".`);
    return null;
  },


  async saveMealSession(userId: string, mealType: string, date: Date, items: MealItem[]) {
    if (items.length === 0) throw new Error('No items to save');
    void userId; void mealType; void date; void items;
    assertNewPortionPersistenceSupported();
  },

  async getDailyNutrition(userId: string, date: Date) {
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('meal_logs')
      .select(`
        *,
        meal_items (*)
      `)
      .eq('user_id', userId)
      .eq('logged_date', localDateStr);

    if (error) {
      console.error('Error fetching daily nutrition:', error);
      return [];
    }
    return data;
  },

  async getWeeklyTrends(userId: string) {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_date', sevenDaysAgoStr)
      .lte('logged_date', todayStr)
      .order('logged_date', { ascending: true });

    if (error) {
      console.error('Error fetching weekly trends:', error);
      return [];
    }
    return data;
  },

  /**
   * Returns the aggregated nutrition totals logged so far today.
   * Used by the pre-meal GDM warning check in detect.tsx.
   */
  async getTodayTotals(userId: string): Promise<{
    carbs: number; sugar: number; fiber: number; fat: number; iron: number; calcium: number;
  }> {
    const today = new Date();
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('meal_logs')
      .select('total_carbs_g, total_sugar_g, total_fiber_g, total_fat_g, total_iron_mg, total_calcium_mg')
      .eq('user_id', userId)
      .eq('logged_date', localDateStr);

    if (error || !data) {
      return { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 };
    }

    return data.reduce(
      (acc, log) => ({
        carbs:   acc.carbs   + (log.total_carbs_g   || 0),
        sugar:   acc.sugar   + (log.total_sugar_g   || 0),
        fiber:   acc.fiber   + (log.total_fiber_g   || 0),
        fat:     acc.fat     + (log.total_fat_g     || 0),
        iron:    acc.iron    + (log.total_iron_mg   || 0),
        calcium: acc.calcium + (log.total_calcium_mg || 0),
      }),
      { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 }
    );
  },
};
