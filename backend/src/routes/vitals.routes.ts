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
router.post('/log', (req: Request, res: Response): void => {
  try {
    const parsed = VitalsLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { patientId, logDate, systolicBP, diastolicBP, weightKg, pulseRate, notes } = parsed.data;

    const newLog = {
      id: `vitals-${Date.now()}`,
      patientId,
      logDate,
      systolicBP,
      diastolicBP,
      weightKg,
      ...(pulseRate !== undefined && { pulseRate }),
      ...(notes !== undefined && { notes }),
      createdAt: new Date().toISOString(),
    };

    db.vitalsLogs.unshift(newLog);
    res.status(201).json({ success: true, log: newLog });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/vitals/history/:patientId
router.get('/history/:patientId', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const logs = db.vitalsLogs.filter(v => v.patientId === patientId);
    res.status(200).json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
