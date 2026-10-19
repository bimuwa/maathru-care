import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

interface KickSession {
  isActive: boolean;
  kickCount: number;
  elapsedSec: number;
  sessionStart: string;
  targetKicks: number;
}

interface KickSessionContextType {
  session: KickSession;
  startSession: () => void;
  recordKick: () => void;
  endSession: () => { completed: boolean; kicks: number; durationMin: number };
  resetSession: () => void;
}

const DEFAULT_SESSION: KickSession = {
  isActive: false,
  kickCount: 0,
  elapsedSec: 0,
  sessionStart: '',
  targetKicks: 10,
};

const KickSessionContext = createContext<KickSessionContextType>({
  session: DEFAULT_SESSION,
  startSession: () => {},
  recordKick: () => {},
  endSession: () => ({ completed: false, kicks: 0, durationMin: 0 }),
  resetSession: () => {},
});

export const useKickSession = () => useContext(KickSessionContext);

export function KickSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<KickSession>(DEFAULT_SESSION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    const now = new Date().toISOString();
    setSession({
      isActive: true,
      kickCount: 0,
      elapsedSec: 0,
      sessionStart: now,
      targetKicks: 10,
    });

    // Calculate elapsed from sessionStart — accurate even after backgrounding
    timerRef.current = setInterval(() => {
      setSession(prev => {
        if (!prev.isActive || !prev.sessionStart) return prev;
        const elapsed = Math.floor((Date.now() - new Date(prev.sessionStart).getTime()) / 1000);
        return { ...prev, elapsedSec: elapsed };
      });
    }, 1000);
  }, []);

  const recordKick = useCallback(() => {
    setSession(prev => {
      if (!prev.isActive) return prev;
      const newCount = prev.kickCount + 1;
      // Auto-complete if target reached
      if (newCount >= prev.targetKicks) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        return { ...prev, kickCount: newCount, isActive: false };
      }
      return { ...prev, kickCount: newCount };
    });
  }, []);

  const endSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    const result = {
      completed: session.kickCount >= session.targetKicks,
      kicks: session.kickCount,
      durationMin: +(session.elapsedSec / 60).toFixed(1),
    };

    setSession(prev => ({ ...prev, isActive: false }));
    return result;
  }, [session]);

  const resetSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSession(DEFAULT_SESSION);
  }, []);

  return (
    <KickSessionContext.Provider value={{ session, startSession, recordKick, endSession, resetSession }}>
      {children}
    </KickSessionContext.Provider>
  );
}
