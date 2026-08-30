import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// Helper to calculate gestational weeks from LMP date
const calculateGestationalWeeks = (lmpDateString: string): number => {
  const lmp = new Date(lmpDateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lmp.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
};

const mapUserToSafeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  fullName: user.full_name,
  phone: user.phone,
  bloodGroup: user.blood_group,
  age: user.age,
  gestationalAgeWeeks: user.gestational_week,
  assignedDoctorId: user.assigned_doctor_id,
  assignedDoctorName: user.assigned_doctor_name,
  approvalStatus: user.approval_status || 'not_required',
  specialty: user.specialty,
  hospital: user.hospital,
  medicalLicense: user.medical_license,
  doctorStatus: user.doctor_status
});

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const supabase = db.getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .eq('password', password)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      success: true,
      token: `demo-token-${user.id}-${Date.now()}`,
      user: mapUserToSafeUser(user),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/auth/register ──────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { role, email, password, fullName, phone } = req.body;

    if (!email || !password || !role || !fullName) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    const supabase = db.getSupabase();

    // Prevent duplicate emails
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const insertData: any = {
      email: email.toLowerCase().trim(),
      password,
      role,
      full_name: fullName,
      phone: phone || '',
      // Required non-null columns in the shared users table
      age: 0,
      gestational_week: 0,
      bmi: 0,
    };

    if (role === 'mother') {
      const { age, bloodGroup, lmpDate, gravida, assignedDoctorId, assignedDoctorName } = req.body;
      insertData.age = Number(age) || 25;
      insertData.blood_group = bloodGroup || 'O+';
      insertData.gestational_week = lmpDate ? calculateGestationalWeeks(lmpDate) : 0;
      insertData.no_of_pregnancy = Number(gravida) || 1;
      insertData.assigned_doctor_id = assignedDoctorId || null;
      insertData.assigned_doctor_name = assignedDoctorName || null;
      insertData.approval_status = 'pending';
    } else if (role === 'doctor') {
      const { medicalLicense, specialty, hospital } = req.body;
      insertData.medical_license = medicalLicense || '';
      insertData.specialty = specialty || 'General Practitioner';
      insertData.hospital = hospital || '';
      insertData.approval_status = 'not_required';
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Auth] Register Supabase error:', error);
      return res.status(500).json({ success: false, error: `Failed to create user: ${error.message}` });
    }

    return res.status(201).json({
      success: true,
      token: `demo-token-${newUser.id}-${Date.now()}`,
      user: mapUserToSafeUser(newUser),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: 'No token provided.' });
    }

    const parts = authHeader.replace('Bearer ', '').split('-');
    const userId = parts.slice(2, -1).join('-');

    const supabase = db.getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }

    return res.status(200).json({ success: true, user: mapUserToSafeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/v1/auth/approval-status ──────────────────────────────────────
router.patch('/approval-status', async (req: Request, res: Response) => {
  try {
    const { patientId, approvalStatus } = req.body;
    if (!patientId || !approvalStatus) {
      return res.status(400).json({ success: false, error: 'patientId and approvalStatus are required.' });
    }

    const supabase = db.getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .update({ approval_status: approvalStatus })
      .eq('id', patientId)
      .select()
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({ success: true, user: mapUserToSafeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
router.post('/logout', async (_req: Request, res: Response) => {
  return res.status(200).json({ success: true, message: 'Logged out.' });
});

export default router;
