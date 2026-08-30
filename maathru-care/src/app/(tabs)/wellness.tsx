/**
 * wellness.tsx
 *
 * Three tabs:
 *  • Daily   — Enhanced nutrition dashboard with status chips + meal timeline
 *  • Weekly  — Weekly trend summary (stub ready)
 *  • GDM Risk — On-demand risk check with smart cache + next-check date
 *
 * All styling via StyleSheet (NO className/nativewind) to avoid
 * react-native-css-interop / NavigationStateContext crash.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartPulse, Calendar, TrendingUp, AlertCircle, CheckCircle2, ShieldAlert, Zap, RefreshCw } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { mealService } from '@/services/mealService';
import { gdmRiskService } from '@/services/gdmRiskService';
import { gdmCacheService, GDMCacheEntry } from '@/services/gdmCacheService';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';
import { ACTIVE_USER_ID } from '@/constants/userConfig';
import { GDMRiskResponse } from '@/types/gdm';

type Tab = 'daily' | 'weekly' | 'gdm';

// ─── Nutrition target config (with GDM-adjusted sugar for High Risk) ─────────
const GDM_HIGH_SUGAR_LIMIT = 20; // g — tighter for High Risk mothers

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function statusColor(pct: number, isUpperLimit?: boolean): string {
  if (isUpperLimit) {
    if (pct >= 100) return '#DC2626'; // exceed
    if (pct >= 75)  return '#D97706'; // approaching
    return '#059669';
  }
  if (pct >= 90) return '#059669';
  if (pct >= 50) return '#D97706';
  return '#EF4444';
}

function statusLabel(pct: number, isUpperLimit?: boolean): string {
  if (isUpperLimit) {
    if (pct >= 100) return 'Exceeded';
    if (pct >= 75)  return 'Approaching';
    return 'On Track';
  }
  if (pct >= 90) return 'On Track';
  if (pct >= 50) return 'Moderate';
  return 'Low';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NutrientRow({
  label, emoji, current, target, unit, isUpperLimit,
}: {
  label: string; emoji: string; current: number; target: number; unit: string; isUpperLimit?: boolean;
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const color = statusColor(pct, isUpperLimit);
  const label2 = statusLabel(pct, isUpperLimit);

  return (
    <View style={nr.row}>
      <View style={nr.labelRow}>
        <Text style={nr.emoji}>{emoji}</Text>
        <Text style={nr.label}>{label}</Text>
        <View style={[nr.chip, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[nr.chipText, { color }]}>{label2}</Text>
        </View>
      </View>
      <View style={nr.valRow}>
        <Text style={nr.current}>{current.toFixed(1)}</Text>
        <Text style={nr.separator}>/</Text>
        <Text style={nr.target}>{target} {unit}</Text>
      </View>
      <View style={nr.track}>
        <View style={[nr.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const nr = StyleSheet.create({
  row:       { marginBottom: 18 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  emoji:     { fontSize: 16, marginRight: 6 },
  label:     { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
  chip:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  chipText:  { fontSize: 11, fontWeight: '700' },
  valRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  current:   { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  separator: { fontSize: 14, color: '#94A3B8', marginHorizontal: 4 },
  target:    { fontSize: 13, color: '#64748B' },
  track:     { height: 8, backgroundColor: '#F1F5F9', borderRadius: 99, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 99 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WellnessScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [selectedDate] = useState<Date>(new Date());

  // Handle deep link to specific tab
  useEffect(() => {
    if (tab === 'gdm' || tab === 'daily' || tab === 'weekly') {
      setActiveTab(tab as Tab);
    }
  }, [tab]);

  // Daily
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);
  const [dailyData, setDailyData] = useState<any[]>([]);

  // Weekly
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  // GDM
  const [gdmCache, setGdmCache] = useState<GDMCacheEntry | null>(null);
  const [gdmExpired, setGdmExpired] = useState(true);
  const [daysUntilNext, setDaysUntilNext] = useState<number | null>(null);
  const [isCheckingGdm, setIsCheckingGdm] = useState(false);
  const [gdmError, setGdmError] = useState<string | null>(null);

  // ── Load on tab change ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'daily') loadDaily();
    else if (activeTab === 'weekly') loadWeekly();
    else if (activeTab === 'gdm') loadGdmCache();
  }, [activeTab]);

  const loadDaily = async () => {
    setIsLoadingDaily(true);
    try {
      const data = await mealService.getDailyNutrition(ACTIVE_USER_ID, selectedDate);
      setDailyData(data);
    } catch { /* silent */ }
    setIsLoadingDaily(false);
  };

  const loadWeekly = async () => {
    setIsLoadingWeekly(true);
    try {
      const data = await mealService.getWeeklyTrends(ACTIVE_USER_ID);
      setWeeklyData(data);
    } catch { /* silent */ }
    setIsLoadingWeekly(false);
  };

  const loadGdmCache = useCallback(async () => {
    const { entry, isExpired, daysUntilNextCheck } = await gdmCacheService.load(ACTIVE_USER_ID);
    setGdmCache(entry);
    setGdmExpired(isExpired);
    setDaysUntilNext(daysUntilNextCheck);
  }, []);

  // ── On-demand GDM check ───────────────────────────────────────────────────
  const handleCheckGdm = async () => {
    setIsCheckingGdm(true);
    setGdmError(null);
    try {
      const profile = await gdmRiskService.getMaternalProfile(ACTIVE_USER_ID);
      if (!profile) {
        setGdmError('Could not load your maternal health profile. Please complete your profile first.');
        return;
      }
      const result = await gdmRiskService.assessRisk(profile);
      const gestationalWeek = profile.gestational_week || 24;
      const entry = await gdmCacheService.save(ACTIVE_USER_ID, result, gestationalWeek);
      setGdmCache(entry);
      setGdmExpired(false);
      setDaysUntilNext(
        Math.floor((new Date(entry.nextCheckDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    } catch (err: any) {
      setGdmError(err.message || 'Risk assessment failed. Please try again.');
    } finally {
      setIsCheckingGdm(false);
    }
  };

  // ── Daily totals ──────────────────────────────────────────────────────────
  const getDailyTotals = () =>
    dailyData.reduce(
      (acc, log) => ({
        carbs:   acc.carbs   + (log.total_carbs_g   || 0),
        sugar:   acc.sugar   + (log.total_sugar_g   || 0),
        fiber:   acc.fiber   + (log.total_fiber_g   || 0),
        fat:     acc.fat     + (log.total_fat_g     || 0),
        iron:    acc.iron    + (log.total_iron_mg   || 0),
        calcium: acc.calcium + (log.total_calcium_mg || 0),
      }),
      { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 }
    );

  // ═══════════════════════════════════════════════════════════════════
  //  TAB RENDERS
  // ═══════════════════════════════════════════════════════════════════

  const renderDaily = () => {
    if (isLoadingDaily) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;

    if (dailyData.length === 0) {
      return (
        <View style={s.emptyCard}>
          <Calendar size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>No meals logged today</Text>
          <Text style={s.emptySubtitle}>Scan your meals to track your nutrition.</Text>
          <TouchableOpacity onPress={() => router.push('/detect' as any)} style={s.logBtn}>
            <Text style={s.logBtnText}>Log a Meal</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const t = getDailyTotals();
    // Sugar target — tighter for High Risk GDM
    const sugarTarget =
      gdmCache?.result.riskCategory === 'High Risk'
        ? GDM_HIGH_SUGAR_LIMIT
        : PREGNANCY_NUTRITION_TARGETS.sugarG;

    return (
      <View style={s.tabContent}>

        {/* GDM Alert Banner if High Risk */}
        {gdmCache && !gdmExpired && gdmCache.result.riskCategory !== 'Low Risk' && (
          <View style={[
            s.gdmBanner,
            gdmCache.result.riskCategory === 'High Risk'
              ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
              : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
          ]}>
            <ShieldAlert
              size={18}
              color={gdmCache.result.riskCategory === 'High Risk' ? '#DC2626' : '#D97706'}
              style={{ marginRight: 8 }}
            />
            <Text style={[
              s.gdmBannerText,
              { color: gdmCache.result.riskCategory === 'High Risk' ? '#991B1B' : '#78350F' },
            ]}>
              GDM: {gdmCache.result.riskCategory} — Monitor your sugar & carb intake closely.
            </Text>
          </View>
        )}

        {/* Nutrient Targets card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Today's Nutrient Status</Text>
          <NutrientRow label="Iron"     emoji="🩸" current={t.iron}    target={PREGNANCY_NUTRITION_TARGETS.ironMg}    unit="mg" />
          <NutrientRow label="Calcium"  emoji="🦷" current={t.calcium} target={PREGNANCY_NUTRITION_TARGETS.calciumMg} unit="mg" />
          <NutrientRow label="Fiber"    emoji="🌾" current={t.fiber}   target={PREGNANCY_NUTRITION_TARGETS.fiberG}    unit="g" />
          <NutrientRow label="Carbs"    emoji="🍞" current={t.carbs}   target={PREGNANCY_NUTRITION_TARGETS.carbsG}    unit="g" />
          <NutrientRow label="Sugar"    emoji="🍬" current={t.sugar}   target={sugarTarget}  unit="g" isUpperLimit />
          <NutrientRow label="Fat"      emoji="🥑" current={t.fat}     target={PREGNANCY_NUTRITION_TARGETS.fatG}      unit="g" isUpperLimit />

          {/* Low iron alert */}
          {t.iron < PREGNANCY_NUTRITION_TARGETS.ironMg * 0.5 && (
            <View style={s.alertBox}>
              <AlertCircle size={16} color="#D97706" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={s.alertText}>Iron intake is less than 50% of today's target. Consider iron-rich foods.</Text>
            </View>
          )}
          {/* Sugar over limit */}
          {t.sugar > sugarTarget && (
            <View style={[s.alertBox, { backgroundColor: '#FEF2F2' }]}>
              <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={[s.alertText, { color: '#7F1D1D' }]}>
                Sugar intake exceeded today's {gdmCache?.result.riskCategory === 'High Risk' ? 'GDM-adjusted ' : ''}limit of {sugarTarget}g.
              </Text>
            </View>
          )}
        </View>

        {/* Today's Meals Timeline */}
        <Text style={s.sectionTitle}>Today's Meals</Text>
        {dailyData.map((log) => (
          <View key={log.id} style={s.mealCard}>
            <View style={s.mealCardHeader}>
              <View style={s.mealTypeBadge}>
                <Text style={s.mealTypeText}>{log.meal_type}</Text>
              </View>
              <Text style={s.mealNutrSummary}>
                {(log.total_carbs_g || 0).toFixed(0)}g carbs · {(log.total_sugar_g || 0).toFixed(0)}g sugar
              </Text>
            </View>
            {log.meal_items?.map((item: any) => (
              <Text key={item.id} style={s.mealItem}>• {item.item_name}
                {item.serving_multiplier > 1 ? ` ×${item.serving_multiplier}` : ''}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderWeekly = () => {
    if (isLoadingWeekly) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;

    if (weeklyData.length === 0) {
      return (
        <View style={s.emptyCard}>
          <TrendingUp size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>No weekly data</Text>
          <Text style={s.emptySubtitle}>Keep logging your meals to see your weekly nutrition trends.</Text>
        </View>
      );
    }

    // Simple 7-day summary
    const weekTotals = weeklyData.reduce(
      (acc, log) => ({
        carbs:   acc.carbs   + (log.total_carbs_g   || 0),
        sugar:   acc.sugar   + (log.total_sugar_g   || 0),
        iron:    acc.iron    + (log.total_iron_mg   || 0),
        calcium: acc.calcium + (log.total_calcium_mg || 0),
      }),
      { carbs: 0, sugar: 0, iron: 0, calcium: 0 }
    );

    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <Text style={s.cardTitle}>7-Day Summary</Text>
          <Text style={s.weekSubtitle}>{weeklyData.length} meals logged this week</Text>
          <View style={s.weekGrid}>
            {[
              { label: 'Total Carbs', value: weekTotals.carbs.toFixed(0), unit: 'g', emoji: '🍞' },
              { label: 'Total Sugar', value: weekTotals.sugar.toFixed(0), unit: 'g', emoji: '🍬' },
              { label: 'Iron',        value: weekTotals.iron.toFixed(1),  unit: 'mg', emoji: '🩸' },
              { label: 'Calcium',     value: weekTotals.calcium.toFixed(0), unit: 'mg', emoji: '🦷' },
            ].map((item) => (
              <View key={item.label} style={s.weekCard}>
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                <Text style={s.weekCardValue}>{item.value}<Text style={s.weekCardUnit}> {item.unit}</Text></Text>
                <Text style={s.weekCardLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {weeklyData.map((log) => (
          <View key={log.id} style={s.mealCard}>
            <View style={s.mealCardHeader}>
              <Text style={s.mealTypeText}>{new Date(log.logged_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              <Text style={s.mealNutrSummary}>{log.meal_type}</Text>
            </View>
            <Text style={s.mealItem}>
              Carbs: {(log.total_carbs_g||0).toFixed(1)}g · Sugar: {(log.total_sugar_g||0).toFixed(1)}g · Iron: {(log.total_iron_mg||0).toFixed(1)}mg
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGdm = () => {
    const hasValidCache = gdmCache && !gdmExpired;
    const result: GDMRiskResponse | undefined = gdmCache?.result;
    const isHigh = result?.riskCategory === 'High Risk';
    const isMod  = result?.riskCategory === 'Moderate Risk';

    const RISK_CONFIG = {
      'High Risk':     { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#7F1D1D' },
      'Moderate Risk': { bg: '#FFFBEB', iconBg: '#FEF3C7', iconColor: '#D97706', textColor: '#78350F' },
      'Low Risk':      { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#065F46' },
    };
    const cfg = result ? RISK_CONFIG[result.riskCategory] : null;

    return (
      <View style={s.tabContent}>

        {/* ── Cached result display ─────────────────────── */}
        {hasValidCache && result && cfg && (
          <View style={[s.card, { backgroundColor: cfg.bg }]}>
            {/* Icon + title */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[s.gdmIconCircle, { backgroundColor: cfg.iconBg }]}>
                {isHigh || isMod
                  ? <ShieldAlert size={40} color={cfg.iconColor} />
                  : <CheckCircle2 size={40} color={cfg.iconColor} />}
              </View>
              <Text style={[s.gdmRiskTitle, { color: cfg.textColor }]}>{result.riskCategory}</Text>
              {result.probability !== undefined && (
                <Text style={[s.gdmProb, { color: cfg.iconColor }]}>
                  Risk score: {Math.round(result.probability * 100)}%
                </Text>
              )}
            </View>

            {/* Message */}
            <View style={[s.messageBox, { backgroundColor: '#FFFFFF44' }]}>
              <Text style={[s.messageText, { color: cfg.textColor }]}>{result.message}</Text>
            </View>

            {/* Next check info */}
            <View style={s.nextCheckRow}>
              <Calendar size={14} color={cfg.iconColor} style={{ marginRight: 6 }} />
              <Text style={[s.nextCheckText, { color: cfg.textColor }]}>
                Checked: {formatDate(gdmCache!.checkedAt)}
              </Text>
            </View>
            <View style={s.nextCheckRow}>
              <Zap size={14} color={cfg.iconColor} style={{ marginRight: 6 }} />
              <Text style={[s.nextCheckText, { color: cfg.textColor }]}>
                Next check recommended:{' '}
                <Text style={{ fontWeight: '700' }}>
                  {daysUntilNext === 0 ? 'Today' : `in ${daysUntilNext} days (${formatDate(gdmCache!.nextCheckDate)})`}
                </Text>
              </Text>
            </View>

            {/* Re-check button (still allow if user wants) */}
            <TouchableOpacity
              onPress={handleCheckGdm}
              disabled={isCheckingGdm}
              style={s.reCheckBtn}
              activeOpacity={0.8}
            >
              {isCheckingGdm
                ? <ActivityIndicator color="#64748B" size="small" style={{ marginRight: 8 }} />
                : <RefreshCw size={15} color="#64748B" style={{ marginRight: 6 }} />}
              <Text style={s.reCheckBtnText}>Re-check Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Expired or no cache — show main check button ─────────────── */}
        {(!hasValidCache) && (
          <View style={s.card}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={[s.gdmIconCircle, { backgroundColor: '#F1F5F9', marginBottom: 16 }]}>
                <HeartPulse size={40} color="#64748B" />
              </View>
              <Text style={s.gdmCheckTitle}>
                {gdmCache && gdmExpired
                  ? 'Time for Your Next GDM Check'
                  : 'Check Your GDM Risk'}
              </Text>
              <Text style={s.gdmCheckSub}>
                {gdmCache && gdmExpired
                  ? `Your last assessment was on ${formatDate(gdmCache.checkedAt)}. Based on your risk level, it's time to re-assess.`
                  : 'Run a personalised risk assessment using your maternal health profile.'}
              </Text>

              {gdmError && (
                <View style={[s.alertBox, { marginBottom: 16 }]}>
                  <AlertCircle size={16} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={[s.alertText, { color: '#7F1D1D' }]}>{gdmError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleCheckGdm}
                disabled={isCheckingGdm}
                style={s.checkRiskBtn}
                activeOpacity={0.88}
              >
                {isCheckingGdm ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 10 }} />
                    <Text style={s.checkRiskBtnText}>Analysing your profile...</Text>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
                    <Text style={s.checkRiskBtnText}>Check GDM Risk</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={s.gdmDisclaimer}>
                This uses your saved maternal health profile (age, BMI, OGTT, blood pressure, etc.).
                The result is for guidance only — not a medical diagnosis.
              </Text>
            </View>
          </View>
        )}

        {/* ── What affects GDM risk ──────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>What's Assessed</Text>
          {[
            ['🎂', 'Age & Number of Pregnancies'],
            ['⚖️',  'BMI & Weight'],
            ['💉', 'OGTT Glucose Level'],
            ['🩺', 'Blood Pressure (Sys/Dia)'],
            ['🩸', 'Haemoglobin Level'],
            ['👪', 'Family History & PCOS'],
            ['🤰', 'Previous Pregnancy Complications'],
          ].map(([emoji, label]) => (
            <View key={label} style={s.factorRow}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>{emoji}</Text>
              <Text style={s.factorLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Maternal Health</Text>
        <Text style={s.headerSub}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Tab Bar — pure inline styles, no className */}
      <View style={s.tabBar}>
        {(['daily', 'weekly', 'gdm'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabItem, isActive && s.tabItemActive]}
            >
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                {tab === 'gdm' ? 'GDM Risk' : tab === 'daily' ? 'Daily' : 'Weekly'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'daily'   && renderDaily()}
        {activeTab === 'weekly'  && renderWeekly()}
        {activeTab === 'gdm'     && renderGdm()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  headerTitle:   { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerSub:     { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  // Tab bar
  tabBar:        { flexDirection: 'row', marginHorizontal: 16, backgroundColor: 'rgba(203,213,225,0.5)', borderRadius: 12, padding: 4, marginBottom: 8 },
  tabItem:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabLabel:      { fontWeight: '600', fontSize: 13, color: '#64748B' },
  tabLabelActive:{ color: '#0F172A' },

  // Layout
  tabContent:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },
  card:          { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 16 },
  cardTitle:     { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10, marginLeft: 2 },

  // Empty state
  emptyCard:     { alignItems: 'center', justifyContent: 'center', marginTop: 48, marginHorizontal: 16, backgroundColor: '#FFFFFF', padding: 28, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  logBtn:        { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 },
  logBtnText:    { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  // Alert box
  alertBox:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginTop: 8 },
  alertText:     { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },

  // Meal cards
  mealCard:      { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  mealCardHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mealTypeBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 10 },
  mealTypeText:  { fontWeight: '700', color: '#065F46', fontSize: 13, textTransform: 'capitalize' },
  mealNutrSummary:{ fontSize: 12, color: '#94A3B8' },
  mealItem:      { fontSize: 13, color: '#475569', marginBottom: 3, lineHeight: 18 },

  // GDM banner
  gdmBanner:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  gdmBannerText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // GDM result
  gdmIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gdmRiskTitle:  { fontSize: 24, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  gdmProb:       { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  messageBox:    { borderRadius: 14, padding: 14, width: '100%', marginBottom: 14 },
  messageText:   { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  nextCheckRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  nextCheckText: { fontSize: 13, lineHeight: 18, flex: 1 },
  reCheckBtn:    { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignSelf: 'center' },
  reCheckBtnText:{ fontSize: 13, fontWeight: '600', color: '#64748B' },

  // GDM check CTA
  gdmCheckTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  gdmCheckSub:   { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  checkRiskBtn:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#047857', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 20, shadowColor: '#047857', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  checkRiskBtnText:{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  gdmDisclaimer: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 16, lineHeight: 16, paddingHorizontal: 8 },

  // Weekly
  weekSubtitle:  { fontSize: 13, color: '#64748B', marginBottom: 14 },
  weekGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  weekCard:      { width: '47%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  weekCardValue: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginTop: 6 },
  weekCardUnit:  { fontSize: 13, fontWeight: '400', color: '#64748B' },
  weekCardLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // GDM factors
  factorRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  factorLabel:   { fontSize: 14, color: '#334155', fontWeight: '500' },
});
