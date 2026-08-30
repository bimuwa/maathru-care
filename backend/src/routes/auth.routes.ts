import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const router = Router();

// ─── Persistent user store (survives server restarts) ────────────────────────
// Saves registered users to a JSON file so login works after restarts.
const USERS_FILE = join(process.cwd(), 'data', 'users.json');
const DATA_DIR = join(process.cwd(), 'data');

// No pre-seeded accounts — all users must register from scratch.
const DEMO_USERS: any[] = [];

// Load persisted users from file + merge with demo accounts
function loadUsers(): any[] {
  try {
    if (existsSync(USERS_FILE)) {
      const raw = readFileSync(USERS_FILE, 'utf-8');
      const persisted: any[] = JSON.parse(raw);
      // Merge: demo accounts always present, then add any registered users not in demo list
      const demoIds = new Set(DEMO_USERS.map(u => u.id));
      const extraUsers = persisted.filter(u => !demoIds.has(u.id));
      return [...DEMO_USERS, ...extraUsers];
    }
  } catch (e) {
    console.warn('[Auth] Could not load persisted users, starting fresh:', e);
  }
  return [...DEMO_USERS];
}

// Save all non-demo users to file
function saveUsers(users: any[]) {
  try {
    const demoIds = new Set(DEMO_USERS.map(u => u.id));
    const toSave = users.filter(u => !demoIds.has(u.id));
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(USERS_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Auth] Could not persist users to file:', e);
  }
}

let USERS: any[] = loadUsers();

// Helper to calculate gestational weeks from LMP date
const calculateGestationalWeeks = (lmpDateString: string): number => {
  const lmp = new Date(lmpDateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lmp.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
};

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  // Reload from disk in case another process added a user
  USERS = loadUsers();

  const user = USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const { password: _pwd, ...safeUser } = user;

  return res.status(200).json({
    success: true,
    token: `demo-token-${user.id}-${Date.now()}`,
    user: { ...safeUser, approvalStatus: safeUser.approvalStatus || 'not_required' },
  });
});

// ─── POST /api/v1/auth/register ──────────────────────────────────────────────
router.post('/register', (req: Request, res: Response) => {
  const { role, email, password, fullName, phone } = req.body;

  if (!email || !password || !role || !fullName) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  // Reload to get latest list
  USERS = loadUsers();

  // Prevent duplicate emails
  if (USERS.some((u) => u.email.toLowerCase() === email.toLowerCase().trim())) {
    return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
  }

  const newId = `${role}-${Date.now()}`;

  const newUser: any = {
    id: newId,
    email: email.toLowerCase().trim(),
    password,
    role,
    fullName,
    phone: phone || '',
  };

  if (role === 'mother') {
    const { age, bloodGroup, lmpDate, gravida, assignedDoctorId, assignedDoctorName } = req.body;
    newUser.age = Number(age) || 25;
    newUser.bloodGroup = bloodGroup || 'O+';
    newUser.gravida = Number(gravida) || 1;
    newUser.gestationalAgeWeeks = lmpDate ? calculateGestationalWeeks(lmpDate) : 0;
    // ✅ Use the doctor the mother actually selected (from registration step 2)
    newUser.assignedDoctorId = assignedDoctorId || '';
    newUser.assignedDoctorName = assignedDoctorName || '';
    // Account starts as pending — she must wait for doctor approval
    newUser.approvalStatus = 'pending';

    // Sync to db.profiles so doctor patient list sees this patient
    const existingProfile = db.profiles.find(p => p.id === newId);
    if (!existingProfile) {
      db.profiles.push({
        id: newId,
        fullName,
        role: 'mother',
        email: newUser.email,
        phone: newUser.phone,
        age: newUser.age,
        gestationalAgeWeeks: newUser.gestationalAgeWeeks,
        bloodGroup: newUser.bloodGroup,
        assignedDoctorId: newUser.assignedDoctorId,
        assignedDoctorName: newUser.assignedDoctorName,
        currentRiskLevel: 'Low',
        currentRiskProbability: 0,
        hasActiveAlert: false,
      });
    }

  } else if (role === 'doctor') {
    const { medicalLicense, specialty, hospital } = req.body;
    newUser.medicalLicense = medicalLicense || '';
    newUser.specialty = specialty || 'General Practitioner';
    newUser.hospital = hospital || '';
    newUser.approvalStatus = 'not_required';

    // Sync doctor to db.profiles
    const existingProfile = db.profiles.find(p => p.id === newId);
    if (!existingProfile) {
      db.profiles.push({
        id: newId,
        fullName,
        role: 'doctor',
        email: newUser.email,
        phone: newUser.phone,
        age: 30,
        gestationalAgeWeeks: 0,
        bloodGroup: 'O+',
        specialty: newUser.specialty,
        hospital: newUser.hospital,
        medicalLicense: newUser.medicalLicense,
      } as any);
    }
  }

  USERS.push(newUser);

  // ✅ Persist to disk so login works after server restarts
  saveUsers(USERS);

  const { password: _pwd, ...safeUser } = newUser;

  return res.status(201).json({
    success: true,
    token: `demo-token-${newId}-${Date.now()}`,
    user: safeUser,
  });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided.' });
  }
  USERS = loadUsers();
  const parts = authHeader.replace('Bearer ', '').split('-');
  const userId = parts.slice(2, -1).join('-');
  const user = USERS.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }
  const { password: _pwd, ...safeUser } = user;
  return res.status(200).json({ success: true, user: { ...safeUser, approvalStatus: safeUser.approvalStatus || 'not_required' } });
});

// ─── PATCH /api/v1/auth/approval-status ──────────────────────────────────────
// Called by the approval system when a doctor approves/rejects a patient.
// Updates the user's approvalStatus in the persistent store.
router.patch('/approval-status', (req: Request, res: Response) => {
  const { patientId, approvalStatus } = req.body;
  if (!patientId || !approvalStatus) {
    return res.status(400).json({ success: false, error: 'patientId and approvalStatus are required.' });
  }
  USERS = loadUsers();
  const user = USERS.find(u => u.id === patientId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  user.approvalStatus = approvalStatus;
  saveUsers(USERS);
  return res.status(200).json({ success: true, user });
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response) => {
  return res.status(200).json({ success: true, message: 'Logged out.' });
});

export default router;
