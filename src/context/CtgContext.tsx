import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CtgReport } from "../types";
import { ctgApi } from "../api/ctg";

interface CtgContextValue {
  reports: CtgReport[];
  currentReport: CtgReport | null;
  loadHistory: () => Promise<void>;
  setCurrentReport: (report: CtgReport | null) => void;
  cacheReports: (reports: CtgReport[]) => void;
}

const CACHE_KEY = "ctg_reports_cache";

const CtgContext = createContext<CtgContextValue | null>(null);

export function CtgProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<CtgReport[]>([]);
  const [currentReport, setCurrentReport] = useState<CtgReport | null>(null);

  const cacheReports = useCallback(async (items: CtgReport[]) => {
    setReports(items);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, 20)));
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await ctgApi.getHistory();
      await cacheReports(data.reports);
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) setReports(JSON.parse(cached));
    }
  }, [cacheReports]);

  return (
    <CtgContext.Provider value={{ reports, currentReport, loadHistory, setCurrentReport, cacheReports }}>
      {children}
    </CtgContext.Provider>
  );
}

export function useCtg() {
  const ctx = useContext(CtgContext);
  if (!ctx) throw new Error("useCtg must be used within CtgProvider");
  return ctx;
}
