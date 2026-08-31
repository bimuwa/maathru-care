import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'mother' | 'doctor';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  age?: number;
  gestationalAgeWeeks?: number;
  bloodGroup?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  specialty?: string;
  hospital?: string;
  medicalLicense?: string;
  token?: string;
  approvalStatus?: ApprovalStatus;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (userData: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@maathru_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on app start
  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: AuthUser = JSON.parse(stored);
          // ✅ Validate that the stored ID is a real UUID (Supabase format).
          // Old IDs were like "mother-1234567890" — stale from before Supabase migration.
          // If old format is found, clear the session so user logs in fresh.
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id || '');
          if (!isValidUUID) {
            console.warn('[AuthContext] Stale session with non-UUID ID detected — clearing session.');
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          } else {
            setUser(parsed);
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Failed to load session:', e);
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (userData: AuthUser, token: string) => {
    const fullUser: AuthUser = { ...userData, token };
    setUser(fullUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fullUser));
  };

  const updateUser = async (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
