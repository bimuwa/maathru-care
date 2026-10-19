import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

function localDevOnly(req: Request, res: Response, next: NextFunction) {
  const enabled = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DOCTOR_MOCK_MODE === 'true';
  const ip = req.ip?.replace(/^::ffff:/, '');
  const origin = req.get('origin');
  const allowedOrigin = !origin || ['http://localhost:8081', 'http://127.0.0.1:8081'].includes(origin);
  if (!enabled || !['127.0.0.1', '::1'].includes(ip ?? '') || !allowedOrigin || req.get('x-dev-doctor-mode') !== 'local-preview') {
    res.status(404).json({ success: false, error: 'Development doctor review is disabled.' });
    return;
  }
  next();
}

router.use(localDevOnly);

router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await db.getSupabase().from('users')
      .select('id, full_name, email, age, gestational_week, blood_group')
      .eq('role', 'mother').order('full_name', { ascending: true });
    if (error) throw error;
    res.json({ success: true, users: data ?? [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Could not load development patient list.' });
  }
});

router.get('/users/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = db.getSupabase();
    const { data: patient, error: patientError } = await supabase.from('users')
      .select('id, full_name, email, age, gestational_week, blood_group, auth_user_id')
      .eq('id', req.params.patientId).eq('role', 'mother').maybeSingle();
    if (patientError) throw patientError;
    if (!patient) { res.status(404).json({ success: false, error: 'Mother profile not found.' }); return; }
    if (!patient.auth_user_id) {
      res.json({ success: true, patient, foods: [], meals: [], warning: 'This profile is not linked to a Supabase Auth account, so it has no owner-scoped custom-food or diary records.' });
      return;
    }
    const [{ data: foods, error: foodError }, { data: meals, error: mealError }] = await Promise.all([
      supabase.from('user_custom_foods').select('id, owner_id, food_id, display_name, english_name, sinhala_name, category, serving_unit, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients, verification_status, created_at, updated_at')
        .eq('owner_id', patient.auth_user_id).order('created_at', { ascending: false }),
      supabase.from('food_diary_meals').select('id, logged_date, meal_type, created_at, food_diary_items(id, food_id, item_name, portion_amount, portion_unit, portion_provenance, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, custom_food_verification_status, custom_food_nutrition_snapshot)')
        .eq('owner_id', patient.auth_user_id).order('logged_date', { ascending: false }).limit(200),
    ]);
    if (foodError) throw foodError;
    if (mealError) throw mealError;
    const ids = [...new Set((meals ?? []).flatMap((meal: any) => meal.food_diary_items ?? [])
      .map((item: any) => item.food_id).filter((id: any) => typeof id === 'string' && id.startsWith('custom_')))];
    const { data: statuses, error: statusError } = ids.length
      ? await supabase.from('user_custom_foods').select('food_id, verification_status').eq('owner_id', patient.auth_user_id).in('food_id', ids)
      : { data: [], error: null };
    if (statusError) throw statusError;
    const statusMap = new Map((statuses ?? []).map((food: any) => [food.food_id, food.verification_status]));
    const resolvedMeals = (meals ?? []).map((meal: any) => ({ ...meal, food_diary_items: (meal.food_diary_items ?? []).map((item: any) => ({
      ...item, custom_food_verification_status: statusMap.get(item.food_id) ?? item.custom_food_verification_status,
    })) }));
    res.json({ success: true, patient, foods: foods ?? [], meals: resolvedMeals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Could not load development patient data.' });
  }
});

router.patch('/users/:patientId/custom-foods/:foodId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { verificationStatus } = req.body ?? {};
    if (!['verified', 'rejected'].includes(verificationStatus)) {
      res.status(400).json({ success: false, error: 'verificationStatus must be verified or rejected.' }); return;
    }
    const supabase = db.getSupabase();
    const { data: patient, error: patientError } = await supabase.from('users').select('auth_user_id')
      .eq('id', req.params.patientId).eq('role', 'mother').maybeSingle();
    if (patientError) throw patientError;
    if (!patient?.auth_user_id) { res.status(404).json({ success: false, error: 'Mother profile has no linked Auth account.' }); return; }
    const { data: food, error } = await supabase.from('user_custom_foods')
      .update({ verification_status: verificationStatus, updated_at: new Date().toISOString() })
      .eq('id', req.params.foodId).eq('owner_id', patient.auth_user_id)
      .select('id, food_id, display_name, verification_status, updated_at').maybeSingle();
    if (error) throw error;
    if (!food) { res.status(404).json({ success: false, error: 'Custom food label not found for this mother.' }); return; }
    res.json({ success: true, food });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Could not update label status.' });
  }
});

export default router;
