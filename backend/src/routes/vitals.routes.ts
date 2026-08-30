import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db.service.js';

const router = Router();

const VitalsLogSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  logDate: z.string().min(1, 'logDate is required'),
  systolicBP: z.number().min(60, 'systolicBP must be ≥ 60').max(240, 'systolicBP must be ≤ 240'),
  diastolicBP: z.number().min(30, 'diastolicBP must be ≥ 30').max(160, 'diastolicBP must be ≤ 160'),
  weightKg: z.number().min(20, 'weightKg must be ≥ 20').max(200, 'weightKg must be ≤ 200'),
  pulseRate: z.number().optional(),
  notes: z.string().optional(),
});

// POST /api/v1/vitals/log
router.post('/log', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = VitalsLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { patientId, logDate, systolicBP, diastolicBP, weightKg, pulseRate, notes } = parsed.data;

    const supabase = db.getSupabase();
    const { data: newLog, error } = await supabase
      .from('vitals_logs')
      .insert({
        patient_id: patientId,
        log_date: logDate,
        systolic_bp: systolicBP,
        diastolic_bp: diastolicBP,
        weight_kg: weightKg,
        pulse_rate: pulseRate,
        notes: notes
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const responseLog = {
      id: newLog.id,
      patientId: newLog.patient_id,
      logDate: newLog.log_date,
      systolicBP: newLog.systolic_bp,
      diastolicBP: newLog.diastolic_bp,
      weightKg: newLog.weight_kg,
      pulseRate: newLog.pulse_rate,
      notes: newLog.notes,
      createdAt: newLog.created_at || new Date().toISOString(),
    };

    res.status(201).json({ success: true, log: responseLog });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/vitals/history/:patientId
router.get('/history/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    
    const supabase = db.getSupabase();
    const { data: logs, error } = await supabase
      .from('vitals_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('log_date', { ascending: false });

    if (error) {
      throw error;
    }

    const responseLogs = logs.map(log => ({
      id: log.id,
      patientId: log.patient_id,
      logDate: log.log_date,
      systolicBP: log.systolic_bp,
      diastolicBP: log.diastolic_bp,
      weightKg: log.weight_kg,
      pulseRate: log.pulse_rate,
      notes: log.notes,
      createdAt: log.created_at || new Date().toISOString(),
    }));

    res.status(200).json({ success: true, logs: responseLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
