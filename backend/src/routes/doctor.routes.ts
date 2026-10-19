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
    const { notes, assessmentId, doctorId, doctorName } = req.body;
    const supabase = db.getSupabase();

    if (!notes) {
      res.status(400).json({ success: false, error: 'Notes cannot be empty' });
      return;
    }

    // 1. Save notes to risk_assessments table (existing logic)
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

    // 2. Also insert a standalone alert record of type 'clinical_note' 
    //    so it appears in the patient's profile even without a risk assessment
    const { data: patient } = await supabase
      .from('users')
      .select('full_name, assigned_doctor_id')
      .eq('id', patientId)
      .single();

    const resolvedDoctorId = doctorId || patient?.assigned_doctor_id;
    const resolvedDoctorName = doctorName || 'Your Doctor';

    // Remove old pending clinical_note alerts for this patient first (replace with new)
    await supabase
      .from('alerts')
      .delete()
      .eq('patient_id', patientId)
      .eq('alert_type', 'clinical_note');

    await supabase.from('alerts').insert({
      patient_id: patientId,
      patient_name: patient?.full_name || 'Patient',
      doctor_id: resolvedDoctorId,
      alert_title: `📋 Clinical Note from ${resolvedDoctorName}`,
      alert_message: notes,
      alert_type: 'clinical_note',
      risk_level: 'Low',
      probability: 0,
      is_sos: false,
      status: 'Active',
    });

    res.status(200).json({ success: true, message: 'Doctor notes saved successfully' });
  } catch (err: any) {
    console.error('[Doctor Notes Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/doctor/patient/:patientId/appointment — schedule appointment
router.post('/patient/:patientId/appointment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const { scheduledAt, reason, doctorId, doctorName } = req.body;
    const supabase = db.getSupabase();

    if (!scheduledAt) {
      res.status(400).json({ success: false, error: 'scheduledAt is required' });
      return;
    }

    // 1. Update risk assessment scheduled followup
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

    // 2. Update any pending alerts
    await supabase
      .from('alerts')
      .update({ scheduled_followup_at: scheduledAt, status: 'Follow-up scheduled' })
      .eq('patient_id', patientId)
      .eq('status', 'Pending');

    // 3. Fetch patient info for the alert
    const { data: patient } = await supabase
      .from('users')
      .select('full_name, assigned_doctor_id')
      .eq('id', patientId)
      .single();

    const resolvedDoctorId = doctorId || patient?.assigned_doctor_id;
    const resolvedDoctorName = doctorName || 'Your Doctor';
    const resolvedReason = reason || 'Follow-up visit';

    // 4. Insert appointment alert so patient sees it on their profile & home
    //    Remove old pending appointments for same patient first
    await supabase
      .from('alerts')
      .delete()
      .eq('patient_id', patientId)
      .eq('alert_type', 'appointment')
      .eq('status', 'Upcoming');

    const { data: apptAlert } = await supabase.from('alerts').insert({
      patient_id: patientId,
      patient_name: patient?.full_name || 'Patient',
      doctor_id: resolvedDoctorId,
      alert_title: `📅 Appointment Scheduled`,
      alert_message: `Your doctor has scheduled an appointment for you.\n\nDate & Time: ${scheduledAt}\nReason: ${resolvedReason}`,
      alert_type: 'appointment',
      scheduled_at: scheduledAt,
      appointment_reason: resolvedReason,
      risk_level: 'Low',
      probability: 0,
      is_sos: false,
      status: 'Upcoming',
    }).select().single();

    const appt: any = {
      id: apptAlert?.id ?? `appt-${Date.now()}`,
      patientId,
      doctorId: resolvedDoctorId,
      doctorName: resolvedDoctorName,
      scheduledAt,
      reason: resolvedReason,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ success: true, appointment: appt });
  } catch (err: any) {
    console.error('[Appointment Error]', err.message);
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

    const patientIds = (patients || []).map((p: any) => p.id);
    let riskMap: Record<string, any> = {};

    if (patientIds.length > 0) {
      const { data: allRisks } = await supabase
        .from('risk_assessments')
        .select('patient_id, risk_level, high_risk_probability, created_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false });

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
