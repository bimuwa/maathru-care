import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// ─── POST /weight — Save a weight log entry ─────────────────────────────────
router.post('/weight', async (req: Request, res: Response) => {
  try {
    const { patientId, weightKg, gestationalWeek, prePregnancyWeightKg, heightCm, bmiCategory, notes } = req.body;
    if (!patientId || !weightKg || gestationalWeek === undefined) {
      return res.status(400).json({ success: false, error: 'patientId, weightKg, and gestationalWeek are required' });
    }
    const supabase = db.getSupabase();
    const { data, error } = await supabase.from('weight_logs').insert({
      patient_id: patientId,
      weight_kg: weightKg,
      gestational_week: gestationalWeek,
      pre_pregnancy_weight_kg: prePregnancyWeightKg || null,
      height_cm: heightCm || null,
      bmi_category: bmiCategory || null,
      notes: notes || null,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, log: data });
  } catch (err: any) {
    console.error('[Reports] Weight save error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /weight/:patientId — Get weight history for IOM chart ──────────────
router.get('/weight/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('gestational_week', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map((w: any) => ({
      id: w.id, patientId: w.patient_id, weightKg: Number(w.weight_kg),
      gestationalWeek: w.gestational_week, prePregnancyWeightKg: w.pre_pregnancy_weight_kg ? Number(w.pre_pregnancy_weight_kg) : null,
      heightCm: w.height_cm ? Number(w.height_cm) : null,
      bmiCategory: w.bmi_category, notes: w.notes, createdAt: w.created_at,
    }));
    res.json({ success: true, logs: mapped });
  } catch (err: any) {
    console.error('[Reports] Weight history error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /weight/:patientId — Clear all weight logs for a patient ───────────
router.delete('/weight/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('patient_id', req.params.patientId);
    if (error) throw error;
    res.json({ success: true, message: 'Weight logs cleared successfully' });
  } catch (err: any) {
    console.error('[Reports] Weight reset error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /summary/:patientId — Full health summary for PDF report ────────────
router.get('/summary/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const patientId = req.params.patientId;

    // Fetch all data in parallel
    const [userRes, riskRes, vitalsRes, prescRes, kicksRes, appointRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', patientId).single(),
      supabase.from('risk_assessments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10),
      supabase.from('vitals_logs').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(20),
      supabase.from('prescriptions').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('kick_sessions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(10),
      supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: true }),
    ]);

    const patient = userRes.data;
    const latestRisk = riskRes.data?.[0] || null;

    res.json({
      success: true,
      summary: {
        patient: patient ? {
          id: patient.id, fullName: patient.full_name, email: patient.email,
          age: patient.age, bloodGroup: patient.blood_group,
          gestationalWeek: patient.gestational_week,
          assignedDoctorName: patient.assigned_doctor_name,
        } : null,
        latestRiskAssessment: latestRisk ? {
          riskLevel: latestRisk.risk_level,
          probability: latestRisk.high_risk_probability,
          inputData: latestRisk.input_data,
          date: latestRisk.created_at,
        } : null,
        riskHistory: (riskRes.data || []).map((r: any) => ({
          riskLevel: r.risk_level, probability: r.high_risk_probability, date: r.created_at,
        })),
        vitalsHistory: (vitalsRes.data || []).map((v: any) => ({
          systolicBP: v.systolic_bp, diastolicBP: v.diastolic_bp,
          weightKg: v.weight_kg, pulseRate: v.pulse_rate, date: v.created_at,
        })),
        activePrescriptions: (prescRes.data || []).map((p: any) => ({
          medications: p.medications, notes: p.notes, prescribedAt: p.prescribed_at,
        })),
        kickSessions: (kicksRes.data || []).map((k: any) => ({
          totalKicks: k.total_kicks, durationMinutes: k.duration_minutes,
          completed: k.completed, date: k.created_at,
        })),
        upcomingAppointments: (appointRes.data || []).filter((a: any) => a.status === 'scheduled').map((a: any) => ({
          date: a.appointment_date, type: a.appointment_type,
          doctorName: a.doctor_name, location: a.location, notes: a.notes,
        })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Reports] Summary error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
