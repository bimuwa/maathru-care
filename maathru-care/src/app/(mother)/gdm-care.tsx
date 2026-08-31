import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, LayoutAnimation, Platform, UIManager,
  FlatList, ViewToken
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  HeartPulse, Calendar, AlertCircle, CheckCircle2,
  ShieldAlert, RefreshCw, Zap, Activity, Info, Check, TrendingUp,
  Camera, ChevronLeft, ChevronRight, CalendarX
} from 'lucide-react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import { mealService } from '@/services/mealService';
import { gdmRiskService } from '@/services/gdmRiskService';
import { gdmCacheService, GDMCacheEntry } from '@/services/gdmCacheService';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';
import { useAuth } from '@/context/AuthContext';
import { GDMRiskResponse } from '@/types/gdm';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

type Tab = 'daily' | 'weekly' | 'gdm';

// ─── Constants & Colors ───────────────────────────────────────────────────────
const GDM_HIGH_SUGAR_LIMIT = 20;

const COLORS = {
  primary: '#059669',
  primaryLight: '#10B981',
  primaryBg: '#ECFDF5',
  secondary: '#0D9488',
  secondaryBg: '#CCFBF1',
  accent: '#E11D48',
  accentBg: '#FFF1F2',
  amber: '#D97706',
  amberBg: '#FFFBEB',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textHeader: '#0F172A',
  textMain: '#334155',
  textMuted: '#64748B',
  border: '#F1F5F9'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  // Re-adjust if it's parsed as UTC to local date if necessary, but assuming YYYY-MM-DD input, this might be off by timezone.
  // Better approach for YYYY-MM-DD string:
  const [y, m, day] = iso.split('-');
  if (!y || !m || !day) return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const localDate = new Date(Number(y), Number(m)-1, Number(day));
  return localDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getLocalDateString(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const formatLocalTime = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

function getGestationalText(week: number | undefined) {
  if (!week) return null;
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return `Week ${week} • ${trimester}${trimester === 1 ? 'st' : trimester === 2 ? 'nd' : 'rd'} Trimester`;
}

// ─── SVG Components ───────────────────────────────────────────────────────────
const SemiCircleGauge = ({ current, target, color = COLORS.primary }: { current: number, target: number, color?: string }) => {
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = radius * Math.PI;

  const pct = Math.min(current / target, 1);
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <View style={{ width: size, height: size / 2 + 10, alignItems: 'center' }}>
      <Svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={{ position: 'absolute', bottom: 5, alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.textHeader, lineHeight: 36 }}>
          {current.toLocaleString()}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500' }}>
          / {target.toLocaleString()} kcal
        </Text>
      </View>
    </View>
  );
};

// ─── Sub-Components ───────────────────────────────────────────────────────────
const SegmentedControl = ({ active, onChange }: { active: Tab, onChange: (t: Tab) => void }) => {
  const tabs: { key: Tab, label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'gdm', label: 'GDM Risk' }
  ];

  return (
    <View style={s.segmentContainer}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[s.segmentBtn, isActive && s.segmentBtnActive]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(t.key);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentText, isActive && s.segmentTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const NutrientRing = ({ label, current, target, unit, color, isUpperLimit }: any) => {
  const rawPct = current / target;
  const pct = Math.min(rawPct, 1);
  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - pct * circ;

  const isExceeded = isUpperLimit && current > target;
  const displayColor = isExceeded ? COLORS.accent : color;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: size, height: size, marginRight: 12 }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F5F9" strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={displayColor} strokeWidth={stroke} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: isExceeded ? COLORS.accent : COLORS.textHeader }}>{Math.round(rawPct * 100)}%</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: isExceeded ? COLORS.accent : COLORS.textMain }}>{label}</Text>
        <Text style={{ fontSize: 13, color: isExceeded ? COLORS.accent : COLORS.textMuted }}>{current.toFixed(1)} / {target} {unit}</Text>
      </View>
    </View>
  );
};

const SmartInsightCard = ({ icon: Icon, title, description, isPositive }: any) => (
  <View style={s.insightCard}>
    <View style={[s.insightIconBg, { backgroundColor: isPositive ? COLORS.primaryBg : COLORS.amberBg }]}>
      <Icon size={18} color={isPositive ? COLORS.primary : COLORS.amber} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.insightTitle}>{title}</Text>
      <Text style={s.insightDesc}>{description}</Text>
    </View>
  </View>
);

const SimpleBarChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data, 1);
  return (
    <View style={s.chartContainer}>
      {data.map((val, idx) => (
        <View key={idx} style={s.chartCol}>
          <View style={s.chartTrack}>
            {val > 0 && (
              <View style={[s.chartBar, { height: `${(val / max) * 100}%`, backgroundColor: color }]} />
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WellnessScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { user } = useAuth();
  const userId = user?.id || '';

  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [maternalProfile, setMaternalProfile] = useState<any>(null);

  // Deep link handling
  useEffect(() => {
    if (tab === 'gdm' || tab === 'daily' || tab === 'weekly') setActiveTab(tab as Tab);
  }, [tab]);

  // Load Profile globally for Header
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await gdmRiskService.getMaternalProfile(userId);
      setMaternalProfile(profile);
    };
    loadProfile();
  }, []);

  // Daily Data & Caching
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [selectedDateIso, setSelectedDateIso] = useState<string>(getLocalDateString(new Date()));
  const [dailyDataMap, setDailyDataMap] = useState<Record<string, any[]>>({});
  const [isLoadingDailyMap, setIsLoadingDailyMap] = useState<Record<string, boolean>>({});
  const flatListRef = React.useRef<FlatList>(null);
  
  useEffect(() => {
    if (maternalProfile) {
      const start = maternalProfile.created_at ? new Date(maternalProfile.created_at) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date();
      
      const dates: string[] = [];
      let curr = new Date(start);
      curr.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      
      while (curr <= end) {
        dates.push(getLocalDateString(curr));
        curr.setDate(curr.getDate() + 1);
      }
      if (dates.length === 0) dates.push(getLocalDateString(end));
      setDateRange(dates);
      
      // Auto-scroll to end on first load
      setTimeout(() => {
        if (flatListRef.current && dates.length > 0) {
          flatListRef.current.scrollToIndex({ index: dates.length - 1, animated: false });
        }
      }, 100);
    }
  }, [maternalProfile]);

  // Weekly
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);

  // GDM
  const [gdmCache, setGdmCache] = useState<GDMCacheEntry | null>(null);
  const [gdmExpired, setGdmExpired] = useState(true);
  const [daysUntilNext, setDaysUntilNext] = useState<number | null>(null);
  const [isCheckingGdm, setIsCheckingGdm] = useState(false);
  const [assessmentStage, setAssessmentStage] = useState(0);
  const [gdmError, setGdmError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'daily' && selectedDateIso) loadDailyForDate(selectedDateIso, true);
      else if (activeTab === 'weekly') loadWeekly();
      else if (activeTab === 'gdm') loadGdmCache();
    }, [activeTab, selectedDateIso])
  );

  const loadDailyForDate = async (dateIso: string, force = false) => {
    if (!force && dailyDataMap[dateIso]) return; // Already cached
    
    setIsLoadingDailyMap(prev => ({ ...prev, [dateIso]: true }));
    try {
      const data = await mealService.getDailyNutrition(userId, new Date(dateIso));
      setDailyDataMap(prev => ({ ...prev, [dateIso]: data }));
    } catch { }
    setIsLoadingDailyMap(prev => ({ ...prev, [dateIso]: false }));
  };

  const loadWeekly = async () => {
    setIsLoadingWeekly(true);
    try {
      const data = await mealService.getWeeklyTrends(userId);
      setWeeklyData(data);
    } catch { }
    setIsLoadingWeekly(false);
  };

  const loadGdmCache = useCallback(async () => {
    const { entry, isExpired, daysUntilNextCheck } = await gdmCacheService.load(userId);
    setGdmCache(entry);
    setGdmExpired(isExpired);
    setDaysUntilNext(daysUntilNextCheck);
  }, []);

  const handleCheckGdm = async () => {
    setIsCheckingGdm(true);
    setGdmError(null);
    setAssessmentStage(0);
    
    let currentStage = 0;
    const stageInterval = setInterval(() => {
      currentStage = Math.min(currentStage + 1, 3);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAssessmentStage(currentStage);
    }, 600);

    try {
      const profile = await gdmRiskService.getMaternalProfile(userId);
      if (!profile) {
        clearInterval(stageInterval);
        setGdmError('Could not load your maternal health profile. Please complete your profile first.');
        setIsCheckingGdm(false);
        return;
      }
      
      const apiPromise = gdmRiskService.assessRisk(profile);
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));
      
      const [result] = await Promise.all([apiPromise, minDelayPromise]);
      
      const gestationalWeek = profile.gestational_week || 24;
      const entry = await gdmCacheService.save(userId, result, gestationalWeek);
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setGdmCache(entry);
      setGdmExpired(false);
      setDaysUntilNext(
        Math.floor((new Date(entry.nextCheckDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    } catch (err: any) {
      setGdmError(err.message || 'Risk assessment failed. Please try again.');
    } finally {
      clearInterval(stageInterval);
      setIsCheckingGdm(false);
    }
  };




  // ═══════════════════════════════════════════════════════════════════
  //  DAILY TAB
  // ═══════════════════════════════════════════════════════════════════
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setSelectedDateIso(viewableItems[0].item);
    }
  }, []);
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const handleJumpToToday = () => {
    if (dateRange.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: dateRange.length - 1, animated: true });
    }
  };

  const handlePrevDay = () => {
    const idx = dateRange.indexOf(selectedDateIso);
    if (idx > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx - 1, animated: true });
    }
  };

  const handleNextDay = () => {
    const idx = dateRange.indexOf(selectedDateIso);
    if (idx < dateRange.length - 1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: idx + 1, animated: true });
    }
  };

  const renderDailyItem = ({ item: dateIso }: { item: string }) => {
    const dailyData = dailyDataMap[dateIso] || [];
    const isLoadingDaily = isLoadingDailyMap[dateIso];
    const isToday = dateIso === getLocalDateString(new Date());

    if (isLoadingDaily) {
      return (
        <ScrollView style={{ width }} contentContainerStyle={[s.tabContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          <View style={s.skeletonCard}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          </View>
        </ScrollView>
      );
    }

    if (dailyData.length === 0) {
      return (
        <ScrollView style={{ width }} contentContainerStyle={[s.tabContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          <View style={[s.emptyCard, { marginTop: 20 }]}>
            <View style={s.emptyIconContainer}>
              <CalendarX size={48} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>No Meal Logs for This Day</Text>
            <Text style={s.emptySubtitle}>
              You didn't log any meals on {formatDate(dateIso)}.{'\n'}
              Start tracking to view your maternal nutrient breakdown.
            </Text>
            <TouchableOpacity 
              style={s.btnPrimary}
              onPress={() => router.push(`/detect?date=${dateIso}` as any)}
            >
              <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.btnPrimaryText}>Log a Meal for This Day</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    const tVals = dailyData.reduce(
      (acc, log) => ({
        carbs: acc.carbs + (log.total_carbs_g || 0),
        sugar: acc.sugar + (log.total_sugar_g || 0),
        fiber: acc.fiber + (log.total_fiber_g || 0),
        fat: acc.fat + (log.total_fat_g || 0),
        iron: acc.iron + (log.total_iron_mg || 0),
        calcium: acc.calcium + (log.total_calcium_mg || 0),
      }),
      { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 }
    );
    const estKcal = Math.round((tVals.carbs * 4) + (tVals.fat * 9) + 200);

    const isHighRisk = gdmCache?.result.riskCategory === 'High Risk';
    const sugarTarget = isHighRisk ? GDM_HIGH_SUGAR_LIMIT : PREGNANCY_NUTRITION_TARGETS.sugarG;
    const sugarStatus = tVals.sugar > sugarTarget ? 'exceeded' : tVals.sugar > sugarTarget * 0.75 ? 'attention' : 'normal';

    const getMovementRecommendation = () => {
      if (sugarStatus === 'exceeded') return { show: true, title: 'Gentle Movement', text: 'A short, comfortable walk is a simple way to stay active and support balance.' };
      if (sugarStatus === 'attention') return { show: true, title: 'Light Activity', text: 'A 10-minute stroll after your meal helps maintain steady energy levels.' };
      if (tVals.carbs > PREGNANCY_NUTRITION_TARGETS.carbsG) return { show: true, title: 'Energy Balance', text: 'A gentle walk can be a great way to utilize your energy after a satisfying meal.' };
      if (tVals.iron > 0 && tVals.iron < PREGNANCY_NUTRITION_TARGETS.ironMg * 0.3) return { show: true, title: 'Listen to Your Body', text: 'If you are feeling a bit tired, gentle stretching or resting is perfectly fine today.' };
      return { show: false, title: '', text: '' };
    };
    const movement = getMovementRecommendation();

    return (
      <ScrollView style={{ width }} contentContainerStyle={[s.tabContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { alignItems: 'center' }]}>
          <Text style={s.cardTitleCentered}>{isToday ? "Today's Nutrition" : `${formatDate(dateIso)} Nutrition`}</Text>
          <SemiCircleGauge current={estKcal} target={1800} color={COLORS.primary} />
        </View>

        <View style={s.cardRow}>
          <View style={[s.cardHalf, { backgroundColor: sugarStatus === 'exceeded' ? COLORS.accentBg : sugarStatus === 'attention' ? COLORS.amberBg : COLORS.primaryBg }]}>
            <Text style={s.smallTitle}>Glycemic Balance</Text>
            <Text style={[s.statusBig, { color: sugarStatus === 'exceeded' ? COLORS.accent : sugarStatus === 'attention' ? COLORS.amber : COLORS.primary }]}>
              {sugarStatus === 'exceeded' ? 'Target Exceeded' : sugarStatus === 'attention' ? 'Needs Attention' : 'On Track'}
            </Text>
            <Text style={s.tinyDesc}>{tVals.sugar.toFixed(1)} / {sugarTarget}g sugar</Text>
          </View>
          {movement.show && (
            <View style={[s.cardHalf, { backgroundColor: '#F8FAFC' }]}>
              <Text style={s.smallTitle}>{movement.title}</Text>
              <Text style={s.movementText}>{movement.text}</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Nutrient Balance</Text>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <NutrientRing label="Iron" current={tVals.iron} target={PREGNANCY_NUTRITION_TARGETS.ironMg} unit="mg" color={COLORS.amber} />
              <NutrientRing label="Calcium" current={tVals.calcium} target={PREGNANCY_NUTRITION_TARGETS.calciumMg} unit="mg" color={COLORS.secondary} />
              <NutrientRing label="Fiber" current={tVals.fiber} target={PREGNANCY_NUTRITION_TARGETS.fiberG} unit="g" color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <NutrientRing label="Carbs" current={tVals.carbs} target={PREGNANCY_NUTRITION_TARGETS.carbsG} unit="g" color={COLORS.primaryLight} />
              <NutrientRing label="Sugar" current={tVals.sugar} target={sugarTarget} unit="g" color={COLORS.amber} isUpperLimit={true} />
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Meals</Text>
        <View style={s.timelineContainer}>
          {dailyData.map((log, index) => (
            <View key={log.id} style={s.timelineRow}>
              <View style={s.timelineLineContainer}>
                <View style={s.timelineDot} />
                {index < dailyData.length - 1 && <View style={s.timelineLine} />}
              </View>
              <View style={s.timelineContent}>
                <View style={s.timelineHeader}>
                  <Text style={s.timelineType}>{log.meal_type}</Text>
                  <Text style={s.timelineTime}>{formatLocalTime(log.created_at || log.logged_date)}</Text>
                </View>
                <View style={s.chipsRow}>
                  {log.meal_items?.map((item: any) => (
                    <View key={item.id} style={s.foodChip}>
                      <Text style={s.foodChipText}>{item.item_name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.timelineNutr}>
                  {(log.total_carbs_g || 0).toFixed(0)}g Carbs • {(log.total_sugar_g || 0).toFixed(0)}g Sugar • {(log.total_fiber_g || 0).toFixed(0)}g Fiber
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderDaily = () => {
    const isToday = selectedDateIso === getLocalDateString(new Date());
    const idx = dateRange.indexOf(selectedDateIso);
    const hasPrev = idx > 0;
    const hasNext = idx < dateRange.length - 1;

    return (
      <View style={{ flex: 1 }}>
        <View style={s.dateStrip}>
          <TouchableOpacity onPress={handlePrevDay} disabled={!hasPrev} style={[s.dateBtn, !hasPrev && { opacity: 0.3 }]}>
            <ChevronLeft size={24} color={COLORS.textHeader} />
          </TouchableOpacity>
          <View style={s.dateCenter}>
            <Text style={s.dateText}>{isToday ? 'Today, ' : ''}{formatDate(selectedDateIso)}</Text>
            {!isToday && (
              <TouchableOpacity onPress={handleJumpToToday} style={s.jumpBtn}>
                <Text style={s.jumpBtnText}>Jump to Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleNextDay} disabled={!hasNext} style={[s.dateBtn, !hasNext && { opacity: 0.3 }]}>
            <ChevronRight size={24} color={COLORS.textHeader} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={dateRange}
          keyExtractor={(item) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderDailyItem}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={dateRange.length > 0 ? dateRange.length - 1 : 0}
          getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
        />
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  WEEKLY TAB
  // ═══════════════════════════════════════════════════════════════════
  const renderWeekly = () => {
    if (isLoadingWeekly) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />;

    if (weeklyData.length === 0) {
      return (
        <View style={s.emptyCard}>
          <TrendingUp size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>Your Week at a Glance</Text>
          <Text style={s.emptySubtitle}>Keep logging your meals to see your weekly nutrition trends.</Text>
        </View>
      );
    }

    const last7DaysData = Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const logs = weeklyData.filter(w => w.logged_date === dateStr);
      return {
        date: dateStr,
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        carbs: logs.reduce((sum, l) => sum + (l.total_carbs_g || 0), 0),
        sugar: logs.reduce((sum, l) => sum + (l.total_sugar_g || 0), 0),
        fiber: logs.reduce((sum, l) => sum + (l.total_fiber_g || 0), 0),
      };
    });

    const carbsArr = last7DaysData.map(d => d.carbs);
    const sugarArr = last7DaysData.map(d => d.sugar);

    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Carbohydrate Trend</Text>
          <SimpleBarChart data={carbsArr} color={COLORS.secondary} />
          <View style={s.chartLabels}>
            {last7DaysData.map((d, i) => <Text key={i} style={s.chartLabel}>{d.dayName}</Text>)}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sugar Intake</Text>
          <SimpleBarChart data={sugarArr} color={COLORS.amber} />
          <View style={s.chartLabels}>
            {last7DaysData.map((d, i) => <Text key={i} style={s.chartLabel}>{d.dayName}</Text>)}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>This week's insight</Text>
          <Text style={s.insightDesc}>
            Your tracking is consistent. Based on this week, focus on maintaining balanced complex carbohydrates to support steady energy levels.
          </Text>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  GDM TAB
  // ═══════════════════════════════════════════════════════════════════
  const renderGdm = () => {
    const hasValidCache = gdmCache && !gdmExpired;
    const result: GDMRiskResponse | undefined = gdmCache?.result;

    const fields = [
      'age', 'gestational_week', 'no_of_pregnancy', 'bmi',
      'sys_bp', 'dia_bp', 'ogtt', 'hemoglobin'
    ];
    let filled = 0;
    if (maternalProfile) {
      filled = fields.filter(f => maternalProfile[f] !== undefined && maternalProfile[f] !== null).length;
    }

    if (isCheckingGdm) {
      const isStage1 = assessmentStage >= 1;
      const isStage2 = assessmentStage >= 2;
      const isStage3 = assessmentStage >= 3;

      return (
        <View style={s.tabContent}>
          <View style={s.card}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={s.pulsingIconContainer}>
                <Activity size={32} color={COLORS.primary} />
              </View>
              <Text style={s.cardTitleCentered}>GDM Risk Assessment</Text>
            </View>

            <View style={s.assessmentStep}>
              <View style={s.stepIcon}>
                {isStage1 ? <CheckCircle2 size={20} color={COLORS.primary} /> : <ActivityIndicator size="small" color={COLORS.primary} />}
              </View>
              <View style={s.stepTextContainer}>
                <Text style={s.stepTitle}>Reviewing maternal profile</Text>
                {isStage1 && maternalProfile?.gestational_week && (
                  <Text style={s.stepSubtitle}>Gestational age — {maternalProfile.gestational_week} weeks</Text>
                )}
              </View>
            </View>

            {isStage1 && (
              <View style={s.assessmentStep}>
                <View style={s.stepIcon}>
                  {isStage2 ? <CheckCircle2 size={20} color={COLORS.primary} /> : <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>
                <View style={s.stepTextContainer}>
                  <Text style={s.stepTitle}>Checking health indicators</Text>
                  {isStage2 && maternalProfile?.bmi && (
                    <Text style={s.stepSubtitle}>BMI — {maternalProfile.bmi}</Text>
                  )}
                </View>
              </View>
            )}

            {isStage2 && (
              <View style={s.assessmentStep}>
                <View style={s.stepIcon}>
                  {isStage3 ? <CheckCircle2 size={20} color={COLORS.primary} /> : <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>
                <View style={s.stepTextContainer}>
                  <Text style={s.stepTitle}>Reviewing glucose information</Text>
                  {isStage3 && maternalProfile?.ogtt && (
                    <Text style={s.stepSubtitle}>OGTT — {maternalProfile.ogtt} mg/dL</Text>
                  )}
                </View>
              </View>
            )}

            {isStage3 && (
              <View style={s.assessmentStep}>
                <View style={s.stepIcon}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
                <View style={s.stepTextContainer}>
                  <Text style={s.stepTitle}>Generating risk estimate...</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    if (hasValidCache && result) {
      const isHigh = result.riskCategory === 'High Risk';
      const isMod = result.riskCategory === 'Moderate Risk';

      return (
        <View style={s.tabContent}>
          <View style={s.card}>
            <Text style={s.cardTitleCentered}>Estimated Risk</Text>
            <View style={s.riskGauge}>
              <View style={[s.riskGaugeDot, { backgroundColor: isHigh ? COLORS.accent : isMod ? COLORS.amber : COLORS.primary }]} />
              <Text style={s.riskCategoryText}>{result.riskCategory}</Text>
            </View>
            {result.probability !== undefined && (
              <Text style={s.riskProbText}>{Math.round(result.probability * 100)}%</Text>
            )}
            
            <View style={s.guidanceBox}>
              <Text style={s.guidanceTitle}>Guidance</Text>
              <Text style={s.guidanceDesc}>{result.message}</Text>
            </View>
          </View>
          
          <Text style={s.disclaimerText}>
            This result is a risk estimate based on your health profile, not a medical diagnosis. Please discuss your result with your healthcare professional.
          </Text>
          
          <TouchableOpacity onPress={handleCheckGdm} disabled={isCheckingGdm} style={s.btnSecondary}>
             {isCheckingGdm ? <ActivityIndicator size="small" color={COLORS.textMain} /> : <Text style={s.btnSecondaryText}>Reassess Risk</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <View style={s.profileCompleteness}>
            <Text style={s.profileCompletenessTitle}>Health Profile</Text>
            <Text style={s.profileCompletenessVal}>{filled} / {fields.length} fields complete</Text>
          </View>
          <Text style={s.gdmCheckDesc}>
            A risk estimate based on the health information in your maternal profile.
          </Text>

          {gdmError && (
            <View style={[s.alertBox, { backgroundColor: COLORS.accentBg }]}>
              <AlertCircle size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
              <Text style={[s.alertText, { color: COLORS.accent }]}>{gdmError}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCheckGdm}
            disabled={isCheckingGdm || filled < fields.length}
            style={[s.btnPrimary, (filled < fields.length) && { opacity: 0.5 }]}
          >
            <Text style={s.btnPrimaryText}>Calculate Risk</Text>
          </TouchableOpacity>
          {filled < fields.length && (
            <Text style={s.disclaimerText}>Complete your health profile in settings to calculate your risk estimate.</Text>
          )}
        </View>
        <Text style={s.disclaimerText}>
          This result is a risk estimate, not a medical diagnosis. Please discuss your result with your healthcare professional.
        </Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════
  const gestText = getGestationalText(maternalProfile?.gestational_week);

  return (
    <SafeAreaView style={s.root}>
      {/* HEADER */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Maternal Wellness</Text>
          {gestText && (
            <View style={s.gestBadge}>
              <Text style={s.gestBadgeText}>{gestText}</Text>
            </View>
          )}
        </View>
      </View>

      {/* SEGMENTED CONTROL */}
      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {/* CONTENT */}
      {activeTab === 'daily' ? (
        renderDaily()
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {activeTab === 'weekly' && renderWeekly()}
          {activeTab === 'gdm' && renderGdm()}
        </ScrollView>
      )}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/detect' as any)}
        activeOpacity={0.8}
      >
        <Camera size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: COLORS.textHeader, marginBottom: 8 },
  gestBadge: { backgroundColor: COLORS.secondaryBg, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  gestBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  
  segmentContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 20, borderRadius: 24, padding: 4, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.textHeader },

  tabContent: { paddingHorizontal: 20 },
  
  card: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textHeader, marginBottom: 20 },
  cardTitleCentered: { fontSize: 18, fontWeight: '700', color: COLORS.textHeader, marginBottom: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textHeader, marginTop: 12, marginBottom: 12 },
  
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cardHalf: { flex: 1, borderRadius: 20, padding: 16 },
  smallTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 },
  statusBig: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  tinyDesc: { fontSize: 12, color: COLORS.textMuted },
  movementText: { fontSize: 14, color: COLORS.textMain, lineHeight: 20 },

  combinedMacro: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginTop: 10 },
  macroTitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  macroVal: { fontSize: 15, fontWeight: '700', color: COLORS.textHeader },

  insightCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  insightIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  insightTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textHeader, marginBottom: 4 },
  insightDesc: { fontSize: 13, color: COLORS.textMain, lineHeight: 18 },

  timelineContainer: { marginTop: 8 },
  timelineRow: { flexDirection: 'row', minHeight: 70 },
  timelineLineContainer: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 6 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.primaryBg, marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  timelineType: { fontSize: 15, fontWeight: '700', color: COLORS.textHeader, textTransform: 'capitalize' },
  timelineTime: { fontSize: 13, color: COLORS.textMuted },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  foodChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  foodChipText: { fontSize: 13, color: COLORS.textMain },
  timelineNutr: { fontSize: 12, color: COLORS.textMuted },

  emptyCard: { alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 30, backgroundColor: COLORS.card, borderRadius: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textHeader, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  
  btnPrimary: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 20, alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  btnSecondaryText: { color: COLORS.textMain, fontSize: 15, fontWeight: '600' },

  chartContainer: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartTrack: { width: 12, height: '100%', backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted },

  profileCompleteness: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  profileCompletenessTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textHeader },
  profileCompletenessVal: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  gdmCheckDesc: { fontSize: 14, color: COLORS.textMain, marginBottom: 24, lineHeight: 20 },
  
  riskGauge: { alignItems: 'center', marginVertical: 10 },
  riskGaugeDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 8 },
  riskCategoryText: { fontSize: 24, fontWeight: '700', color: COLORS.textHeader },
  riskProbText: { fontSize: 36, fontWeight: '800', color: COLORS.textHeader, textAlign: 'center', marginVertical: 8 },
  guidanceBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginTop: 16 },
  guidanceTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textHeader, marginBottom: 6 },
  guidanceDesc: { fontSize: 14, color: COLORS.textMain, lineHeight: 20 },

  disclaimerText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginVertical: 16, lineHeight: 18, paddingHorizontal: 10 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, marginBottom: 16 },
  alertText: { flex: 1, fontSize: 13, lineHeight: 18 },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  
  dateStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  dateBtn: { padding: 8, backgroundColor: COLORS.card, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: 16, fontWeight: '700', color: COLORS.textHeader },
  jumpBtn: { marginTop: 4, backgroundColor: COLORS.primaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  jumpBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  
  skeletonCard: { backgroundColor: COLORS.card, borderRadius: 24, height: 300, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  
  pulsingIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  assessmentStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepIcon: { width: 24, alignItems: 'center', marginRight: 12, marginTop: 2 },
  stepTextContainer: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textHeader, marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: COLORS.textMain },
});
