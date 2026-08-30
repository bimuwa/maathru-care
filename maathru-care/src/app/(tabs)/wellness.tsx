import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartPulse, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { mealService } from '@/services/mealService';
import { gdmRiskService } from '@/services/gdmRiskService';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';
import { ACTIVE_USER_ID } from '@/constants/userConfig';
import { GDMRiskResponse } from '@/types/gdm';

type Tab = 'daily' | 'weekly' | 'gdm';

export default function WellnessScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [selectedDate] = useState<Date>(new Date());

  const [isLoading, setIsLoading] = useState(false);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [gdmResult, setGdmResult] = useState<GDMRiskResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'daily') {
        const data = await mealService.getDailyNutrition(ACTIVE_USER_ID, selectedDate);
        setDailyData(data);
      } else if (activeTab === 'weekly') {
        const data = await mealService.getWeeklyTrends(ACTIVE_USER_ID);
        setWeeklyData(data);
      } else if (activeTab === 'gdm') {
        const profile = await gdmRiskService.getMaternalProfile(ACTIVE_USER_ID);
        if (!profile) {
          setErrorMsg('Could not load maternal profile.');
          setIsLoading(false);
          return;
        }
        try {
          const result = await gdmRiskService.assessRisk(profile);
          setGdmResult(result);
        } catch (err: any) {
          setErrorMsg(err.message || 'Error assessing GDM risk.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while loading data.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDailyTotals = () => {
    return dailyData.reduce(
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
  };

  const NutrientBar = ({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) => {
    const percentage = Math.min(100, Math.round((current / target) * 100)) || 0;
    const isHighSugar = label === 'Sugar' && percentage > 90;
    const barColor = percentage > 90 ? (isHighSugar ? '#F59E0B' : '#10B981') : '#34D399';
    return (
      <View style={s.nutrientBarRow}>
        <View style={s.nutrientBarHeader}>
          <Text style={s.nutrientLabel}>{label}</Text>
          <Text style={s.nutrientValue}>{current.toFixed(1)} / {target} {unit}</Text>
        </View>
        <View style={s.nutrientTrack}>
          <View style={[s.nutrientFill, { width: `${percentage}%` as any, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  };

  const renderDailyNutrients = () => {
    if (isLoading) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;

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

    const totals = getDailyTotals();

    return (
      <View style={s.tabContent}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Nutrient Targets</Text>
          <NutrientBar label="Iron" current={totals.iron} target={PREGNANCY_NUTRITION_TARGETS.ironMg} unit="mg" />
          <NutrientBar label="Calcium" current={totals.calcium} target={PREGNANCY_NUTRITION_TARGETS.calciumMg} unit="mg" />
          <NutrientBar label="Fiber" current={totals.fiber} target={PREGNANCY_NUTRITION_TARGETS.fiberG} unit="g" />
          <NutrientBar label="Carbs" current={totals.carbs} target={PREGNANCY_NUTRITION_TARGETS.carbsG} unit="g" />
          <NutrientBar label="Sugar" current={totals.sugar} target={PREGNANCY_NUTRITION_TARGETS.sugarG} unit="g" />

          {totals.iron < PREGNANCY_NUTRITION_TARGETS.ironMg * 0.5 && (
            <View style={s.alertBox}>
              <AlertCircle size={18} color="#D97706" style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={s.alertText}>Your iron intake is below today's general target.</Text>
            </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Today's Meals</Text>
        {dailyData.map((log) => (
          <View key={log.id} style={s.mealCard}>
            <Text style={s.mealType}>{log.meal_type}</Text>
            {log.meal_items?.map((item: any) => (
              <Text key={item.id} style={s.mealItem}>• {item.item_name}</Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyTrends = () => {
    if (isLoading) return <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />;

    if (weeklyData.length === 0) {
      return (
        <View style={s.emptyCard}>
          <TrendingUp size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>No weekly data</Text>
          <Text style={s.emptySubtitle}>Keep logging your meals to see your weekly nutrition trends.</Text>
        </View>
      );
    }

    return (
      <View style={s.tabContent}>
        <View style={[s.card, { alignItems: 'center', justifyContent: 'center', minHeight: 200 }]}>
          <Text style={s.emptySubtitle}>Weekly charts will render here based on {weeklyData.length} logs.</Text>
        </View>
      </View>
    );
  };

  const renderGdmRisk = () => {
    if (isLoading) {
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={[s.emptySubtitle, { marginTop: 16 }]}>Analyzing your maternal health profile...</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={[s.emptyCard, { borderColor: '#FEE2E2' }]}>
          <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>Some health information is missing</Text>
          <Text style={s.emptySubtitle}>
            {errorMsg === 'Could not load maternal profile.'
              ? 'Please complete your maternal health profile before running the risk assessment.'
              : errorMsg}
          </Text>
        </View>
      );
    }

    if (gdmResult) {
      const isHigh = gdmResult.riskCategory === 'High Risk';
      const isMod = gdmResult.riskCategory === 'Moderate Risk';
      const iconBg = isHigh ? '#FEF2F2' : isMod ? '#FFFBEB' : '#ECFDF5';
      const iconColor = isHigh ? '#EF4444' : isMod ? '#D97706' : '#10B981';

      return (
        <View style={s.tabContent}>
          <View style={[s.card, { alignItems: 'center' }]}>
            <View style={[s.iconCircle, { backgroundColor: iconBg }]}>
              {isHigh || isMod
                ? <AlertCircle size={48} color={iconColor} />
                : <CheckCircle2 size={48} color={iconColor} />}
            </View>
            <Text style={s.riskTitle}>{gdmResult.riskCategory}</Text>
            {gdmResult.probability && (
              <Text style={s.riskProb}>
                Estimated GDM risk score: {Math.round(gdmResult.probability * 100)}%
              </Text>
            )}
            <View style={s.messageBox}>
              <Text style={s.messageText}>{gdmResult.message}</Text>
            </View>
            <Text style={s.disclaimer}>
              This is a risk estimate based on the information provided and is not a medical diagnosis.
              Please discuss your results with your healthcare professional.
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Maternal Health</Text>
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
                {tab === 'gdm' ? 'GDM Risk' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'daily' && renderDailyNutrients()}
        {activeTab === 'weekly' && renderWeeklyTrends()}
        {activeTab === 'gdm' && renderGdmRisk()}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(203, 213, 225, 0.5)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#0F172A',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  nutrientBarRow: {
    marginBottom: 14,
  },
  nutrientBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  nutrientValue: {
    fontSize: 12,
    color: '#64748B',
  },
  nutrientTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
    overflow: 'hidden',
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 99,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    marginLeft: 4,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  mealType: {
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 8,
    fontSize: 14,
    textTransform: 'capitalize',
  },
  mealItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  logBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 99,
  },
  logBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  riskTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  riskProb: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
  },
});
