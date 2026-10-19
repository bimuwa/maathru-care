import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// ─── POST / — Doctor creates an appointment ─────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentType, notes, location, doctorName, patientName } = req.body;
    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ success: false, error: 'patientId, doctorId, and appointmentDate are required' });
    }
    const supabase = db.getSupabase();
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      appointment_type: appointmentType || 'routine_checkup',
      status: 'scheduled',
      notes: notes || null,
      location: location || null,
      doctor_name: doctorName || null,
      patient_name: patientName || null,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, appointment: {
      id: data.id, patientId: data.patient_id, doctorId: data.doctor_id,
      appointmentDate: data.appointment_date, appointmentType: data.appointment_type,
      status: data.status, notes: data.notes, location: data.location,
      doctorName: data.doctor_name, patientName: data.patient_name, createdAt: data.created_at,
    }});
  } catch (err: any) {
    console.error('[Appointments] Create error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /patient/:patientId — All appointments for a patient ────────────────
router.get('/patient/:patientId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('appointment_date', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map((a: any) => ({
      id: a.id, patientId: a.patient_id, doctorId: a.doctor_id,
      appointmentDate: a.appointment_date, appointmentType: a.appointment_type,
      status: a.status, notes: a.notes, location: a.location,
      doctorName: a.doctor_name, patientName: a.patient_name, createdAt: a.created_at,
    }));
    res.json({ success: true, appointments: mapped });
  } catch (err: any) {
    console.error('[Appointments] Patient list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /doctor/:doctorId — All appointments for a doctor ───────────────────
router.get('/doctor/:doctorId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', req.params.doctorId)
      .order('appointment_date', { ascending: true });
    if (error) throw error;
    const mapped = (data || []).map((a: any) => ({
      id: a.id, patientId: a.patient_id, doctorId: a.doctor_id,
      appointmentDate: a.appointment_date, appointmentType: a.appointment_type,
      status: a.status, notes: a.notes, location: a.location,
      doctorName: a.doctor_name, patientName: a.patient_name, createdAt: a.created_at,
    }));
    res.json({ success: true, appointments: mapped });
  } catch (err: any) {
    console.error('[Appointments] Doctor list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /:appointmentId — Update appointment status ───────────────────────
router.patch('/:appointmentId', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const supabase = db.getSupabase();
    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', req.params.appointmentId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, appointment: data });
  } catch (err: any) {
    console.error('[Appointments] Update error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /:appointmentId — Cancel appointment ─────────────────────────────
router.delete('/:appointmentId', async (req: Request, res: Response) => {
  try {
    const supabase = db.getSupabase();
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.appointmentId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Appointments] Cancel error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
