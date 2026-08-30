import { Platform } from 'react-native';

const BACKEND_BASE_URL = Platform.select({
  android: 'http://192.168.1.11:5000/api/v1',
  ios: 'http://192.168.1.11:5000/api/v1',
  default: 'http://192.168.1.11:5000/api/v1',
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
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public async register(data: RegisterData): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    return this.request('/approval/doctors');
  }

  public async submitApprovalRequest(data: {
    patientId: string; patientName: string; patientAge: number;
    patientBloodGroup: string; patientGestationalWeeks: number;
    patientPhone: string; patientEmail: string; doctorId: string;
  }): Promise<{ success: boolean; request: any }> {
    return this.request('/approval/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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


