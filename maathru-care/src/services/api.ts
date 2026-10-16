import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || Platform.select({
  // The web app runs on the same computer as the local API. Native devices still
  // need the development machine's LAN address unless an env URL is supplied.
  web: 'http://localhost:5000/api/v1',
  android: 'http://192.168.1.11:5000/api/v1',
  ios: 'http://192.168.1.11:5000/api/v1',
  default: 'http://localhost:5000/api/v1',
});

// ─── Auth Types ─────────────────────────────────────────────────────────────


export interface RegisterData {
  role: 'mother' | 'doctor';
  email: string;
  password: string;
  fullName: string;
  phone: string;
  // Mother fields
  age?: string;
  bloodGroup?: string;
  lmpDate?: string;
  gravida?: string;
  // Doctor fields
  medicalLicense?: string;
  specialty?: string;
  hospital?: string;
  // Additional Mother fields for risk assessment
  gestationalWeek?: string;
  gestationInPreviousPregnancy?: string;
  bmi?: string;
  hdl?: string;
  familyHistory?: boolean;
  unexplainedPrenatalLoss?: boolean;
  largeChildOrBirthDefault?: boolean;
  pcos?: boolean;
  sysBp?: string;
  diaBp?: string;
  ogtt?: string;
  hemoglobin?: string;
  sedentaryLifestyle?: boolean;
  prediabetes?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: 'mother' | 'doctor';
    fullName: string;
    age?: number;
    gestationalAgeWeeks?: number;
    bloodGroup?: string;
    phone?: string;
    assignedDoctorId?: string;
    assignedDoctorName?: string;
    specialty?: string;
    hospital?: string;
    medicalLicense?: string;
    gravida?: number;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'not_required';
  };
}

// ─── Risk Assessment Types ───────────────────────────────────────────────────

export interface MaternalRiskFormData {
  patientId?: string;
  age: number;
  gravida: number;
  tetanusVaccination: number;
  gestationalAge: number;
  weightKg: number;
  heightFt: number;
  fetalPosition: number;
  fetalHeartRate: number;
  urineSugar: number;
  vdrl: number;
  hbsAg: number;
  systolicBP: number;
  diastolicBP: number;
}

export interface FeatureImpact {
  feature: string;
  displayName: string;
  value: any;
  unit: string;
  shapValue: number;
  contribution: 'increases_risk' | 'decreases_risk' | 'neutral';
  importance: number;
  explanation: string;
}

export interface RiskPredictionResult {
  id?: string;
  patientId?: string;
  success: boolean;
  prediction: number;
  predictionLabel: string;
  highRiskProbability: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  riskColor: string;
  isAlertRequired: boolean;
  summary: string;
  factors: FeatureImpact[];
  recommendations: string[];
  disclaimer: string;
  createdAt?: string;
  doctorNotes?: string;
  scheduledFollowupAt?: string;
}

// ─── Symptom Types ───────────────────────────────────────────────────────────

export interface DailySymptomLog {
  id: string;
  patientId: string;
  logDate: string;
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  patternFlag?: string;
  createdAt: string;
}

// ─── Alert Types ─────────────────────────────────────────────────────────────

export interface DoctorAlert {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  gestationalAge: number;
  doctorId: string;
  riskLevel: 'High' | 'Very High';
  probability: number;
  alertTitle: string;
  alertMessage: string;
  status: 'Pending' | 'Reviewed' | 'Contacted' | 'Follow-up scheduled' | 'Closed';
  doctorNotes?: string;
  contactedAt?: string;
  scheduledFollowupAt?: string;
  createdAt: string;
}

// ─── Patient Profile Types ───────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  fullName: string;
  role: 'mother' | 'doctor';
  email: string;
  phone: string;
  age: number;
  gestationalAgeWeeks: number;
  bloodGroup: string;
  assignedDoctorName?: string;
  currentRiskLevel?: 'Low' | 'Moderate' | 'High' | 'Very High';
  currentRiskProbability?: number;
  hasActiveAlert?: boolean;
  nextAppointment?: string;
}

// ─── Chat Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  messageType?: 'text' | 'vitals' | 'appointment' | 'medication' | 'image';
  attachmentUrl?: string;   // base64 data URI or URL — matches backend field
  attachmentType?: 'image' | 'vital_summary' | 'prescription';
  isRead?: boolean;
  createdAt: string;
}

// ─── API Service ─────────────────────────────────────────────────────────────

class ApiService {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private withTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = 15000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out. Check your internet connection and try again.`)), timeoutMs);
      Promise.resolve(promise).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const res = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error((errorBody as any).error || `HTTP error ${res.status}`);
      }

      return await res.json() as T;
    } catch (err: any) {
      console.warn(`[ApiService] Request to ${endpoint} failed: ${err.message}`);
      throw err;
    }
  }

  // ─── Auth ───────────────────────────────────────────────────────────────
  public async login(email: string, password: string): Promise<LoginResponse> {
    const { data: auth, error: authError } = await this.withTimeout(
      supabase.auth.signInWithPassword({ email, password }), 'Sign in',
    );
    if (authError) throw authError;
    if (!auth.session) throw new Error('Sign-in did not establish a Supabase session.');
    this.setAuthToken(auth.session.access_token);
    let profileResult;
    try {
      profileResult = await this.withTimeout(supabase.from('users')
        .select('id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license')
        .eq('auth_user_id', auth.session.user.id).maybeSingle(), 'Profile loading');
    } catch (profileError) {
      await supabase.auth.signOut();
      this.setAuthToken(null);
      throw profileError;
    }
    const { data, error } = profileResult;
    if (error) {
      await supabase.auth.signOut();
      this.setAuthToken(null);
      throw new Error(`Supabase sign-in succeeded, but Maathru Care profile setup is incomplete (${error.message}). Apply migration 202610150003_auth_and_legacy_rls.sql and link existing research accounts before signing in again.`);
    }
    if (!data) {
      const { error: provisionError } = await supabase.rpc('provision_my_auth_profile');
      if (provisionError) {
        await supabase.auth.signOut();
        this.setAuthToken(null);
        throw new Error(provisionError.message.includes('existing profile')
          ? 'An existing research profile uses this email. Ask an administrator to verify ownership and link it; do not create another account.'
          : 'This Auth account has no Maathru Care profile. Apply migration 202610150003_auth_and_legacy_rls.sql, then sign in again.');
      }
      const { data: provisioned, error: reloadError } = await supabase.from('users')
        .select('id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license')
        .eq('auth_user_id', auth.session.user.id).maybeSingle();
      if (reloadError || !provisioned) {
        await supabase.auth.signOut();
        this.setAuthToken(null);
        throw new Error('Your Auth account exists but its profile could not be loaded. Check the database migration and try again.');
      }
      profileResult.data = provisioned;
    }
    const activeProfile = profileResult.data;
    if (!activeProfile) throw new Error('Your profile could not be loaded.');
    if (activeProfile.role === 'doctor' && activeProfile.approval_status !== 'approved') {
      await supabase.auth.signOut();
      this.setAuthToken(null);
      throw new Error('This doctor account is awaiting administrator approval.');
    }

    return {
      success: true,
      token: auth.session.access_token,
      user: {
        id: activeProfile.id,
        email: activeProfile.email,
        role: activeProfile.role as 'mother' | 'doctor',
        fullName: activeProfile.full_name,
        age: activeProfile.age,
        gestationalAgeWeeks: activeProfile.gestational_week,
        bloodGroup: activeProfile.blood_group,
        phone: activeProfile.phone,
        approvalStatus: activeProfile.approval_status,
        specialty: activeProfile.specialty,
        hospital: activeProfile.hospital,
        medicalLicense: activeProfile.medical_license,
      } as any
    };
  }

  public async register(data: RegisterData): Promise<LoginResponse> {
    const fullName = data.fullName.trim();
    if (!fullName) throw new Error('Full name is required to create your profile.');
    const metadata: Record<string, unknown> = {
      maathru_care_signup: 'v1', role: data.role, full_name: fullName, phone: data.phone,
    };
    if (data.role === 'mother') Object.assign(metadata, {
      age: data.age ? Number(data.age) : null, blood_group: data.bloodGroup || null,
      gestational_week: data.gestationalWeek ? Number(data.gestationalWeek) : null,
      no_of_pregnancy: data.gravida ? Number(data.gravida) : null,
      gestation_in_previous_pregnancy: data.gestationInPreviousPregnancy ? Number(data.gestationInPreviousPregnancy) : null,
      bmi: data.bmi ? Number(data.bmi) : null, hdl: data.hdl ? Number(data.hdl) : null,
      sys_bp: data.sysBp ? Number(data.sysBp) : null, dia_bp: data.diaBp ? Number(data.diaBp) : null,
      ogtt: data.ogtt ? Number(data.ogtt) : null, hemoglobin: data.hemoglobin ? Number(data.hemoglobin) : null,
      family_history: data.familyHistory ? 1 : 0, unexplained_prenatal_loss: data.unexplainedPrenatalLoss ? 1 : 0,
      large_child_or_birth_default: data.largeChildOrBirthDefault ? 1 : 0, pcos: data.pcos ? 1 : 0,
      sedentary_lifestyle: data.sedentaryLifestyle ? 1 : 0, prediabetes: data.prediabetes ? 1 : 0,
    });
    else Object.assign(metadata, { medical_license: data.medicalLicense, specialty: data.specialty, hospital: data.hospital });
    const { data: auth, error } = await this.withTimeout(supabase.auth.signUp({
      email: data.email, password: data.password, options: { data: metadata },
    }), 'Registration');
    if (error) throw error;
    if (!auth.session || !auth.user) throw new Error('Check your email to verify your account. After verification, sign in to continue.');
    this.setAuthToken(auth.session.access_token);
    const { data: profile, error: profileError } = await this.withTimeout(supabase.from('users')
      .select('id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license')
      .eq('auth_user_id', auth.user.id).maybeSingle(), 'Profile setup');
    if (profileError) throw new Error(`Your Auth account was created, but profile setup is incomplete (${profileError.message}). Do not register again; apply migration 202610150003_auth_and_legacy_rls.sql, then sign in.`);
    let activeProfile = profile;
    if (!activeProfile) {
      const { error: provisionError } = await supabase.rpc('provision_my_auth_profile');
      if (provisionError) throw new Error(provisionError.message.includes('existing profile')
        ? 'Your Auth account was created, but an existing research profile uses this email. Do not register again; ask an administrator to verify ownership and link the account.'
        : 'Your Auth account was created, but profile provisioning is not installed. Do not register again. Apply migration 202610150003_auth_and_legacy_rls.sql, then sign in to finish setup.');
      const { data: provisioned, error: reloadError } = await supabase.from('users')
        .select('id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license')
        .eq('auth_user_id', auth.user.id).maybeSingle();
      if (reloadError || !provisioned) throw new Error('Your Auth account exists, but its profile could not be loaded. Check the database migration before retrying.');
      activeProfile = provisioned;
    }

    return {
      success: true,
      token: auth.session.access_token,
      user: {
        id: activeProfile.id,
        email: activeProfile.email,
        role: activeProfile.role,
        fullName: activeProfile.full_name,
        phone: activeProfile.phone,
        age: activeProfile.age,
        gestationalAgeWeeks: activeProfile.gestational_week,
        bloodGroup: activeProfile.blood_group,
        approvalStatus: activeProfile.approval_status,
        specialty: activeProfile.specialty,
        hospital: activeProfile.hospital,
        medicalLicense: activeProfile.medical_license,
      } as any
    };
  }

  // ─── Maternal Risk Assessment ────────────────────────────────────────────
  public async assessRisk(data: MaternalRiskFormData): Promise<RiskPredictionResult> {
    return this.request<RiskPredictionResult>('/risk/predict', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getRiskHistory(patientId: string): Promise<{ success: boolean; history: RiskPredictionResult[] }> {
    return this.request(`/risk/history/${patientId}`);
  }

  public async compareRisk(currentId: string, previousId: string): Promise<{ success: boolean; comparison: any }> {
    return this.request('/risk/compare', {
      method: 'POST',
      body: JSON.stringify({ currentId, previousId }),
    });
  }

  // ─── Daily Symptoms ──────────────────────────────────────────────────────
  public async logSymptoms(data: {
    patientId: string;
    symptoms: string[];
    severity: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }): Promise<{ success: boolean; log: DailySymptomLog }> {
    return this.request('/symptoms/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getSymptomsHistory(patientId: string): Promise<{ success: boolean; history: DailySymptomLog[] }> {
    return this.request(`/symptoms/history/${patientId}`);
  }

  // ─── Alerts ─────────────────────────────────────────────────────────────
  public async getDoctorAlerts(doctorId: string): Promise<{ success: boolean; alerts: DoctorAlert[] }> {
    return this.request(`/alerts/doctor/${doctorId}`);
  }

  public async updateAlertStatus(
    alertId: string,
    status: string,
    doctorNotes?: string,
    scheduledFollowupAt?: string
  ): Promise<{ success: boolean }> {
    return this.request(`/alerts/${alertId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, doctorNotes, scheduledFollowupAt }),
    });
  }

  // ─── Doctor Roster & Summary ─────────────────────────────────────────────
  public async getDoctorPatients(doctorId: string): Promise<{ success: boolean; patients: PatientProfile[] }> {
    return this.request(`/doctor/${doctorId}/patients`);
  }

  public async getPatientDetail(patientId: string): Promise<{ success: boolean; patient: PatientProfile }> {
    return this.request(`/doctor/patient/${patientId}`);
  }

  public async getPatientAppointmentSummary(patientId: string): Promise<{ success: boolean; summary: any }> {
    return this.request(`/doctor/patient/${patientId}/summary`);
  }

  public async saveDoctorNotes(
    patientId: string,
    notes: string,
    assessmentId?: string
  ): Promise<{ success: boolean }> {
    return this.request(`/doctor/patient/${patientId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes, assessmentId }),
    });
  }

  public async scheduleAppointment(
    patientId: string,
    scheduledAt: string,
    reason: string,
    doctorId: string
  ): Promise<{ success: boolean; appointment: any }> {
    return this.request(`/doctor/patient/${patientId}/appointment`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt, reason, doctorId }),
    });
  }

  // ─── Doctor Approval System ───────────────────────────────────────────────
  public async getRegisteredDoctors(): Promise<{
    success: boolean;
    doctors: Array<{
      id: string; fullName: string; specialty: string;
      hospital: string; medicalLicense: string; phone: string;
    }>;
  }> {
    const { data, error } = await supabase.rpc('get_approved_doctors');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      doctors: (data || []).map((d: any) => ({
        id: d.id,
        fullName: d.full_name,
        specialty: d.specialty || '',
        hospital: d.hospital || '',
        medicalLicense: d.medical_license || '',
        phone: d.phone || ''
      }))
    };
  }

  public async submitApprovalRequest(data: {
    patientId: string; patientName: string; patientAge: number;
    patientBloodGroup: string; patientGestationalWeeks: number;
    patientPhone: string; patientEmail: string; doctorId: string;
  }): Promise<{ success: boolean; request: any }> {
    const { error } = await supabase.rpc('request_doctor_assignment', { p_doctor_id: data.doctorId });
    if (error) throw new Error(error.message);

    return { success: true, request: { status: 'pending' } };
  }

  public async checkApprovalStatus(patientId: string): Promise<{
    success: boolean; status: 'pending' | 'approved' | 'rejected' | 'not_found';
    request?: any;
  }> {
    return this.request(`/approval/status/${patientId}`);
  }

  public async getPendingApprovalRequests(doctorId: string): Promise<{
    success: boolean; requests: any[];
  }> {
    return this.request(`/approval/pending/${doctorId}`);
  }

  public async respondToApprovalRequest(
    requestId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<{ success: boolean; request: any }> {
    return this.request(`/approval/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejectionReason }),
    });
  }

  // ─── Chat ────────────────────────────────────────────────────────────────
  public async getMessages(user1: string, user2: string): Promise<{ success: boolean; messages: ChatMessage[] }> {
    return this.request(`/chat/conversation?user1=${user1}&user2=${user2}`);
  }

  public async sendMessage(
    senderId: string,
    receiverId: string,
    messageText: string,
    attachmentUrl?: string,
    attachmentType?: 'image' | 'vital_summary' | 'prescription'
  ): Promise<{ success: boolean; message: ChatMessage }> {
    return this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ senderId, receiverId, messageText, attachmentUrl, attachmentType }),
    });
  }

  // ─── Vitals ──────────────────────────────────────────────────────────────
  public async logVitals(data: {
    patientId: string; systolicBP: number; diastolicBP: number;
    weightKg: number; pulseRate?: number; notes?: string;
  }): Promise<{ success: boolean; log: any }> {
    return this.request('/vitals/log', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getVitalsHistory(patientId: string): Promise<{ success: boolean; history: any[] }> {
    return this.request(`/vitals/history/${patientId}`);
  }

  // ─── Prescriptions ───────────────────────────────────────────────────────
  public async createPrescription(data: {
    patientId: string; doctorId: string;
    medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string; }>;
    notes?: string;
  }): Promise<{ success: boolean; prescription: any }> {
    return this.request('/prescriptions', { method: 'POST', body: JSON.stringify(data) });
  }

  public async getPrescriptions(patientId: string): Promise<{ success: boolean; prescriptions: any[] }> {
    return this.request(`/prescriptions/${patientId}`);
  }

  // ─── SOS ─────────────────────────────────────────────────────────────────
  public async sendSOS(data: {
    patientId: string; patientName: string; patientAge: number;
    gestationalAge: number; doctorId: string; lastRiskLevel?: string; lastBP?: string;
  }): Promise<{ success: boolean; alert: any }> {
    return this.request('/alerts/sos', { method: 'POST', body: JSON.stringify(data) });
  }

  // ─── Doctor Availability Status ──────────────────────────────────────────
  public async getDoctorStatus(doctorId: string): Promise<{ success: boolean; status: string; message?: string; updatedAt?: string }> {
    return this.request(`/doctor/${doctorId}/status`);
  }

  public async updateDoctorStatus(doctorId: string, status: string, message?: string): Promise<{ success: boolean }> {
    return this.request(`/doctor/${doctorId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, message }),
    });
  }
}

export const api = new ApiService();

