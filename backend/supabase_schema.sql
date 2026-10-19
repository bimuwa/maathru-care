-- ==========================================================
-- MAATHRU CARE — SUPABASE / POSTGRESQL DATABASE SCHEMA
-- Member 2: Maternal Risk Prediction, CTG Analysis & Monitoring
-- ==========================================================

-- 1. Profiles Table (Mothers & Doctors)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mother', 'doctor', 'admin')),
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    age INT,
    gestational_age_weeks NUMERIC(4,1),
    blood_group TEXT,
    assigned_doctor_id UUID REFERENCES public.profiles(id),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Maternal Risk Assessments Table
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessed_by UUID REFERENCES public.profiles(id), -- Null if mother self-assessed, or doctor UUID
    age NUMERIC NOT NULL,
    gravida INT NOT NULL,
    tetanus_vaccination INT NOT NULL,
    gestational_age NUMERIC NOT NULL,
    weight_kg NUMERIC NOT NULL,
    height_ft NUMERIC NOT NULL,
    fetal_position INT NOT NULL,
    fetal_heart_rate NUMERIC NOT NULL,
    urine_sugar INT NOT NULL,
    vdrl INT NOT NULL,
    hbsag INT NOT NULL,
    systolic_bp NUMERIC NOT NULL,
    diastolic_bp NUMERIC NOT NULL,
    prediction INT NOT NULL, -- 0: Not High Risk, 1: High Risk
    prediction_label TEXT NOT NULL,
    high_risk_probability NUMERIC(5,2) NOT NULL, -- e.g. 84.50
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Very High')),
    risk_color TEXT NOT NULL,
    shap_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    is_alert_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CTG Reports Table
CREATE TABLE IF NOT EXISTS public.ctg_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    input_mode TEXT NOT NULL CHECK (input_mode IN ('scanned_image', 'manual_entry')),
    image_url TEXT,
    baseline_fhr NUMERIC NOT NULL, -- e.g. 140 bpm
    variability NUMERIC NOT NULL, -- e.g. 8.5 bpm
    accelerations INT NOT NULL, -- count in 20 min
    decelerations INT NOT NULL, -- count
    uterine_contractions INT DEFAULT 0,
    classification TEXT NOT NULL CHECK (classification IN ('NORMAL', 'SUSPICIOUS', 'PATHOLOGICAL')),
    ctg_risk_score NUMERIC(5,2) NOT NULL, -- 0.0 to 100.0%
    fetal_status_summary TEXT NOT NULL,
    maternal_impact_summary TEXT NOT NULL,
    next_scan_recommended_date DATE,
    is_sent_to_doctor BOOLEAN DEFAULT FALSE,
    doctor_feedback TEXT,
    doctor_feedback_at TIMESTAMPTZ,
    reviewed_by_doctor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily Symptoms Questionnaire Table
CREATE TABLE IF NOT EXISTS public.daily_symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["headache", "nausea", "swelling"]
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
    notes TEXT,
    pattern_flag TEXT, -- e.g. "Repeated headache (3 consecutive days)"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, log_date)
);

-- 5. High Risk Alerts Table (Doctor Workflow)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES public.risk_assessments(id),
    ctg_report_id UUID REFERENCES public.ctg_reports(id),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('High', 'Very High', 'Pathological CTG')),
    probability NUMERIC(5,2),
    alert_title TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Contacted', 'Follow-up scheduled', 'Closed')),
    doctor_notes TEXT,
    contacted_at TIMESTAMPTZ,
    scheduled_followup_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appointments & Pre-Appointment Summaries
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    appointment_type TEXT NOT NULL DEFAULT 'Routine Antenatal',
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
    pre_appointment_summary JSONB,
    clinical_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Chat & Messages (Doctor - Patient Communication)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id),
    message_text TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT, -- "image", "vital_summary", "prescription"
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high performance queries
CREATE INDEX IF NOT EXISTS idx_risk_patient ON public.risk_assessments(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctg_patient ON public.ctg_reports(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_symptoms_patient ON public.daily_symptoms(patient_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_doctor ON public.alerts(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages(sender_id, receiver_id, created_at ASC);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctg_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow read/write for demo/authenticated roles
CREATE POLICY "Public profiles access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Risk assessments access" ON public.risk_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "CTG reports access" ON public.ctg_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Daily symptoms access" ON public.daily_symptoms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Alerts access" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Appointments access" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Messages access" ON public.messages FOR ALL USING (true) WITH CHECK (true);
