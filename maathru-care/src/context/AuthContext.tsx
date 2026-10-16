import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

export type UserRole = 'mother' | 'doctor';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required';
export interface AuthUser {
  id: string; email: string; role: UserRole; fullName: string; phone?: string; age?: number;
  gestationalAgeWeeks?: number; bloodGroup?: string; assignedDoctorId?: string;
  assignedDoctorName?: string; specialty?: string; hospital?: string; medicalLicense?: string;
  approvalStatus?: ApprovalStatus;
}
interface AuthContextType {
  user: AuthUser | null; isLoading: boolean; login: (userData: AuthUser, token?: string) => Promise<void>;
  logout: () => Promise<void>; updateUser: (updates: Partial<AuthUser>) => Promise<void>; isAuthenticated: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfile(row: any): AuthUser {
  return {
    id: row.id, email: row.email ?? '', role: row.role === 'doctor' ? 'doctor' : 'mother',
    fullName: row.full_name ?? '', phone: row.phone ?? undefined, age: row.age ?? undefined,
    gestationalAgeWeeks: row.gestational_week ?? undefined, bloodGroup: row.blood_group ?? undefined,
    approvalStatus: row.approval_status ?? undefined, specialty: row.specialty ?? undefined,
    hospital: row.hospital ?? undefined, medicalLicense: row.medical_license ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadProfile = async (session: Session | null) => {
      api.setAuthToken(session?.access_token ?? null);
      if (!session?.user?.id) { if (active) setUser(null); return; }
      const { data, error } = await supabase.from('users')
        .select('id,email,role,full_name,phone,age,gestational_week,blood_group,approval_status,specialty,hospital,medical_license')
        .eq('auth_user_id', session.user.id).maybeSingle();
      if (error) throw error;
      if (active) setUser(data ? mapProfile(data) : null);
    };
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return loadProfile(data.session);
    }).catch((error) => console.warn('[Auth] Session restore failed:', error))
      .finally(() => { if (active) setIsLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session).catch((error) => console.warn('[Auth] Profile load failed:', error));
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const login = async (userData: AuthUser, token?: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('No verified Supabase Auth session is available.');
    api.setAuthToken(data.session.access_token);
    setUser(userData);
  };
  const updateUser = async (updates: Partial<AuthUser>) => setUser((prev) => prev ? { ...prev, ...updates } : prev);
  const logout = async () => { await supabase.auth.signOut(); api.setAuthToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, isAuthenticated: !!user }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
