import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, setCachedAccessToken } from "../lib/supabase";
import { getMe, register, confirmAccount } from "../api/auth";
import { ApiError } from "../api/client";
import { Profile, UserRole } from "../types";

interface AuthContextValue {
  profile: Profile | null;
  roleData: Record<string, unknown> | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<Profile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roleData, setRoleData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const refreshProfile = useCallback(async (accessToken?: string): Promise<Profile | null> => {
    const requestId = ++profileRequestId.current;
    try {
      const data = await getMe(accessToken);
      if (requestId !== profileRequestId.current) return data.profile;
      setProfile(data.profile);
      setRoleData(data.roleData);
      return data.profile;
    } catch (err) {
      if (requestId !== profileRequestId.current) return null;
      if (err instanceof ApiError && err.status === 401) {
        setProfile(null);
        setRoleData(null);
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCachedAccessToken(data.session?.access_token ?? null);
      if (data.session?.access_token) {
        refreshProfile(data.session.access_token)
          .catch(() => {
            setProfile(null);
            setRoleData(null);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCachedAccessToken(session?.access_token ?? null);
      if (session?.access_token) {
        refreshProfile(session.access_token).catch(() => {});
      } else {
        profileRequestId.current += 1;
        setProfile(null);
        setRoleData(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshProfile]);

  const signIn = async (email: string, password: string): Promise<Profile> => {
    const normalizedEmail = email.trim();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (
      error &&
      (error.message.toLowerCase().includes("email not confirmed") ||
        error.code === "email_not_confirmed")
    ) {
      await confirmAccount(normalizedEmail);
      ({ data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      }));
    }

    if (error) throw error;

    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Sign-in succeeded but no session was returned.");
    }

    setCachedAccessToken(token);
    const userProfile = await refreshProfile(token);
    if (!userProfile) {
      throw new Error("Signed in but profile could not be loaded. Try again.");
    }
    return userProfile;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
  ): Promise<Profile> => {
    await register({
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
    });

    return signIn(email.trim(), password);
  };

  const signOut = async () => {
    setCachedAccessToken(null);
    profileRequestId.current += 1;
    await supabase.auth.signOut();
    setProfile(null);
    setRoleData(null);
  };

  return (
    <AuthContext.Provider value={{ profile, roleData, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
