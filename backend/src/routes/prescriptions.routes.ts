import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../services/db.service.js';

const router = Router();

const MedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional(),
});

const CreatePrescriptionSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  doctorId: z.string().min(1, 'doctorId is required'),
  medications: z.array(MedicationSchema).min(1, 'At least one medication is required'),
  notes: z.string().optional(),
});

// POST /api/v1/prescriptions
router.post('/', (req: Request, res: Response): void => {
  try {
    const parsed = CreatePrescriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { patientId, doctorId, medications, notes } = parsed.data;

    // Resolve doctor name from profiles
    const doctorProfile = db.profiles.find(p => p.id === doctorId);
    const doctorName = doctorProfile?.fullName ?? doctorId;

    const newPrescription = {
      id: `rx-${Date.now()}`,
      patientId,
      doctorId,
      doctorName,
      medications,
      ...(notes !== undefined && { notes }),
      prescribedAt: new Date().toISOString(),
      isActive: true,
    };

    db.prescriptions.push(newPrescription);
    res.status(201).json({ success: true, prescription: newPrescription });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/prescriptions/:patientId
router.get('/:patientId', (req: Request, res: Response): void => {
  try {
    const { patientId } = req.params;
    const prescriptions = db.prescriptions.filter(p => p.patientId === patientId);
    res.status(200).json({ success: true, prescriptions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/prescriptions/:prescriptionId/status
router.patch('/:prescriptionId/status', (req: Request, res: Response): void => {
  try {
    const { prescriptionId } = req.params;
    const prescription = db.prescriptions.find(p => p.id === prescriptionId);

    if (!prescription) {
      res.status(404).json({ success: false, error: 'Prescription not found' });
      return;
    }

    prescription.isActive = !prescription.isActive;
    res.status(200).json({ success: true, prescription });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
