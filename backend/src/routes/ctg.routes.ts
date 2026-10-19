import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CtgService } from '../services/ctg.service.js';

const router = Router();

const CtgAnalysisSchema = z.object({
  patientId: z.string().default('p-sarah-001'),
  inputMode: z.enum(['scanned_image', 'manual_entry']),
  imageUrl: z.string().optional(),
  baselineFhr: z.number().min(50).max(240),
  variability: z.number().min(0).max(50),
  accelerations: z.number().int().min(0).max(20),
  decelerations: z.number().int().min(0).max(20),
  uterineContractions: z.number().int().min(0).max(20).optional(),
  isSentToDoctor: z.boolean().optional(),
});

// POST /api/v1/ctg/analyze
router.post('/analyze', (req: Request, res: Response): void => {
  try {
    const validated = CtgAnalysisSchema.parse(req.body);
    const report = CtgService.analyzeCtgData(validated);
    res.status(200).json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.errors || err.message });
  }
});

// GET /api/v1/ctg/history/:patientId
router.get('/history/:patientId', (req: Request, res: Response): void => {
  const { patientId } = req.params;
  const history = CtgService.getPatientHistory(patientId);
  res.status(200).json({ success: true, history });
});

// POST /api/v1/ctg/feedback
router.post('/feedback', (req: Request, res: Response): void => {
  try {
    const { reportId, doctorId, feedbackNotes } = req.body;
    if (!reportId || !doctorId || !feedbackNotes) {
      res.status(400).json({ success: false, error: 'Missing reportId, doctorId, or feedbackNotes' });
      return;
    }
    const updated = CtgService.addDoctorFeedback(reportId, doctorId, feedbackNotes);
    res.status(200).json({ success: true, report: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
