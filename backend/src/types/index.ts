export interface MaternalRiskInputDTO {
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

export interface FeatureImpactDTO {
  feature: string;
  displayName: string;
  value: any;
  unit: string;
  shapValue: number;
  contribution: 'increases_risk' | 'decreases_risk' | 'neutral';
  importance: number;
  explanation: string;
}

export interface RiskPredictionResponseDTO {
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
  factors: FeatureImpactDTO[];
  recommendations: string[];
  disclaimer: string;
  createdAt?: string;
}

export interface CtgReportDTO {
  id: string;
  patientId: string;
  patientName?: string;
  inputMode: 'scanned_image' | 'manual_entry';
  imageUrl?: string;
  baselineFhr: number; // e.g. 140 bpm
  variability: number; // e.g. 8.5 bpm
  accelerations: number; // e.g. 3
  decelerations: number; // e.g. 0
  uterineContractions?: number;
  classification: 'NORMAL' | 'SUSPICIOUS' | 'PATHOLOGICAL';
  ctgRiskScore: number; // 0 - 100%
  fetalStatusSummary: string;
  maternalImpactSummary: string;
  nextScanRecommendedDate: string;
  isSentToDoctor: boolean;
  doctorFeedback?: string;
  doctorFeedbackAt?: string;
  reviewedByDoctorId?: string;
  createdAt: string;
}

export interface DailySymptomDTO {
  id: string;
  patientId: string;
  logDate: string;
  symptoms: string[];
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  patternFlag?: string;
  createdAt: string;
}

export interface DoctorAlertDTO {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  gestationalAge: number;
  doctorId: string;
  assessmentId?: string;
  ctgReportId?: string;
  riskLevel: 'High' | 'Very High' | 'Pathological CTG';
  probability: number;
  alertTitle: string;
  alertMessage: string;
  status: 'Pending' | 'Reviewed' | 'Contacted' | 'Follow-up scheduled' | 'Closed';
  doctorNotes?: string;
  contactedAt?: string;
  scheduledFollowupAt?: string;
  closedAt?: string;
  createdAt: string;
}

export interface PatientProfileDTO {
  id: string;
  fullName: string;
  role: 'mother' | 'doctor';
  email: string;
  phone: string;
  age: number;
  gestationalAgeWeeks: number;
  bloodGroup: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  currentRiskLevel?: 'Low' | 'Moderate' | 'High' | 'Very High';
  currentRiskProbability?: number;
  hasActiveAlert?: boolean;
  avatarUrl?: string;
}

export interface AppointmentSummaryDTO {
  patientId: string;
  patientName: string;
  gestationalAge: number;
  currentRiskLevel: string;
  riskProbability: number;
  riskTrajectory: 'improving' | 'stable' | 'increasing';
  recentVitals: {
    bloodPressure: string;
    fetalHeartRate: number;
    weightKg: number;
  };
  recentSymptoms: string[];
  symptomFlags: string[];
  latestCtgSummary?: {
    classification: string;
    riskScore: number;
    baselineFhr: number;
  };
  openAlertsCount: number;
  recommendedClinicalAction: string;
  generatedAt: string;
}

export interface ChatMessageDTO {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'vital_summary' | 'prescription';
  isRead: boolean;
  createdAt: string;
}
