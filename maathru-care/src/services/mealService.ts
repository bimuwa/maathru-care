import { supabase } from '../lib/supabase';
import { MealItem } from '../types/meal';
import { assertNewPortionPersistenceSupported, mapFoodNutritionRecord } from './nutritionCalculator';

const diarySelect = 'id, logged_date, meal_type, created_at, food_diary_items(id, item_name, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg)';

function toDiaryLog(meal: any) {
  const items = meal.food_diary_items ?? [];
  const sum = (key: string) => {
    const values = items.map((item: any) => item[key]);
    const known = values.filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value));
    return known.length ? known.reduce((total, value) => total + value, 0) : null;
  };
  const nutrientColumns = [
    ['carbs_g', 'total_carbs_g'], ['sugar_g', 'total_sugar_g'], ['fiber_g', 'total_fiber_g'],
    ['fat_g', 'total_fat_g'], ['iron_mg', 'total_iron_mg'], ['calcium_mg', 'total_calcium_mg'],
  ];
  const incomplete = nutrientColumns.filter(([itemKey]) => items.some((item: any) => item[itemKey] == null)).map(([, logKey]) => logKey);
  return {
    id: `diary:${meal.id}`,
    logged_date: meal.logged_date,
    meal_type: meal.meal_type,
    created_at: meal.created_at,
    total_carbs_g: sum('carbs_g'),
    total_sugar_g: sum('sugar_g'),
    total_fiber_g: sum('fiber_g'),
    total_fat_g: sum('fat_g'),
    total_iron_mg: sum('iron_mg'),
    total_calcium_mg: sum('calcium_mg'),
    incomplete_nutrients: incomplete,
    meal_items: items.map((item: any) => ({ ...item, item_name: item.item_name })),
  };
}

async function getDiaryLogs(dateFilter: (query: any) => any) {
  const query = supabase.from('food_diary_meals').select(diarySelect);
  const { data, error } = await dateFilter(query);
  if (error) {
    // Older deployments may not yet have the diary tables. Keep legacy reads usable.
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }
  return (data ?? []).map(toDiaryLog);
}

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
    try {
      const diary = await getDiaryLogs((query) => query.eq('logged_date', localDateStr).order('created_at', { ascending: true }));
      return [...(data ?? []), ...diary].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    } catch (diaryError) {
      console.error('Error fetching Food Diary readback:', diaryError);
      return data ?? [];
    }
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
    try {
      const diary = await getDiaryLogs((query) => query.gte('logged_date', sevenDaysAgoStr).lte('logged_date', todayStr).order('logged_date', { ascending: true }));
      return [...(data ?? []), ...diary].sort((a, b) => String(a.logged_date).localeCompare(String(b.logged_date)) || String(a.created_at).localeCompare(String(b.created_at)));
    } catch (diaryError) {
      console.error('Error fetching Food Diary trends:', diaryError);
      return data ?? [];
    }
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

    const legacyTotals = data.reduce(
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
    try {
      const diary = await getDiaryLogs((query) => query.eq('logged_date', localDateStr));
      return diary.reduce((acc: typeof legacyTotals, log: any) => ({
        carbs: acc.carbs + log.total_carbs_g,
        sugar: acc.sugar + log.total_sugar_g,
        fiber: acc.fiber + log.total_fiber_g,
        fat: acc.fat + log.total_fat_g,
        iron: acc.iron + log.total_iron_mg,
        calcium: acc.calcium + log.total_calcium_mg,
      }), legacyTotals);
    } catch (diaryError) {
      console.error('Error fetching Food Diary totals:', diaryError);
      return legacyTotals;
    }
  },
};
