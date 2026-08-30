import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  PatientProfileDTO,
  RiskPredictionResponseDTO,
  CtgReportDTO,
  DailySymptomDTO,
  DoctorAlertDTO,
  ChatMessageDTO,
} from '../types/index.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient | null = null;

  // Resilient in-memory/local mock store for immediate prototype execution
  public profiles: PatientProfileDTO[] = [];

  public riskAssessments: RiskPredictionResponseDTO[] = [];
  public ctgReports: CtgReportDTO[] = [];
  public dailySymptoms: DailySymptomDTO[] = [];
  public alerts: DoctorAlertDTO[] = [];
  public messages: ChatMessageDTO[] = [];

  public vitalsLogs: Array<{
    id: string; patientId: string; logDate: string;
    systolicBP: number; diastolicBP: number; weightKg: number;
    pulseRate?: number; notes?: string; createdAt: string;
  }> = [];

  public prescriptions: Array<{
    id: string; patientId: string; doctorId: string; doctorName: string;
    medications: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string; }>;
    notes?: string; prescribedAt: string; isActive: boolean;
  }> = [];

  public doctorStatus: Record<string, { status: string; updatedAt: string; message?: string; }> = {};

  private constructor() {
    if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project')) {
      try {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[DatabaseService] Connected to Supabase PostgreSQL cloud instance.');
      } catch (err) {
        console.warn('[DatabaseService] Could not connect to Supabase, running with local in-memory persistence.');
      }
    } else {
      console.log('[DatabaseService] Running in local/offline prototype mode with seeded mock database.');
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getSupabase(): SupabaseClient | null {
    return this.supabase;
  }
}

export const db = DatabaseService.getInstance();
