import { Router, Request, Response } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { db } from '../services/db.service.js';

const router = Router();

// IMPORTANT: More specific routes MUST come before /:doctorId routes to avoid
// Express matching "patient" as a doctorId parameter.

// GET /api/v1/doctor/patient/:patientId  — full clinical file for a patient
router.get('/patient/:patientId', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const details = DoctorService.getPatientDetail(patientId);
    res.status(200).json({ success: true, ...details });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// GET /api/v1/doctor/patient/:patientId/summary — AI appointment summary
router.get('/patient/:patientId/summary', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const summary = DoctorService.generateAppointmentSummary(patientId);
    res.status(200).json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/doctor/patient/:patientId/notes — doctor saves clinical notes
router.patch('/patient/:patientId/notes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { notes, assessmentId } = req.body;
    const supabase = db.getSupabase();

    if (!notes) {
      res.status(400).json({ success: false, error: 'Notes cannot be empty' });
      return;
    }

    if (assessmentId) {
      await supabase
        .from('risk_assessments')
        .update({ doctor_notes: notes, doctor_notes_updated_at: new Date().toISOString() })
        .eq('id', assessmentId)
        .eq('patient_id', patientId);
    } else {
      const { data: latest } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latest) {
        await supabase
          .from('risk_assessments')
          .update({ doctor_notes: notes, doctor_notes_updated_at: new Date().toISOString() })
          .eq('id', latest.id);
      }
    }

    res.status(200).json({ success: true, message: 'Doctor notes saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/doctor/patient/:patientId/appointment — schedule appointment
router.post('/patient/:patientId/appointment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { scheduledAt, reason, doctorId } = req.body;
    const supabase = db.getSupabase();

    if (!scheduledAt) {
      res.status(400).json({ success: false, error: 'scheduledAt is required' });
      return;
    }

    const { data: latest } = await supabase
      .from('risk_assessments')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (latest) {
      await supabase
        .from('risk_assessments')
        .update({ scheduled_followup_at: scheduledAt })
        .eq('id', latest.id);
    }

    await supabase
      .from('alerts')
      .update({ scheduled_followup_at: scheduledAt, status: 'Follow-up scheduled' })
      .eq('patient_id', patientId)
      .eq('status', 'Pending');

    const appt: any = {
      id: `appt-${Date.now()}`,
      patientId,
      doctorId: doctorId || 'doc-elizabeth-001',
      scheduledAt,
      reason: reason || 'Follow-up visit',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ success: true, appointment: appt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/doctor/:doctorId/status
router.get('/:doctorId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const supabase = db.getSupabase();
    
    const { data, error } = await supabase
      .from('users')
      .select('doctor_status, updated_at')
      .eq('id', doctorId)
      .single();
      
    if (error || !data) {
      res.status(200).json({ success: true, doctorId, status: 'available', updatedAt: new Date().toISOString() });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      doctorId, 
      status: data.doctor_status || 'available', 
      updatedAt: data.updated_at || new Date().toISOString() 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/doctor/:doctorId/status
router.patch('/:doctorId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { status, message } = req.body;
    const supabase = db.getSupabase();
    const validStatuses = ['available', 'in_surgery', 'away', 'busy'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const updateData: any = { doctor_status: status, updated_at: new Date().toISOString() };
    if (message !== undefined) updateData.doctor_status_message = message;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', doctorId);
      
    if (error) throw error;

    res.status(200).json({ success: true, doctorId, status, updatedAt: updateData.updated_at, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/doctor/:doctorId/patients
router.get('/:doctorId/patients', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const supabase = db.getSupabase();

    // ✅ Use only columns that actually exist in our users table schema
    const { data: patients, error } = await supabase
      .from('users')
      .select('id, full_name, age, blood_group, gestational_week, phone, email, approval_status')
      .eq('assigned_doctor_id', doctorId)
      .eq('role', 'mother');

    if (error) {
      console.error('[Doctor] Get patients error:', error);
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    // Fetch the latest risk assessment for each patient in one batch query
    const patientIds = (patients || []).map((p: any) => p.id);
    let riskMap: Record<string, any> = {};

    if (patientIds.length > 0) {
      const { data: allRisks } = await supabase
        .from('risk_assessments')
        .select('patient_id, risk_level, high_risk_probability, created_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false });

      // Keep only the latest risk per patient
      (allRisks || []).forEach((r: any) => {
        if (!riskMap[r.patient_id]) {
          riskMap[r.patient_id] = r;
        }
      });
    }

    const mapped = (patients || []).map((p: any) => {
      const latestRisk = riskMap[p.id];
      return {
        id: p.id,
        fullName: p.full_name,
        age: p.age || null,
        bloodGroup: p.blood_group || 'N/A',
        gestationalAgeWeeks: p.gestational_week || 0,
        phone: p.phone || '',
        email: p.email || '',
        approvalStatus: p.approval_status || 'pending',
        currentRiskLevel: latestRisk?.risk_level || 'Low',
        currentRiskProbability: latestRisk?.high_risk_probability || 0,
        hasActiveAlert: false,
      };
    });

    res.status(200).json({ success: true, patients: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
