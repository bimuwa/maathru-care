import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AiClientService } from '../services/aiClient.service.js';
import { db } from '../services/db.service.js';

const router = Router();

const MaternalRiskSchema = z.object({
  patientId: z.string().optional(),
  age: z.number().min(10).max(60),
  gravida: z.number().int().min(1).max(15),
  tetanusVaccination: z.number().int().min(0).max(10),
  gestationalAge: z.number().min(4).max(45),
  weightKg: z.number().min(30).max(200),
  heightFt: z.number().min(3.5).max(7.5),
  fetalPosition: z.number().int().min(0).max(1),
  fetalHeartRate: z.number().min(60).max(220),
  urineSugar: z.number().int().min(0).max(1),
  vdrl: z.number().int().min(0).max(1),
  hbsAg: z.number().int().min(0).max(1),
  systolicBP: z.number().min(60).max(240),
  diastolicBP: z.number().min(30).max(160),
});

// POST /api/v1/risk/predict
router.post('/predict', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = MaternalRiskSchema.parse(req.body);
    const patientId = validated.patientId || 'p-sarah-001';
    const supabase = db.getSupabase();

    const predictionResult = await AiClientService.predictRisk(validated);

    const assessment = {
      ...predictionResult,
      id: `ast-${Date.now()}`,
      patientId,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase risk_assessments
    await supabase.from('risk_assessments').insert({
      id: assessment.id,
      patient_id: patientId,
      risk_level: predictionResult.riskLevel,
      high_risk_probability: predictionResult.highRiskProbability,
      input_data: validated,
      shap_values: (predictionResult as any).shapValues,
      created_at: assessment.createdAt
    });

    // Update patient's current risk level in users table
    await supabase.from('users').update({
       current_risk_level: predictionResult.riskLevel,
       current_risk_probability: predictionResult.highRiskProbability,
       has_active_alert: predictionResult.isAlertRequired
    }).eq('id', patientId);

    // Auto-create an alert for the assigned doctor if risk is High or Very High
    if (predictionResult.isAlertRequired) {
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('patient_id', patientId)
        .eq('status', 'Pending');
      
      if (!existingAlerts || existingAlerts.length === 0) {
        const { data: patient } = await supabase
          .from('users')
          .select('full_name, assigned_doctor_id')
          .eq('id', patientId)
          .single();

        await supabase.from('alerts').insert({
          id: `alt-${Date.now()}`,
          patient_id: patientId,
          patient_name: patient?.full_name || 'Patient',
          patient_age: validated.age,
          gestational_age: validated.gestationalAge,
          doctor_id: patient?.assigned_doctor_id || 'doc-elizabeth-001',
          assessment_id: assessment.id,
          risk_level: predictionResult.riskLevel === 'Very High' ? 'Very High' : 'High',
          probability: predictionResult.highRiskProbability,
          alert_title: `${predictionResult.riskLevel} Maternal Risk Flagged (${predictionResult.highRiskProbability.toFixed(1)}%)`,
          alert_message: predictionResult.summary,
          status: 'Pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    res.status(200).json(assessment);
  } catch (err: any) {
    console.error('[RiskPredict Error]', err);
    res.status(400).json({ success: false, error: err.errors || err.message });
  }
});

// GET /api/v1/risk/history/:patientId
router.get('/history/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const supabase = db.getSupabase();
    
    const { data: history, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const mappedHistory = (history || []).map((h: any) => ({
       id: h.id,
       patientId: h.patient_id,
       riskLevel: h.risk_level,
       highRiskProbability: h.high_risk_probability,
       inputData: h.input_data,
       shapValues: h.shap_values,
       summary: h.summary,
       isAlertRequired: h.is_alert_required,
       createdAt: h.created_at,
       doctorNotes: h.doctor_notes,
       scheduledFollowupAt: h.scheduled_followup_at
    }));

    res.status(200).json({ success: true, history: mappedHistory });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/risk/compare
router.post('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const { current, previous } = req.body;
    const valCurr = MaternalRiskSchema.parse(current);
    const valPrev = MaternalRiskSchema.parse(previous);
    const comparison = await AiClientService.compareAssessments(valCurr, valPrev);
    res.status(200).json(comparison);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.errors || err.message });
  }
});

export default router;
