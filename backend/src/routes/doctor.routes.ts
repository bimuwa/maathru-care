import { Router, Request, Response } from 'express';
import { DoctorService } from '../services/doctor.service.js';
import { AlertsService } from '../services/alerts.service.js';
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
// These notes appear on the patient's assessment records visible to the mother
router.patch('/patient/:patientId/notes', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const { notes, assessmentId } = req.body;

    if (!notes) {
      res.status(400).json({ success: false, error: 'Notes cannot be empty' });
      return;
    }

    // Apply to specific assessment if provided, otherwise apply to latest
    if (assessmentId) {
      const assessment = db.riskAssessments.find(r => r.id === assessmentId && r.patientId === patientId);
      if (assessment) {
        (assessment as any).doctorNotes = notes;
        (assessment as any).doctorNotesUpdatedAt = new Date().toISOString();
      }
    } else {
      // Apply to all assessments for this patient (general notes)
      const latest = db.riskAssessments.find(r => r.patientId === patientId);
      if (latest) {
        (latest as any).doctorNotes = notes;
        (latest as any).doctorNotesUpdatedAt = new Date().toISOString();
      }
    }

    res.status(200).json({ success: true, message: 'Doctor notes saved successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/doctor/patient/:patientId/appointment — schedule appointment
router.post('/patient/:patientId/appointment', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const { scheduledAt, reason, doctorId } = req.body;

    if (!scheduledAt) {
      res.status(400).json({ success: false, error: 'scheduledAt is required' });
      return;
    }

    const appt: any = {
      id: `appt-${Date.now()}`,
      patientId,
      doctorId: doctorId || 'doc-elizabeth-001',
      scheduledAt,
      reason: reason || 'Follow-up visit',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    // Store on the latest risk assessment as a scheduledFollowupAt
    const latest = db.riskAssessments.find(r => r.patientId === patientId);
    if (latest) {
      (latest as any).scheduledFollowupAt = scheduledAt;
    }

    // Also close pending alerts for this patient (appointment means doctor responded)
    const openAlerts = db.alerts.filter(a => a.patientId === patientId && a.status === 'Pending');
    openAlerts.forEach(a => {
      a.scheduledFollowupAt = scheduledAt;
      a.status = 'Follow-up scheduled' as any;
    });

    res.status(201).json({ success: true, appointment: appt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/doctor/:doctorId/status
router.get('/:doctorId/status', (req: Request, res: Response): void => {
  const { doctorId } = req.params;
  const statusEntry = db.doctorStatus[doctorId] ?? { status: 'available', updatedAt: new Date().toISOString() };
  res.status(200).json({ success: true, doctorId, ...statusEntry });
});

// PATCH /api/v1/doctor/:doctorId/status
router.patch('/:doctorId/status', (req: Request, res: Response): void => {
  try {
    const { doctorId } = req.params;
    const { status, message } = req.body;
    const validStatuses = ['available', 'in_surgery', 'away', 'busy'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    db.doctorStatus[doctorId] = {
      status,
      updatedAt: new Date().toISOString(),
      ...(message !== undefined && { message }),
    };

    res.status(200).json({ success: true, doctorId, ...db.doctorStatus[doctorId] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/doctor/:doctorId/patients — list of patients assigned to doctor
// This must come AFTER the /patient/* routes above
router.get('/:doctorId/patients', (req: Request, res: Response): void => {
  const { doctorId } = req.params;
  const patients = DoctorService.getAssignedPatients(doctorId);
  res.status(200).json({ success: true, patients });
});

export default router;
