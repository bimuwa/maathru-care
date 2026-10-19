import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

export interface ApprovalRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientBloodGroup: string;
  patientGestationalWeeks: number;
  patientPhone: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  rejectionReason?: string;
}

// Helper function to map DB request to frontend shape
const fetchRequestDetails = async (reqs: any[], supabase: any): Promise<ApprovalRequest[]> => {
  if (reqs.length === 0) return [];
  
  const patientIds = [...new Set(reqs.map(r => r.patient_id))];
  const doctorIds = [...new Set(reqs.map(r => r.doctor_id))];
  
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('id', [...patientIds, ...doctorIds]);
    
  const userMap = new Map((users || []).map((u: any) => [u.id, u]));
  
  return reqs.map(r => {
    const patient: any = userMap.get(r.patient_id) || {};
    const doctor: any = userMap.get(r.doctor_id) || {};
    return {
      id: r.id,
      patientId: r.patient_id,
      patientName: patient.full_name || 'Patient',
      patientAge: patient.age || 0,
      patientBloodGroup: patient.blood_group || '—',
      patientGestationalWeeks: patient.gestational_week || 0,
      patientPhone: patient.phone || '',
      patientEmail: patient.email || '',
      doctorId: r.doctor_id,
      doctorName: doctor.full_name || 'Doctor',
      status: r.status,
      createdAt: r.created_at,
      respondedAt: r.responded_at,
      rejectionReason: r.rejection_reason
    };
  });
};

// ─── GET /api/v1/approval/doctors ────────────────────────────────────────────
// Public endpoint — lists all registered doctors for the mother to choose
router.get('/doctors', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = db.getSupabase();
    const { data: doctors, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'doctor');
      
    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch doctors.' });
      return;
    }
    
    const mappedDoctors = doctors.map(d => ({
      id: d.id,
      fullName: d.full_name,
      specialty: d.specialty || 'General Practitioner',
      hospital: d.hospital || 'N/A',
      medicalLicense: d.medical_license || 'N/A',
      phone: d.phone || '',
      avatarUrl: '',
    }));
    res.status(200).json({ success: true, doctors: mappedDoctors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/approval/request ───────────────────────────────────────────
// Mother submits an approval request to a chosen doctor on registration
router.post('/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patientId, doctorId
    } = req.body;

    if (!patientId || !doctorId) {
      res.status(400).json({ success: false, error: 'patientId and doctorId are required.' });
      return;
    }

    const supabase = db.getSupabase();

    const { data: doctor, error: doctorErr } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', doctorId)
      .maybeSingle();

    if (doctorErr || !doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found.' });
      return;
    }

    // Check for existing pending request from this patient to this doctor
    const { data: existing } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existing) {
      const mapped = (await fetchRequestDetails([existing], supabase))[0];
      res.status(200).json({ success: true, request: mapped, message: 'Request already pending.' });
      return;
    }

    const { data: newReq, error: insertErr } = await supabase
      .from('approval_requests')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        status: 'pending'
      })
      .select()
      .single();

    if (insertErr) {
      res.status(500).json({ success: false, error: 'Failed to create request.' });
      return;
    }

    // Update the patient's assigned doctor info in users
    await supabase
      .from('users')
      .update({
        assigned_doctor_id: doctorId,
        assigned_doctor_name: doctor.full_name
      })
      .eq('id', patientId);

    const mappedNew = (await fetchRequestDetails([newReq], supabase))[0];
    res.status(201).json({ success: true, request: mappedNew });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/approval/pending/:doctorId ──────────────────────────────────
// Doctor polls for pending patient approval requests
router.get('/pending/:doctorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const supabase = db.getSupabase();
    
    const { data: pending, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('status', 'pending');
      
    if (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch pending requests.' });
      return;
    }

    const mapped = await fetchRequestDetails(pending || [], supabase);
    res.status(200).json({ success: true, requests: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/approval/status/:patientId ──────────────────────────────────
// Mother polls for her approval status
router.get('/status/:patientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const supabase = db.getSupabase();

    // Get the latest request for this patient
    const { data: request, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !request) {
      res.status(200).json({ success: true, status: 'not_found' });
      return;
    }

    const mapped = (await fetchRequestDetails([request], supabase))[0];
    res.status(200).json({ success: true, status: request.status, request: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/v1/approval/:requestId ───────────────────────────────────────
// Doctor approves or rejects the request
router.patch('/:requestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ success: false, error: "action must be 'approve' or 'reject'" });
      return;
    }

    const supabase = db.getSupabase();

    const { data: request, error: fetchErr } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchErr || !request) {
      res.status(404).json({ success: false, error: 'Approval request not found.' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateData: any = {
      status: newStatus,
      responded_at: new Date().toISOString()
    };
    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data: updatedReq, error: updateErr } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (updateErr) {
      res.status(500).json({ success: false, error: 'Failed to update request.' });
      return;
    }

    const { data: doctor } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', request.doctor_id)
      .maybeSingle();

    // Update patient user
    const userUpdate: any = { approval_status: newStatus };
    if (action === 'approve') {
      userUpdate.assigned_doctor_id = request.doctor_id;
      userUpdate.assigned_doctor_name = doctor?.full_name || 'Doctor';
    }

    await supabase
      .from('users')
      .update(userUpdate)
      .eq('id', request.patient_id);

    const mapped = (await fetchRequestDetails([updatedReq], supabase))[0];
    res.status(200).json({ success: true, request: mapped });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
