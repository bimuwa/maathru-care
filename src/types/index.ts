export type UserRole = "PATIENT" | "DOCTOR";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone?: string;
}

export interface CtgReport {
  id: string;
  patient_id: string;
  source: "IMAGE" | "MANUAL";
  status: "PENDING" | "ANALYZING" | "COMPLETED" | "FAILED";
  recorded_at: string;
  ctg_analysis?: {
    classification?: string;
    confidence?: number;
    signal_quality?: string;
    id?: string;
    model_version?: string;
    baseline_fhr?: number;
    short_term_variability?: number;
    long_term_variability?: number;
    accelerations?: number;
    decelerations?: number;
    contraction_count?: number;
    mean_uc?: number;
    max_uc?: number;
    created_at?: string;
  };
  ctg_images?: { image_url: string };
  ctg_manual_values?: ManualCtgValues;
}

export interface ManualCtgValues {
  baseline_fhr: number;
  short_term_variability: number;
  long_term_variability: number;
  accelerations: number;
  decelerations: number;
  contraction_count: number;
  mean_uc: number;
  max_uc: number;
}

export interface DoctorFeedback {
  id: string;
  feedback: string;
  created_at: string;
  doctors?: { profiles?: { full_name: string } };
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  status: string;
}

export interface DoctorRequest {
  id: string;
  status: string;
  doctors?: {
    id: string;
    specialization?: string;
    hospital?: string;
    profiles?: { full_name: string; email: string };
  };
  patients?: {
    profiles?: { full_name: string; email: string };
  };
}
