import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SymptomsService } from '../services/symptoms.service.js';

const router = Router();

const SymptomsLogSchema = z.object({
  patientId: z.string().default('p-sarah-001'),
  logDate: z.string().optional(),
  symptoms: z.array(z.string()).min(1, 'Please select at least one symptom or normal check'),
  severity: z.enum(['mild', 'moderate', 'severe']).default('mild'),
  notes: z.string().optional(),
});

// POST /api/v1/symptoms/log
router.post('/log', (req: Request, res: Response): void => {
  try {
    const validated = SymptomsLogSchema.parse(req.body);
    const log = SymptomsService.logSymptoms(validated);
    res.status(200).json({ success: true, log });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.errors || err.message });
  }
});

// GET /api/v1/symptoms/history/:patientId
router.get('/history/:patientId', (req: Request, res: Response): void => {
  const { patientId } = req.params;
  const history = SymptomsService.getPatientSymptoms(patientId);
  res.status(200).json({ success: true, history });
});

export default router;
