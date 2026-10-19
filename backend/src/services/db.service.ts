import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient;

  // Purely a Supabase connection manager now, but we keep mock arrays 
  // for Member 1's scope (CTG, Symptoms) to avoid breaking their TypeScript code.
  public profiles: any[] = [];
  public riskAssessments: any[] = [];
  public alerts: any[] = [];
  public messages: any[] = [];
  public ctgReports: any[] = [];
  public dailySymptoms: any[] = [];
  public vitalsLogs: any[] = [];
  public prescriptions: any[] = [];
  public doctorStatus: Record<string, any> = {};

  private constructor() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('[DatabaseService] Missing Supabase URL or Key in .env');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DatabaseService] Connected to Supabase PostgreSQL cloud instance.');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getSupabase(): SupabaseClient {
    return this.supabase;
  }
}

export const db = DatabaseService.getInstance();
