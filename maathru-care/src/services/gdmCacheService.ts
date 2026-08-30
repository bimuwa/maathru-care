/**
 * gdmCacheService.ts
 * 
 * Manages on-device caching of GDM risk assessment results.
 * Uses AsyncStorage so results persist across app restarts without
 * hitting the ML API every time the Wellness screen loads.
 *
 * Re-check intervals (ACOG / ADA / FHB guidelines):
 *  - High Risk      →  every 14 days  (2 weeks)
 *  - Moderate Risk  →  every 28 days  (4 weeks / monthly)
 *  - Low Risk       →  every 28 days  (monthly, after week 28)
 *                       + prompt to check at week 24 if still pre-24
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GDMRiskResponse } from '@/types/gdm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GDMCacheEntry {
  result: GDMRiskResponse;
  checkedAt: string;        // ISO date string
  nextCheckDate: string;    // ISO date string
  gestationalWeekAtCheck: number;
}

export interface GDMCacheLoadResult {
  entry: GDMCacheEntry | null;
  isExpired: boolean;
  daysUntilNextCheck: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cacheKey(userId: string) {
  return `gdm_risk_cache_${userId}`;
}

/**
 * Calculate how many days until re-check is due based on risk category.
 */
function reCheckIntervalDays(
  riskCategory: GDMRiskResponse['riskCategory'],
  gestationalWeek: number
): number {
  if (riskCategory === 'High Risk') return 14;
  if (riskCategory === 'Moderate Risk') return 28;
  // Low Risk
  if (gestationalWeek < 24) {
    // next milestone: week 24 screening window
    // estimate days to week 24
    const weeksRemaining = 24 - gestationalWeek;
    return weeksRemaining * 7;
  }
  return 28; // monthly after week 28
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysBetween(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const gdmCacheService = {
  /**
   * Save a GDM result to AsyncStorage with computed expiry.
   */
  async save(
    userId: string,
    result: GDMRiskResponse,
    gestationalWeek: number
  ): Promise<GDMCacheEntry> {
    const now = new Date().toISOString();
    const intervalDays = reCheckIntervalDays(result.riskCategory, gestationalWeek);
    const nextCheckDate = addDays(now, intervalDays);

    const entry: GDMCacheEntry = {
      result,
      checkedAt: now,
      nextCheckDate,
      gestationalWeekAtCheck: gestationalWeek,
    };

    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(entry));
    return entry;
  },

  /**
   * Load cached GDM result. Returns expiry status.
   */
  async load(userId: string): Promise<GDMCacheLoadResult> {
    try {
      const raw = await AsyncStorage.getItem(cacheKey(userId));
      if (!raw) {
        return { entry: null, isExpired: true, daysUntilNextCheck: null };
      }

      const entry: GDMCacheEntry = JSON.parse(raw);
      const now = new Date().toISOString();
      const isExpired = now >= entry.nextCheckDate;
      const daysUntilNextCheck = isExpired
        ? 0
        : daysBetween(now, entry.nextCheckDate);

      return { entry, isExpired, daysUntilNextCheck };
    } catch {
      return { entry: null, isExpired: true, daysUntilNextCheck: null };
    }
  },

  /**
   * Force-clear the cache (e.g. for testing or manual re-check).
   */
  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(cacheKey(userId));
  },

  /**
   * Quick helper — returns just the risk category from cache, or null.
   * Used by detect.tsx to get GDM status without a full load.
   */
  async getRiskCategory(
    userId: string
  ): Promise<GDMRiskResponse['riskCategory'] | null> {
    const { entry, isExpired } = await this.load(userId);
    if (!entry || isExpired) return null;
    return entry.result.riskCategory;
  },
};
