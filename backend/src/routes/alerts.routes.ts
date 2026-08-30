import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// GET /api/v1/alerts/doctor/:doctorId
router.get('/doctor/:doctorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const supabase = db.getSupabase();
    
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map to frontend expectations
    const alerts = data.map((a: any) => ({
      id: a.id,
      patientId: a.patient_id,
      doctorId: a.doctor_id,
      alertTitle: a.alert_title,
      alertMessage: a.alert_message,
      riskLevel: a.risk_level,
      probability: a.probability,
      isSOS: a.is_sos,
      status: a.status,
      createdAt: a.created_at,
    }));

    res.status(200).json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/alerts/patient/:patientId
router.get('/patient/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const supabase = db.getSupabase();

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const alerts = data.map((a: any) => ({
      id: a.id,
      patientId: a.patient_id,
      doctorId: a.doctor_id,
      alertTitle: a.alert_title,
      alertMessage: a.alert_message,
      riskLevel: a.risk_level,
      probability: a.probability,
      isSOS: a.is_sos,
      status: a.status,
      createdAt: a.created_at,
    }));

    res.status(200).json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/alerts/:alertId/status
router.patch('/:alertId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    const { status, doctorNotes, scheduledFollowupAt } = req.body;
    
    if (!status) {
      res.status(400).json({ success: false, error: 'Missing status' });
      return;
    }

    const supabase = db.getSupabase();

    const { data, error } = await supabase
      .from('alerts')
      .update({ status })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;

    const alert = {
      id: data.id,
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      alertTitle: data.alert_title,
      alertMessage: data.alert_message,
      riskLevel: data.risk_level,
      probability: data.probability,
      isSOS: data.is_sos,
      status: data.status,
      createdAt: data.created_at,
    };

    res.status(200).json({ success: true, alert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/alerts/sos — Emergency SOS alert from patient
router.post('/sos', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, patientName, patientAge, gestationalAge, doctorId, lastBP, lastRiskLevel } = req.body;

    if (!patientId || !patientName || !doctorId) {
      res.status(400).json({ success: false, error: 'patientId, patientName, and doctorId are required' });
      return;
    }

    const supabase = db.getSupabase();

    const insertData = {
      patient_id: patientId,
      doctor_id: doctorId,
      alert_title: `🆘 EMERGENCY SOS — ${patientName}`,
      alert_message: `Patient ${patientName} has triggered an emergency SOS. Last BP: ${lastBP ?? 'N/A'}, Last Risk Level: ${lastRiskLevel ?? 'N/A'}.`,
      risk_level: 'Very High',
      probability: 100,
      is_sos: true,
      status: 'Pending',
    };

    const { data, error } = await supabase
      .from('alerts')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    const sosAlert = {
      id: data.id,
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      alertTitle: data.alert_title,
      alertMessage: data.alert_message,
      riskLevel: data.risk_level,
      probability: data.probability,
      isSOS: data.is_sos,
      status: data.status,
      createdAt: data.created_at,
    };

    res.status(201).json({ success: true, alert: sosAlert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
