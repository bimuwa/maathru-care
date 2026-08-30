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

    // Use the actual patientId from the request — never override with a hardcoded demo ID
    const patientId = validated.patientId || 'p-sarah-001';

    const predictionResult = await AiClientService.predictRisk(validated);

    const assessment = {
      ...predictionResult,
      id: `ast-${Date.now()}`,
      patientId,
      createdAt: new Date().toISOString(),
    };

    // Save to in-memory history (latest first)
    db.riskAssessments.unshift(assessment);

    // Update patient's current risk level in db.profiles
    const patient = db.profiles.find(p => p.id === patientId);
    if (patient) {
      patient.currentRiskLevel = predictionResult.riskLevel;
      patient.currentRiskProbability = predictionResult.highRiskProbability;
      patient.hasActiveAlert = predictionResult.isAlertRequired;
    }

    // Auto-create an alert for the assigned doctor if risk is High or Very High
    if (predictionResult.isAlertRequired) {
      const existingPendingAlert = db.alerts.find(
        a => a.patientId === patientId && a.status === 'Pending'
      );
      // Only create a new alert if there isn't already a pending one for this patient
      if (!existingPendingAlert) {
        db.alerts.unshift({
          id: `alt-${Date.now()}`,
          patientId,
          patientName: patient?.fullName || 'Patient',
          patientAge: validated.age,
          gestationalAge: validated.gestationalAge,
          doctorId: patient?.assignedDoctorId || 'doc-elizabeth-001',
          assessmentId: assessment.id,
          riskLevel: predictionResult.riskLevel === 'Very High' ? 'Very High' : 'High',
          probability: predictionResult.highRiskProbability,
          alertTitle: `${predictionResult.riskLevel} Maternal Risk Flagged (${predictionResult.highRiskProbability.toFixed(1)}%)`,
          alertMessage: predictionResult.summary,
          status: 'Pending',
          createdAt: new Date().toISOString(),
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
router.get('/history/:patientId', (req: Request, res: Response): void => {
  const { patientId } = req.params;
  const history = db.riskAssessments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  res.status(200).json({ success: true, history });
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
