import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

async function getAssignedDoctor(req: Request, res: Response, doctorId: string) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'A signed-in doctor session is required.' });
    return null;
  }
  const supabase = db.getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ success: false, error: 'Your session is invalid or expired.' });
    return null;
  }
  const { data: doctor, error } = await supabase.from('users')
    .select('id, role')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (error || !doctor || doctor.role !== 'doctor' || doctor.id !== doctorId) {
    res.status(403).json({ success: false, error: 'Only the signed-in doctor can review food labels.' });
    return null;
  }
  return { supabase, doctor };
}

// GET /:doctorId/patient/:patientId/custom-foods
router.get('/:doctorId/patient/:patientId/custom-foods', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId } = req.params;
    const context = await getAssignedDoctor(req, res, doctorId);
    if (!context) return;
    const { supabase } = context;
    const { data: patient, error: patientError } = await supabase.from('users')
      .select('id, full_name, auth_user_id, assigned_doctor_id')
      .eq('id', patientId).eq('assigned_doctor_id', doctorId).eq('role', 'mother').maybeSingle();
    if (patientError) throw patientError;
    if (!patient) { res.status(404).json({ success: false, error: 'This patient is not assigned to you.' }); return; }
    if (!patient.auth_user_id) { res.status(409).json({ success: false, error: 'This patient does not have a linked Auth account.' }); return; }
    const { data: foods, error } = await supabase.from('user_custom_foods')
      .select('id, owner_id, food_id, display_name, english_name, sinhala_name, category, serving_unit, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, gi_index, other_nutrients, verification_status, created_at, updated_at')
      .eq('owner_id', patient.auth_user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ success: true, patient: { id: patient.id, fullName: patient.full_name }, foods: foods ?? [] });
  } catch (error: any) {
    console.error('[Custom Food Review] List error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Could not load this patient’s food labels.' });
  }
});

// GET /:doctorId/patient/:patientId/food-diary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/:doctorId/patient/:patientId/food-diary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId } = req.params;
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : '';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : '';
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    if (!validDate(startDate) || !validDate(endDate) || startDate > endDate || Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`) > 31 * 86400000) {
      res.status(400).json({ success: false, error: 'Provide a valid date range of 31 days or fewer.' });
      return;
    }
    const context = await getAssignedDoctor(req, res, doctorId);
    if (!context) return;
    const { supabase } = context;
    const { data: patient, error: patientError } = await supabase.from('users')
      .select('id, full_name, auth_user_id')
      .eq('id', patientId).eq('assigned_doctor_id', doctorId).eq('role', 'mother').maybeSingle();
    if (patientError) throw patientError;
    if (!patient?.auth_user_id) { res.status(404).json({ success: false, error: 'This patient is not assigned to you or has no linked account.' }); return; }
    const { data: meals, error } = await supabase.from('food_diary_meals')
      .select('id, logged_date, meal_type, created_at, food_diary_items(id, food_id, item_name, portion_amount, portion_unit, portion_provenance, carbs_g, sugar_g, fiber_g, fat_g, iron_mg, calcium_mg, custom_food_verification_status, custom_food_nutrition_snapshot)')
      .eq('owner_id', patient.auth_user_id)
      .gte('logged_date', startDate).lte('logged_date', endDate)
      .order('logged_date', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    const customFoodIds = [...new Set((meals ?? []).flatMap((meal: any) => meal.food_diary_items ?? [])
      .map((item: any) => item.food_id).filter((foodId: any): foodId is string => typeof foodId === 'string' && foodId.startsWith('custom_')))];
    let statusByFoodId = new Map<string, string>();
    if (customFoodIds.length) {
      const { data: foods, error: foodError } = await supabase.from('user_custom_foods')
        .select('food_id, verification_status')
        .eq('owner_id', patient.auth_user_id).in('food_id', customFoodIds);
      if (foodError) throw foodError;
      statusByFoodId = new Map((foods ?? []).map((food: any) => [food.food_id, food.verification_status]));
    }
    const currentMeals = (meals ?? []).map((meal: any) => ({
      ...meal,
      food_diary_items: (meal.food_diary_items ?? []).map((item: any) => ({
        ...item,
        custom_food_verification_status: statusByFoodId.get(item.food_id) ?? item.custom_food_verification_status,
      })),
    }));
    res.status(200).json({ success: true, patient: { id: patient.id, fullName: patient.full_name }, meals: currentMeals });
  } catch (error: any) {
    console.error('[Eating Pattern] Diary error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Could not load this patient’s meal records.' });
  }
});

// PATCH /:doctorId/patient/:patientId/custom-foods/:foodId
router.patch('/:doctorId/patient/:patientId/custom-foods/:foodId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId, foodId } = req.params;
    const { verificationStatus } = req.body ?? {};
    if (!['verified', 'rejected'].includes(verificationStatus)) {
      res.status(400).json({ success: false, error: 'verificationStatus must be verified or rejected.' });
      return;
    }
    const context = await getAssignedDoctor(req, res, doctorId);
    if (!context) return;
    const { supabase } = context;
    const { data: patient, error: patientError } = await supabase.from('users')
      .select('auth_user_id')
      .eq('id', patientId).eq('assigned_doctor_id', doctorId).eq('role', 'mother').maybeSingle();
    if (patientError) throw patientError;
    if (!patient?.auth_user_id) { res.status(404).json({ success: false, error: 'This patient is not assigned to you.' }); return; }
    const { data: food, error } = await supabase.from('user_custom_foods')
      .update({ verification_status: verificationStatus, updated_at: new Date().toISOString() })
      .eq('id', foodId).eq('owner_id', patient.auth_user_id)
      .select('id, food_id, display_name, verification_status, updated_at').maybeSingle();
    if (error) throw error;
    if (!food) { res.status(404).json({ success: false, error: 'This food label does not belong to the assigned patient.' }); return; }
    res.status(200).json({ success: true, food });
  } catch (error: any) {
    console.error('[Custom Food Review] Update error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Could not update food verification.' });
  }
});

export default router;
