import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';
import { join } from 'path';

const router = Router();

// ─── In-memory approval requests store ──────────────────────────────────────
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

export const approvalRequests: ApprovalRequest[] = [];

// ─── GET /api/v1/approval/doctors ────────────────────────────────────────────
// Public endpoint — lists all registered doctors for the mother to choose
router.get('/doctors', (_req: Request, res: Response): void => {
  const doctors = db.profiles
    .filter(p => p.role === 'doctor')
    .map(d => ({
      id: d.id,
      fullName: d.fullName,
      specialty: (d as any).specialty || 'General Practitioner',
      hospital: (d as any).hospital || 'N/A',
      medicalLicense: (d as any).medicalLicense || 'N/A',
      phone: d.phone || '',
      avatarUrl: d.avatarUrl || '',
    }));
  res.status(200).json({ success: true, doctors });
});

// ─── POST /api/v1/approval/request ───────────────────────────────────────────
// Mother submits an approval request to a chosen doctor on registration
router.post('/request', (req: Request, res: Response): void => {
  try {
    const {
      patientId, patientName, patientAge, patientBloodGroup,
      patientGestationalWeeks, patientPhone, patientEmail, doctorId,
    } = req.body;

    if (!patientId || !doctorId) {
      res.status(400).json({ success: false, error: 'patientId and doctorId are required.' });
      return;
    }

    const doctor = db.profiles.find(p => p.id === doctorId);
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found.' });
      return;
    }

    // Check for existing pending request from this patient to this doctor
    const existing = approvalRequests.find(
      r => r.patientId === patientId && r.doctorId === doctorId && r.status === 'pending'
    );
    if (existing) {
      res.status(200).json({ success: true, request: existing, message: 'Request already pending.' });
      return;
    }

    const newRequest: ApprovalRequest = {
      id: `apr-${Date.now()}`,
      patientId,
      patientName: patientName || 'Patient',
      patientAge: Number(patientAge) || 0,
      patientBloodGroup: patientBloodGroup || '—',
      patientGestationalWeeks: Number(patientGestationalWeeks) || 0,
      patientPhone: patientPhone || '',
      patientEmail: patientEmail || '',
      doctorId,
      doctorName: doctor.fullName,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    approvalRequests.unshift(newRequest);

    // Update the patient's assigned doctor info in db.profiles
    const patientProfile = db.profiles.find(p => p.id === patientId);
    if (patientProfile) {
      patientProfile.assignedDoctorId = doctorId;
      patientProfile.assignedDoctorName = doctor.fullName;
    }

    res.status(201).json({ success: true, request: newRequest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/approval/pending/:doctorId ──────────────────────────────────
// Doctor polls for pending patient approval requests
router.get('/pending/:doctorId', (req: Request, res: Response): void => {
  const { doctorId } = req.params;
  const pending = approvalRequests.filter(r => r.doctorId === doctorId && r.status === 'pending');
  res.status(200).json({ success: true, requests: pending });
});

// ─── GET /api/v1/approval/status/:patientId ──────────────────────────────────
// Mother polls for her approval status
router.get('/status/:patientId', (req: Request, res: Response): void => {
  const { patientId } = req.params;
  // Get the latest request for this patient
  const request = approvalRequests
    .filter(r => r.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!request) {
    res.status(200).json({ success: true, status: 'not_found' });
    return;
  }

  res.status(200).json({ success: true, status: request.status, request });
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

    const request = approvalRequests.find(r => r.id === requestId);
    if (!request) {
      res.status(404).json({ success: false, error: 'Approval request not found.' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    request.status = newStatus;
    request.respondedAt = new Date().toISOString();
    if (action === 'reject' && rejectionReason) request.rejectionReason = rejectionReason;

    // ✅ Persist approvalStatus to users.json so login always reflects correct state
    try {
      const { existsSync, readFileSync, writeFileSync } = await import('fs');
      const USERS_FILE = join(process.cwd(), 'data', 'users.json');
      if (existsSync(USERS_FILE)) {
        const persisted: any[] = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
        const entry = persisted.find((u: any) => u.id === request.patientId);
        if (entry) {
          entry.approvalStatus = newStatus;
          if (action === 'approve') {
            entry.assignedDoctorId = request.doctorId;
            entry.assignedDoctorName = request.doctorName;
          }
          writeFileSync(USERS_FILE, JSON.stringify(persisted, null, 2), 'utf-8');
        }
      }
    } catch (fsErr) {
      console.warn('[Approval] Could not persist approval status:', fsErr);
    }

    // Update db.profiles if approved
    if (action === 'approve') {
      const patientProfile = db.profiles.find(p => p.id === request.patientId);
      if (patientProfile) {
        patientProfile.assignedDoctorId = request.doctorId;
        patientProfile.assignedDoctorName = request.doctorName;
      }
    }

    res.status(200).json({ success: true, request });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
