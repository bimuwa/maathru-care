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

    // Fetch doctor name safely from users table
    let doctorName = 'Doctor';
    try {
      const { data: docUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', doctorId)
        .single();
      if (docUser?.full_name) doctorName = docUser.full_name;
    } catch {}

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
      medications: Array.isArray(newPrescription.medications) ? newPrescription.medications : [],
      notes: newPrescription.notes,
      prescribedAt: newPrescription.prescribed_at || new Date().toISOString(),
      isActive: newPrescription.is_active,
    };

    res.status(201).json({ success: true, prescription: responsePrescription });
  } catch (err: any) {
    console.error('[Prescriptions POST Error]', err.message);
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
      .select('*')
      .eq('patient_id', patientId)
      .order('prescribed_at', { ascending: false });

    if (error) {
      console.warn('[Prescriptions GET Warning]', error.message);
      // Return empty array instead of failing 500 if table is empty or error
      res.status(200).json({ success: true, prescriptions: [] });
      return;
    }

    // Get doctor names map
    const doctorIds = Array.from(new Set((prescriptions || []).map((p: any) => p.doctor_id).filter(Boolean)));
    const doctorNameMap: Record<string, string> = {};

    if (doctorIds.length > 0) {
      try {
        const { data: docs } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', doctorIds);
        (docs || []).forEach((d: any) => {
          doctorNameMap[d.id] = d.full_name;
        });
      } catch {}
    }

    const responsePrescriptions = (prescriptions || []).map((p: any) => ({
      id: p.id,
      patientId: p.patient_id,
      doctorId: p.doctor_id,
      doctorName: doctorNameMap[p.doctor_id] || 'Doctor',
      medications: Array.isArray(p.medications) ? p.medications : (typeof p.medications === 'string' ? JSON.parse(p.medications) : []),
      notes: p.notes,
      prescribedAt: p.prescribed_at || p.created_at || new Date().toISOString(),
      isActive: p.is_active !== false,
    }));

    res.status(200).json({ success: true, prescriptions: responsePrescriptions });
  } catch (err: any) {
    console.error('[Prescriptions GET Error]', err.message);
    res.status(200).json({ success: true, prescriptions: [] });
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
      .select()
      .single();

    if (error) {
      throw error;
    }

    const responsePrescription = {
      id: updatedPrescription.id,
      patientId: updatedPrescription.patient_id,
      doctorId: updatedPrescription.doctor_id,
      doctorName: 'Doctor',
      medications: Array.isArray(updatedPrescription.medications) ? updatedPrescription.medications : [],
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
