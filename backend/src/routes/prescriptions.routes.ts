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
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = CreatePrescriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { patientId, doctorId, medications, notes } = parsed.data;
    const supabase = db.getSupabase();

    const { data: doctorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', doctorId)
      .single();

    const doctorName = doctorProfile?.full_name ?? doctorId;

    const { data: newPrescription, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        medications: medications,
        notes: notes,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const responsePrescription = {
      id: newPrescription.id,
      patientId: newPrescription.patient_id,
      doctorId: newPrescription.doctor_id,
      doctorName,
      medications: newPrescription.medications,
      notes: newPrescription.notes,
      prescribedAt: newPrescription.prescribed_at || new Date().toISOString(),
      isActive: newPrescription.is_active,
    };

    res.status(201).json({ success: true, prescription: responsePrescription });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/prescriptions/:patientId
router.get('/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    
    const supabase = db.getSupabase();
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        profiles!doctor_id (full_name)
      `)
      .eq('patient_id', patientId)
      .order('prescribed_at', { ascending: false });

    if (error) {
      throw error;
    }

    const responsePrescriptions = prescriptions.map(p => ({
      id: p.id,
      patientId: p.patient_id,
      doctorId: p.doctor_id,
      // fallback to doctor_id if the join doesn't work or returns empty
      doctorName: p.profiles?.full_name ?? p.doctor_id,
      medications: p.medications,
      notes: p.notes,
      prescribedAt: p.prescribed_at || p.created_at,
      isActive: p.is_active,
    }));

    res.status(200).json({ success: true, prescriptions: responsePrescriptions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/prescriptions/:prescriptionId/status
router.patch('/:prescriptionId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prescriptionId } = req.params;
    
    const supabase = db.getSupabase();

    const { data: currentPrescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('is_active')
      .eq('id', prescriptionId)
      .single();

    if (fetchError || !currentPrescription) {
      res.status(404).json({ success: false, error: 'Prescription not found' });
      return;
    }

    const { data: updatedPrescription, error } = await supabase
      .from('prescriptions')
      .update({ is_active: !currentPrescription.is_active })
      .eq('id', prescriptionId)
      .select(`
        *,
        profiles!doctor_id (full_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    const responsePrescription = {
      id: updatedPrescription.id,
      patientId: updatedPrescription.patient_id,
      doctorId: updatedPrescription.doctor_id,
      doctorName: updatedPrescription.profiles?.full_name ?? updatedPrescription.doctor_id,
      medications: updatedPrescription.medications,
      notes: updatedPrescription.notes,
      prescribedAt: updatedPrescription.prescribed_at || updatedPrescription.created_at,
      isActive: updatedPrescription.is_active,
    };

    res.status(200).json({ success: true, prescription: responsePrescription });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
