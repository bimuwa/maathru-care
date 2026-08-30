import { Router, Request, Response } from 'express';
import { AlertsService } from '../services/alerts.service.js';
import { db } from '../services/db.service.js';

const router = Router();

// GET /api/v1/alerts/doctor/:doctorId
router.get('/doctor/:doctorId', (req: Request, res: Response): void => {
  const { doctorId } = req.params;
  const alerts = AlertsService.getDoctorAlerts(doctorId);
  res.status(200).json({ success: true, alerts });
});

// GET /api/v1/alerts/patient/:patientId
router.get('/patient/:patientId', (req: Request, res: Response): void => {
  const { patientId } = req.params;
  const alerts = AlertsService.getPatientAlerts(patientId);
  res.status(200).json({ success: true, alerts });
});

// PATCH /api/v1/alerts/:alertId/status
router.patch('/:alertId/status', (req: Request, res: Response): void => {
  try {
    const { alertId } = req.params;
    const { status, doctorNotes, scheduledFollowupAt } = req.body;
    
    if (!status) {
      res.status(400).json({ success: false, error: 'Missing status' });
      return;
    }

    const updated = AlertsService.updateAlertStatus(alertId, status, doctorNotes, scheduledFollowupAt);
    res.status(200).json({ success: true, alert: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/alerts/sos — Emergency SOS alert from patient
router.post('/sos', (req: Request, res: Response): void => {
  try {
    const { patientId, patientName, patientAge, gestationalAge, doctorId, lastBP, lastRiskLevel } = req.body;

    if (!patientId || !patientName || !doctorId) {
      res.status(400).json({ success: false, error: 'patientId, patientName, and doctorId are required' });
      return;
    }

    const sosAlert: any = {
      id: `sos-${Date.now()}`,
      patientId,
      patientName,
      patientAge: patientAge ?? null,
      gestationalAge: gestationalAge ?? null,
      doctorId,
      alertTitle: `🆘 EMERGENCY SOS — ${patientName}`,
      alertMessage: `Patient ${patientName} has triggered an emergency SOS. Last BP: ${lastBP ?? 'N/A'}, Last Risk Level: ${lastRiskLevel ?? 'N/A'}.`,
      riskLevel: 'Very High',
      probability: 100,
      status: 'Pending',
      isSOS: true,
      createdAt: new Date().toISOString(),
    };

    db.alerts.unshift(sosAlert);

    // Mark patient profile as having an active alert
    const profile = db.profiles.find(p => p.id === patientId);
    if (profile) {
      profile.hasActiveAlert = true;
    }

    res.status(201).json({ success: true, alert: sosAlert });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
