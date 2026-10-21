import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, LayoutAnimation, Platform, UIManager, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  HeartPulse, Calendar, AlertCircle, CheckCircle2,
  ShieldAlert, RefreshCw, Zap, Activity, Info, Check, TrendingUp,
  Camera, ChevronLeft, ChevronRight, CalendarX, HelpCircle, Scale
} from 'lucide-react-native';

import { WellnessDiaryDashboard } from '@/components/ui/WellnessDiaryDashboard';
import { GDM_REQUIRED_FIELDS, gdmRiskService } from '@/services/gdmRiskService';
import { gdmV4ResearchService } from '@/services/gdmV4ResearchService';
import { gdmCacheService, GDMCacheEntry } from '@/services/gdmCacheService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GDMRiskResponse } from '@/types/gdm';
import { GDMV4RiskResponse, GDMV4FormState, MedicalHistoryChoice } from '@/types/gdmV4';
import { toGdmV4Binary } from '@/types/gdmV4';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = 'daily' | 'weekly' | 'gdm';

const FIELD_LABELS: Record<string, string> = {
  bmi: 'Body Mass Index (BMI)',
  age: 'Age',
  no_of_pregnancy: 'Number of Pregnancies',
  gestation_in_previous_pregnancy: 'Gestation in Previous Pregnancy',
  hdl: 'HDL Cholesterol',
  family_history: 'Family History of Diabetes',
  unexplained_prenatal_loss: 'Unexplained Prenatal Loss',
  large_child_or_birth_default: 'Large Child / Birth Defect History',
  pcos: 'PCOS History',
  sys_bp: 'Systolic Blood Pressure',
  dia_bp: 'Diastolic Blood Pressure',
  ogtt: 'OGTT Glucose Level',
  hemoglobin: 'Hemoglobin',
  sedentary_lifestyle: 'Sedentary Lifestyle',
  prediabetes: 'Prediabetes History',
};

// ─── Constants & Colors ───────────────────────────────────────────────────────

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
function getGestationalText(week: number | undefined) {
  if (!week) return null;
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  return `Week ${week} • ${trimester}${trimester === 1 ? 'st' : trimester === 2 ? 'nd' : 'rd'} Trimester`;
}

// ─── SVG Components ───────────────────────────────────────────────────────────
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

export default function WellnessScreen() {
  const router = useRouter();
  const { tab, date } = useLocalSearchParams<{ tab?: string; date?: string }>();
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
    if (!userId) return;
    const loadProfile = async () => {
      const profile = await gdmRiskService.getMaternalProfile(userId);
      setMaternalProfile(profile);
    };
    loadProfile();
  }, [userId]);

  // GDM
  const [gdmCache, setGdmCache] = useState<GDMCacheEntry | null>(null);
  const [gdmExpired, setGdmExpired] = useState(true);
  const [daysUntilNext, setDaysUntilNext] = useState<number | null>(null);
  const [isCheckingGdm, setIsCheckingGdm] = useState(false);
  const [assessmentStage, setAssessmentStage] = useState(0);
  const [gdmError, setGdmError] = useState<string | null>(null);
  const [quickBmi, setQuickBmi] = useState('');
  const [isSavingBmi, setIsSavingBmi] = useState(false);

  const handleSaveQuickBmi = async () => {
    const parsed = parseFloat(quickBmi.trim());
    if (isNaN(parsed) || parsed < 10 || parsed > 60) {
      Alert.alert('Invalid BMI', 'Please enter a valid BMI between 10 and 60 (e.g. 22.5).');
      return;
    }
    if (!userId) return;
    setIsSavingBmi(true);
    try {
      const { error } = await supabase.from('users').update({ bmi: parsed }).eq('id', userId);
      if (error) throw error;
      const profile = await gdmRiskService.getMaternalProfile(userId);
      setMaternalProfile(profile);
      setQuickBmi('');
      Alert.alert('BMI Saved', 'Your BMI has been updated and your health profile is now complete!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update BMI.');
    } finally {
      setIsSavingBmi(false);
    }
  };

  // ─── GDM V4 Research State ────────────────────────────────────────────────
  const [showV4Research, setShowV4Research] = useState(false);
  const [v4Form, setV4Form] = useState<GDMV4FormState>({
    age: '',
    no_of_pregnancy: '',
    family_history: null,
    unexplained_prenatal_loss: null,
    sedentary_lifestyle: null,
  });
  const [v4Loading, setV4Loading] = useState(false);
  const [v4Error, setV4Error] = useState<string | null>(null);
  const [v4Result, setV4Result] = useState<GDMV4RiskResponse | null>(null);

  const handlePrefillV4FromProfile = () => {
    if (!maternalProfile) return;
    setV4Form(prev => ({
      ...prev,
      age: maternalProfile.age ? String(maternalProfile.age) : prev.age,
      no_of_pregnancy: maternalProfile.no_of_pregnancy !== undefined && maternalProfile.no_of_pregnancy !== null
        ? String(maternalProfile.no_of_pregnancy)
        : prev.no_of_pregnancy,
      family_history: maternalProfile.family_history !== undefined && maternalProfile.family_history !== null
        ? (maternalProfile.family_history === 1 ? 'yes' : 'no')
        : prev.family_history,
      unexplained_prenatal_loss: maternalProfile.unexplained_prenatal_loss !== undefined && maternalProfile.unexplained_prenatal_loss !== null
        ? (maternalProfile.unexplained_prenatal_loss === 1 ? 'yes' : 'no')
        : prev.unexplained_prenatal_loss,
      sedentary_lifestyle: maternalProfile.sedentary_lifestyle !== undefined && maternalProfile.sedentary_lifestyle !== null
        ? (maternalProfile.sedentary_lifestyle === 1 ? 'yes' : 'no')
        : prev.sedentary_lifestyle,
    }));
  };

  const handleRunV4Screening = async () => {
    if (v4Loading) return;
    setV4Error(null);
    setV4Result(null);
    const parsedAge = v4Form.age.trim() ? Number(v4Form.age.trim()) : NaN;
    const parsedPregnancies = v4Form.no_of_pregnancy.trim() ? Number(v4Form.no_of_pregnancy.trim()) : NaN;

    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 70) {
      setV4Error('Please provide a valid maternal age between 10 and 70.');
      return;
    }
    if (!Number.isInteger(parsedPregnancies) || parsedPregnancies < 0 || parsedPregnancies > 25) {
      setV4Error('Please provide a valid total pregnancies count (0 to 25).');
      return;
    }
    if (!v4Form.family_history) {
      setV4Error('Please select Yes, No, or Not sure for Family History.');
      return;
    }
    if (v4Form.family_history === 'not_sure') {
      setV4Error('Family history is selected as "Not sure". GDM V4 requires confirmed medical history and cannot guess. Please check your medical records.');
      return;
    }
    if (!v4Form.unexplained_prenatal_loss) {
      setV4Error('Please select Yes, No, or Not sure for Unexplained Prenatal Loss.');
      return;
    }
    if (v4Form.unexplained_prenatal_loss === 'not_sure') {
      setV4Error('Prenatal loss history is selected as "Not sure". GDM V4 requires confirmed medical history and cannot guess.');
      return;
    }
    if (!v4Form.sedentary_lifestyle) {
      setV4Error('Please select Yes, No, or Not sure for Sedentary Lifestyle.');
      return;
    }
    if (v4Form.sedentary_lifestyle === 'not_sure') {
      setV4Error('Sedentary lifestyle is selected as "Not sure". Please select Yes or No based on your regular activity level.');
      return;
    }

    setV4Loading(true);
    try {
      const res = await gdmV4ResearchService.predictScreening({
        age: parsedAge,
        no_of_pregnancy: parsedPregnancies,
        family_history: toGdmV4Binary(v4Form.family_history)!,
        unexplained_prenatal_loss: toGdmV4Binary(v4Form.unexplained_prenatal_loss)!,
        sedentary_lifestyle: toGdmV4Binary(v4Form.sedentary_lifestyle)!,
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setV4Result(res);
    } catch (err: any) {
      setV4Error(err.message || 'Failed to complete research screening.');
    } finally {
      setV4Loading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'gdm') {
        void loadGdmCache();
        if (userId) {
          void gdmRiskService.getMaternalProfile(userId).then(setMaternalProfile);
        }
      }
    }, [activeTab, userId])
  );

  const loadGdmCache = useCallback(async () => {
    const { entry, isExpired, daysUntilNextCheck } = await gdmCacheService.load(userId);
    setGdmCache(entry);
    setGdmExpired(isExpired);
    setDaysUntilNext(daysUntilNextCheck);
  }, [userId]);

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
      
      const gestationalWeek = profile.gestational_week ?? null;
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
  const renderGdm = () => {
    const hasValidCache = gdmCache && !gdmExpired;
    const result: GDMRiskResponse | undefined = gdmCache?.result;

    const fields = GDM_REQUIRED_FIELDS;
    let filled = 0;
    if (maternalProfile) {
      filled = fields.filter(f => maternalProfile[f] !== undefined && maternalProfile[f] !== null).length;
    }
    const missingFields = fields.filter(
      f => !maternalProfile || maternalProfile[f] === undefined || maternalProfile[f] === null
    );

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

    const renderV4ResearchSection = () => {
      return (
        <View style={s.v4Card}>
          <TouchableOpacity
            style={s.v4HeaderRow}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowV4Research(!showV4Research);
            }}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={s.researchBadge}>
                  <Text style={s.researchBadgeText}>RESEARCH PREVIEW</Text>
                </View>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 8 }}>v4.0 Conservative</Text>
              </View>
              <Text style={s.v4CardTitle}>GDM V4 Pre-OGTT Screener</Text>
              <Text style={s.v4CardSubtitle}>
                Experimental 5-factor random forest screening without OGTT or BMI.
              </Text>
            </View>
            <View style={[s.chevronCircle, showV4Research && s.chevronCircleActive]}>
              <ChevronRight
                size={18}
                color={showV4Research ? '#FFF' : COLORS.textHeader}
                style={{ transform: [{ rotate: showV4Research ? '90deg' : '0deg' }] }}
              />
            </View>
          </TouchableOpacity>

          {showV4Research && (
            <View style={s.v4ExpandedContent}>
              <View style={s.v4NoticeBanner}>
                <Info size={16} color={COLORS.secondary} style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={s.v4NoticeText}>
                  This experimental model assesses risk indications strictly from 5 non-invasive antenatal factors. It is an academic demonstration and does NOT replace diagnostic Oral Glucose Tolerance Testing (OGTT).
                </Text>
              </View>

              {v4Result ? (
                // ─── Result View ─────────────────────────────────────────────
                <View style={s.v4ResultContainer}>
                  <View style={s.v4ResultHeader}>
                    <Text style={s.v4ResultModelName}>GDM V4 Conservative Pipeline</Text>
                    <Text style={s.v4ResultVersion}>{v4Result.model_version}</Text>
                  </View>

                  <View
                    style={[
                      s.v4OutcomeBadge,
                      { backgroundColor: v4Result.screen_positive ? COLORS.amberBg : COLORS.primaryBg },
                    ]}
                  >
                    <View
                      style={[
                        s.v4OutcomeDot,
                        { backgroundColor: v4Result.screen_positive ? COLORS.amber : COLORS.primary },
                      ]}
                    />
                    <Text
                      style={[
                        s.v4OutcomeText,
                        { color: v4Result.screen_positive ? COLORS.amber : COLORS.primary },
                      ]}
                    >
                      {v4Result.screen_positive
                        ? 'Screen Positive (Elevated Indicators)'
                        : 'Screen Negative (Lower Indicators)'}
                    </Text>
                  </View>

                  <View style={s.v4ScoreCard}>
                    <Text style={s.v4ScoreLabel}>Experimental Algorithmic Score</Text>
                    <Text style={s.v4ScoreValue}>{(v4Result.model_score * 100).toFixed(2)}%</Text>
                    <Text style={s.v4ScoreSubtext}>
                      Research Threshold: {(v4Result.threshold * 100).toFixed(0)}% • Positive if score ≥ {(v4Result.threshold * 100).toFixed(0)}%
                    </Text>
                  </View>

                  <View style={s.v4DisclaimerBox}>
                    <ShieldAlert size={18} color={COLORS.amber} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={s.v4DisclaimerText}>
                      {v4Result.disclaimer}
                      {'\n\n'}
                      • This score is NOT a clinical percentage chance of diabetes.
                      {'\n'}
                      • A negative screening does NOT confirm normal maternal health or replace doctor evaluation.
                      {'\n'}
                      • No dietary changes or medications should be initiated based on this prototype.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={s.v4ResetBtn}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setV4Result(null);
                    }}
                  >
                    <RefreshCw size={16} color={COLORS.textMain} style={{ marginRight: 6 }} />
                    <Text style={s.v4ResetBtnText}>Test Different Parameters</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // ─── Form View ───────────────────────────────────────────────
                <View style={s.v4FormContainer}>
                  {maternalProfile && (
                    <TouchableOpacity style={s.v4PrefillBtn} onPress={handlePrefillV4FromProfile}>
                      <Zap size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={s.v4PrefillBtnText}>Pre-fill from Health Profile (Review Before Submitting)</Text>
                    </TouchableOpacity>
                  )}

                  {/* 1. Age */}
                  <View style={s.v4FormGroup}>
                    <Text style={s.v4Label}>1. Maternal Age (Years)</Text>
                    <TextInput
                      style={s.v4Input}
                      keyboardType="numeric"
                      placeholder="e.g. 29"
                      placeholderTextColor={COLORS.textMuted}
                      value={v4Form.age}
                      onChangeText={(val) => setV4Form((prev) => ({ ...prev, age: val }))}
                    />
                  </View>

                  {/* 2. Total Pregnancies */}
                  <View style={s.v4FormGroup}>
                    <Text style={s.v4Label}>2. Total Number of Pregnancies</Text>
                    <Text style={s.v4SubLabel}>
                      Total pregnancies (gravida) including current pregnancy, not only living children.
                    </Text>
                    <TextInput
                      style={s.v4Input}
                      keyboardType="numeric"
                      placeholder="e.g. 2"
                      placeholderTextColor={COLORS.textMuted}
                      value={v4Form.no_of_pregnancy}
                      onChangeText={(val) => setV4Form((prev) => ({ ...prev, no_of_pregnancy: val }))}
                    />
                  </View>

                  {/* 3. Family History */}
                  <View style={s.v4FormGroup}>
                    <Text style={s.v4Label}>3. Family History of Diabetes</Text>
                    <Text style={s.v4SubLabel}>Do you have a parent or sibling diagnosed with diabetes?</Text>
                    <View style={s.v4ChoiceRow}>
                      {(['yes', 'no', 'not_sure'] as MedicalHistoryChoice[]).map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[s.v4ChoiceBtn, v4Form.family_history === c && s.v4ChoiceBtnActive]}
                          onPress={() => setV4Form((prev) => ({ ...prev, family_history: c }))}
                        >
                          <Text style={[s.v4ChoiceText, v4Form.family_history === c && s.v4ChoiceTextActive]}>
                            {c === 'yes' ? 'Yes' : c === 'no' ? 'No' : 'Not sure'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {v4Form.family_history === 'not_sure' && (
                      <Text style={s.v4UnsureWarning}>Model requires confirmed history; check medical records.</Text>
                    )}
                  </View>

                  {/* 4. Unexplained Prenatal Loss */}
                  <View style={s.v4FormGroup}>
                    <Text style={s.v4Label}>4. History of Unexplained Prenatal Loss</Text>
                    <Text style={s.v4SubLabel}>Previous unexplained stillbirth or miscarriage in a past pregnancy.</Text>
                    <View style={s.v4ChoiceRow}>
                      {(['yes', 'no', 'not_sure'] as MedicalHistoryChoice[]).map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[s.v4ChoiceBtn, v4Form.unexplained_prenatal_loss === c && s.v4ChoiceBtnActive]}
                          onPress={() => setV4Form((prev) => ({ ...prev, unexplained_prenatal_loss: c }))}
                        >
                          <Text style={[s.v4ChoiceText, v4Form.unexplained_prenatal_loss === c && s.v4ChoiceTextActive]}>
                            {c === 'yes' ? 'Yes' : c === 'no' ? 'No' : 'Not sure'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {v4Form.unexplained_prenatal_loss === 'not_sure' && (
                      <Text style={s.v4UnsureWarning}>Model requires confirmed history; check medical records.</Text>
                    )}
                  </View>

                  {/* 5. Sedentary Lifestyle */}
                  <View style={s.v4FormGroup}>
                    <Text style={s.v4Label}>5. Sedentary Lifestyle</Text>
                    <Text style={s.v4SubLabel}>
                      Predominantly sitting with minimal regular physical activity prior to or during pregnancy.
                    </Text>
                    <View style={s.v4ChoiceRow}>
                      {(['yes', 'no', 'not_sure'] as MedicalHistoryChoice[]).map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[s.v4ChoiceBtn, v4Form.sedentary_lifestyle === c && s.v4ChoiceBtnActive]}
                          onPress={() => setV4Form((prev) => ({ ...prev, sedentary_lifestyle: c }))}
                        >
                          <Text style={[s.v4ChoiceText, v4Form.sedentary_lifestyle === c && s.v4ChoiceTextActive]}>
                            {c === 'yes' ? 'Yes' : c === 'no' ? 'No' : 'Not sure'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {v4Form.sedentary_lifestyle === 'not_sure' && (
                      <Text style={s.v4UnsureWarning}>Please review your daily activity level before testing.</Text>
                    )}
                  </View>

                  {v4Error && (
                    <View style={[s.alertBox, { backgroundColor: COLORS.accentBg }]}>
                      <AlertCircle size={16} color={COLORS.accent} style={{ marginRight: 8, marginTop: 2 }} />
                      <Text style={[s.alertText, { color: COLORS.accent }]}>{v4Error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[s.btnPrimary, v4Loading && { opacity: 0.7 }]}
                    onPress={handleRunV4Screening}
                    disabled={v4Loading}
                  >
                    {v4Loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={s.btnPrimaryText}>Run Research Screener</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={s.v4FormFooterNote}>
                    Experimental research tool only. Submitting does not alter your clinical profile or diet guidelines.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    };

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

          {/* Research Screener Section */}
          {renderV4ResearchSection()}
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

          {missingFields.length > 0 && (
            <View style={{ backgroundColor: '#FFFBEB', padding: 14, borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <AlertCircle size={16} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
                  Missing Required Information ({missingFields.length})
                </Text>
              </View>
              {missingFields.map(f => (
                <Text key={f} style={{ fontSize: 12, color: '#B45309', marginLeft: 6, marginBottom: 2 }}>
                  • {FIELD_LABELS[f] || f}
                </Text>
              ))}
            </View>
          )}

          {missingFields.includes('bmi') && (
            <View style={{ marginBottom: 14, backgroundColor: '#F0FDF4', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Scale size={16} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>
                  Enter Body Mass Index (BMI) to Unlock
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#15803D', marginBottom: 10 }}>
                Normal healthy range is 18.5 – 24.9 (e.g. 22.5)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: '#FFF',
                    borderWidth: 1,
                    borderColor: '#86EFAC',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 14,
                    color: '#1E293B',
                  }}
                  placeholder="e.g. 22.5"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={quickBmi}
                  onChangeText={setQuickBmi}
                />
                <TouchableOpacity
                  onPress={handleSaveQuickBmi}
                  disabled={isSavingBmi || !quickBmi.trim()}
                  style={{
                    backgroundColor: '#15803D',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    justifyContent: 'center',
                    opacity: isSavingBmi || !quickBmi.trim() ? 0.6 : 1,
                  }}
                >
                  {isSavingBmi ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Save & Unlock</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

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
            <Text style={s.disclaimerText}>Complete your health profile to calculate your risk estimate.</Text>
          )}
        </View>
        <Text style={s.disclaimerText}>
          This result is a risk estimate, not a medical diagnosis. Please discuss your result with your healthcare professional.
        </Text>

        {/* Research Screener Section */}
        {renderV4ResearchSection()}
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
      {activeTab !== 'gdm' ? (
        <WellnessDiaryDashboard mode={activeTab} onModeChange={setActiveTab} initialDate={date} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {renderGdm()}
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
  header: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: COLORS.textHeader, marginBottom: 8 },
  gestBadge: { backgroundColor: COLORS.secondaryBg, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  gestBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  
  segmentContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', width: '92%', maxWidth: 608, alignSelf: 'center', borderRadius: 24, padding: 4, marginBottom: 8 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.textHeader },

  tabContent: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 16 },
  
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

  // GDM V4 Research Section Styles
  v4Card: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginTop: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#EEF2F6' },
  v4HeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  researchBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  researchBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706', letterSpacing: 0.5 },
  v4CardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textHeader, marginTop: 6, marginBottom: 2 },
  v4CardSubtitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  chevronCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  chevronCircleActive: { backgroundColor: COLORS.primary },
  v4ExpandedContent: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  v4NoticeBanner: { flexDirection: 'row', backgroundColor: COLORS.secondaryBg, padding: 12, borderRadius: 14, marginBottom: 16 },
  v4NoticeText: { flex: 1, fontSize: 12, color: COLORS.secondary, lineHeight: 17 },
  v4ResultContainer: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 16 },
  v4ResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  v4ResultModelName: { fontSize: 14, fontWeight: '700', color: COLORS.textHeader },
  v4ResultVersion: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, backgroundColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  v4OutcomeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 14 },
  v4OutcomeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  v4OutcomeText: { fontSize: 14, fontWeight: '700' },
  v4ScoreCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  v4ScoreLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4 },
  v4ScoreValue: { fontSize: 32, fontWeight: '800', color: COLORS.textHeader, marginBottom: 4 },
  v4ScoreSubtext: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  v4DisclaimerBox: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 14 },
  v4DisclaimerText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  v4ResetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#E2E8F0' },
  v4ResetBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textHeader },
  v4FormContainer: { marginTop: 4 },
  v4PrefillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryBg, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  v4PrefillBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  v4FormGroup: { marginBottom: 16 },
  v4Label: { fontSize: 14, fontWeight: '600', color: COLORS.textHeader, marginBottom: 4 },
  v4SubLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, lineHeight: 16 },
  v4Input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.textHeader },
  v4ChoiceRow: { flexDirection: 'row', gap: 8 },
  v4ChoiceBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  v4ChoiceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  v4ChoiceText: { fontSize: 13, fontWeight: '600', color: COLORS.textHeader },
  v4ChoiceTextActive: { color: '#FFFFFF' },
  v4UnsureWarning: { fontSize: 11, color: COLORS.amber, marginTop: 4, fontWeight: '500' },
  v4FormFooterNote: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
