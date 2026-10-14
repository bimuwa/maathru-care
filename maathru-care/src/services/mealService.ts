import { supabase } from '../lib/supabase';
import { MealItem } from '../types/meal';

export const mealService = {
  async getNutritionForFood(foodId: string) {
    // 1. Log the raw label from YOLO
    console.log(`[YOLO Detection] Raw label received: "${foodId}"`);

    // 2. Normalize: lowercase, spaces/hyphens → underscore, strip special chars
    const normalizedId = foodId.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
    console.log(`[DB Lookup] Querying maternal_foods with food_id = "${normalizedId}"`);

    // 3. Exact match on food_id
    const { data: exactData, error: exactError } = await supabase
      .from('maternal_foods')
      .select('*')
      .eq('food_id', normalizedId)
      .maybeSingle();

    if (exactError) {
      console.error(`[DB Error] Exact match failed: ${exactError.message} | code: ${exactError.code}`);
    }

    if (exactData) {
      console.log(`[DB Hit] Exact match found for "${normalizedId}"`);
      return exactData;
    }

    // 4. Fuzzy fallback: search display_name using ILIKE with the normalized label
    console.warn(`[DB Miss] No exact match for "${normalizedId}". Trying fuzzy match on display_name...`);
    const fuzzyTerm = normalizedId.replace(/_/g, ' ');

    const { data: fuzzyData, error: fuzzyError } = await supabase
      .from('maternal_foods')
      .select('*')
      .ilike('display_name', `%${fuzzyTerm}%`)
      .limit(1)
      .maybeSingle();

    if (fuzzyError) {
      console.error(`[DB Error] Fuzzy match failed: ${fuzzyError.message} | code: ${fuzzyError.code}`);
      return null;
    }

    if (fuzzyData) {
      console.log(`[DB Hit] Fuzzy match found: "${(fuzzyData as any).food_id}" for query "${fuzzyTerm}"`);
    } else {
      console.warn(`[DB Miss] No fuzzy match found for "${fuzzyTerm}". Food not in maternal_foods table.`);
    }

    return fuzzyData ?? null;
  },


  async saveMealSession(userId: string, mealType: string, date: Date, items: MealItem[]) {
    if (items.length === 0) throw new Error('No items to save');

    // Calculate totals
    const totals = items.reduce(
      (acc, item) => ({
        carbs: acc.carbs + item.carbsG * item.servingMultiplier,
        sugar: acc.sugar + item.sugarG * item.servingMultiplier,
        fiber: acc.fiber + item.fiberG * item.servingMultiplier,
        fat: acc.fat + item.fatG * item.servingMultiplier,
        iron: acc.iron + item.ironMg * item.servingMultiplier,
        calcium: acc.calcium + item.calciumMg * item.servingMultiplier,
      }),
      { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 }
    );

    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // 1. Insert Meal Log
    const { data: logData, error: logError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        meal_type: mealType,
        logged_date: localDateStr,
        total_carbs_g: totals.carbs,
        total_sugar_g: totals.sugar,
        total_fiber_g: totals.fiber,
        total_fat_g: totals.fat,
        total_iron_mg: totals.iron,
        total_calcium_mg: totals.calcium,
      })
      .select()
      .single();

    if (logError || !logData) {
      console.error('Error saving meal log:', logError);
      throw new Error('Failed to save meal session.');
    }

    // 2. Insert Meal Items using logData.id
    const itemsToInsert = items.map((item) => ({
      meal_log_id: logData.id,
      food_id: item.foodId,
      item_name: item.name,
      image_uri: item.imageUri || null,
      serving_multiplier: item.servingMultiplier,
      carbs_g: item.carbsG,
      sugar_g: item.sugarG,
      fiber_g: item.fiberG,
      fat_g: item.fatG,
      iron_mg: item.ironMg,
      calcium_mg: item.calciumMg,
    }));

    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error saving meal items:', itemsError);
      // Depending on strictness, we might want to delete the log if items fail
      // but if Supabase handles this via a Postgres RPC function in the future, it would be a true transaction.
      // For now, if items fail, it's an incomplete log. We can clean it up manually if needed.
      await supabase.from('meal_logs').delete().eq('id', logData.id);
      throw new Error('Failed to save meal items. Session rolled back.');
    }

    return logData;
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
