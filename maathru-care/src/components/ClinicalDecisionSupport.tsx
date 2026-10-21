import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
} from 'lucide-react-native';

export interface ClinicalDecisionSupportProps {
  patient: {
    age: number;
    gestationalWeek: number;
    bloodGroup: string;
    gravida?: number;
  };
  latestRisk: {
    riskLevel: string;
    probability: number;
    inputData?: any;
  } | null;
  vitalsHistory: Array<{
    systolicBP: number;
    diastolicBP: number;
    weightKg: number;
    pulseRate?: number;
    date: string;
  }>;
  prescriptions: Array<{
    medications: any[];
    notes: string;
  }>;
}

type SeverityLevel = 'URGENT' | 'WARNING' | 'INFO';

interface RecommendationItem {
  id: string;
  ruleNumber: number;
  severity: SeverityLevel;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardBg: string;
  title: string;
  description: string;
  guidelineReference: string;
  actionRecommendation: string;
  evidenceCode?: string;
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

export default function ClinicalDecisionSupport({
  patient,
  latestRisk,
  vitalsHistory,
  prescriptions,
}: ClinicalDecisionSupportProps) {
  const [isSectionExpanded, setIsSectionExpanded] = useState<boolean>(true);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const recommendations = useMemo<RecommendationItem[]>(() => {
    const recs: RecommendationItem[] = [];

    const safePatient = patient || { age: 0, gestationalWeek: 0, bloodGroup: '' };
    const safeVitals = Array.isArray(vitalsHistory) ? vitalsHistory : [];
    const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : [];

    // Sort vitals by date descending for recency checks
    const sortedVitalsDesc = [...safeVitals].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    // Sort vitals by date ascending for sequential checks
    const sortedVitalsAsc = [...safeVitals].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeA - timeB;
    });

    // ─── RULE 1: Preeclampsia Warning (URGENT - RED) ──────────────────────────
    // IF systolicBP > 140 OR diastolicBP > 90 in ANY of last 3 vitals readings
    const last3Vitals = sortedVitalsDesc.slice(0, 3);
    const elevatedRecentVital = last3Vitals.find(
      (v) => Number(v.systolicBP) > 140 || Number(v.diastolicBP) > 90
    );

    if (elevatedRecentVital) {
      recs.push({
        id: 'rule-1-preeclampsia',
        ruleNumber: 1,
        severity: 'URGENT',
        color: '#EF4444',
        badgeBg: '#FEF2F2',
        badgeText: '#DC2626',
        badgeBorder: '#FECACA',
        cardBg: '#FFFFFF',
        title: 'Preeclampsia Warning: Elevated Blood Pressure',
        description:
          'Elevated blood pressure detected. Screen for preeclampsia (proteinuria, edema). Consider aspirin prophylaxis per WHO ANC guideline.',
        guidelineReference:
          'WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience (2016) — Recommendation C.1 & C.2: Systolic BP ≥ 140 mmHg or diastolic BP ≥ 90 mmHg requires immediate diagnostic screening for proteinuria (dipstick ≥1+ or 24-hr urine protein). In women at high risk of pre-eclampsia, low-dose oral acetylsalicylic acid (aspirin, 75–100 mg/day) is recommended initiated before 20 weeks. Calcium supplementation (1.5–2.0 g/day) should also be initiated.',
        actionRecommendation:
          'Order urgent urine protein dipstick test, evaluate for headache or visual aura, assess pedal/facial edema, order pre-eclampsia laboratory profile, and schedule repeat review within 48–72 hours.',
        evidenceCode: 'WHO ANC-2016-C.1',
      });
    }

    // ─── RULE 2: Gestational Hypertension (WARNING - ORANGE) ─────────────────
    // IF systolicBP consistently > 130 OR diastolicBP > 85 across multiple readings
    const borderlineVitals = safeVitals.filter(
      (v) => Number(v.systolicBP) > 130 || Number(v.diastolicBP) > 85
    );

    if (borderlineVitals.length >= 2) {
      recs.push({
        id: 'rule-2-gestational-hypertension',
        ruleNumber: 2,
        severity: 'WARNING',
        color: '#F97316',
        badgeBg: '#FFF7ED',
        badgeText: '#EA580C',
        badgeBorder: '#FED7AA',
        cardBg: '#FFFFFF',
        title: 'Gestational Hypertension: Borderline BP Pattern',
        description:
          'Borderline elevated BP pattern. Monitor closely. Schedule follow-up in 1 week.',
        guidelineReference:
          'WHO Antenatal Care Guidelines (2016) & FIGO Clinical Guidelines: Persistent borderline elevated blood pressure readings (systolic > 130 mmHg or diastolic > 85 mmHg) over consecutive measurements indicate early hemodynamic strain and heightened risk for gestational hypertension or pre-eclampsia. WHO recommends stepped surveillance and closer clinical follow-up intervals.',
        actionRecommendation:
          'Schedule clinical review in 1 week, prescribe home blood pressure monitoring twice daily, test urine for proteinuria, and educate mother on preeclampsia red-flag symptoms.',
        evidenceCode: 'WHO ANC-2016-B.1.4',
      });
    }

    // ─── RULE 3: Advanced Maternal Age (INFO - BLUE) ─────────────────────────
    // IF patient.age >= 35
    if (safePatient.age && safePatient.age >= 35) {
      recs.push({
        id: 'rule-3-advanced-maternal-age',
        ruleNumber: 3,
        severity: 'INFO',
        color: '#3B82F6',
        badgeBg: '#EFF6FF',
        badgeText: '#2563EB',
        badgeBorder: '#BFDBFE',
        cardBg: '#FFFFFF',
        title: `Advanced Maternal Age (≥35) — Age ${safePatient.age}`,
        description:
          'Advanced maternal age (≥35). Recommend genetic counseling and additional anomaly screening (NT scan, amniocentesis option).',
        guidelineReference:
          'WHO & FIGO Clinical Guidance on Advanced Maternal Age: Maternal age ≥ 35 years is associated with higher incidence of chromosomal aneuploidies (Trisomy 21, 18, 13), gestational diabetes mellitus (GDM), gestational hypertension, and fetal growth restriction. First-trimester combined screening (nuchal translucency + serum markers / cfDNA NIPT) and detailed second-trimester anomaly ultrasonography are indicated.',
        actionRecommendation:
          'Offer genetic counseling, discuss non-invasive prenatal testing (NIPT/cfDNA), schedule mid-trimester targeted anomaly scan (18–22 weeks), and schedule early 75g oral glucose tolerance test (OGTT).',
        evidenceCode: 'WHO-FIGO-AMA-2019',
      });
    }

    // ─── RULE 4: High-Risk Pregnancy (URGENT - RED) ──────────────────────────
    // IF latestRisk.riskLevel === 'High' or 'Very High'
    if (
      latestRisk &&
      (latestRisk.riskLevel === 'High' ||
        latestRisk.riskLevel === 'Very High' ||
        (typeof latestRisk.riskLevel === 'string' &&
          latestRisk.riskLevel.toLowerCase().includes('high')))
    ) {
      const probValue =
        latestRisk.probability <= 1
          ? Math.round(latestRisk.probability * 100)
          : Math.round(latestRisk.probability);

      recs.push({
        id: 'rule-4-high-risk-pregnancy',
        ruleNumber: 4,
        severity: 'URGENT',
        color: '#EF4444',
        badgeBg: '#FEF2F2',
        badgeText: '#DC2626',
        badgeBorder: '#FECACA',
        cardBg: '#FFFFFF',
        title: `High-Risk Pregnancy: AI Risk Prediction (${latestRisk.riskLevel})`,
        description: `AI model predicts ${probValue}% high-risk probability. Recommend increased monitoring frequency: weekly visits, fetal heart rate monitoring.`,
        guidelineReference:
          'WHO Antenatal Care Health Systems Guidelines: High-risk pregnancies require a specialized consultant-led care pathway. Protocols specify escalated visit cadence (weekly to bi-weekly), systematic serial ultrasound fetal biometry, electronic fetal heart rate monitoring (cardiotocography/NST), and multi-professional delivery planning.',
        actionRecommendation:
          'Increase clinical contact frequency to weekly, perform fetal Doppler and non-stress testing, review individual risk contributors with maternal specialist, and establish emergency triage instructions.',
        evidenceCode: 'WHO ANC-2016-D.2.1',
      });
    }

    // ─── RULE 5: Multigravida Considerations (WARNING - ORANGE) ──────────────
    // IF patient.gravida >= 4
    if (typeof safePatient.gravida === 'number' && safePatient.gravida >= 4) {
      recs.push({
        id: 'rule-5-multigravida',
        ruleNumber: 5,
        severity: 'WARNING',
        color: '#F97316',
        badgeBg: '#FFF7ED',
        badgeText: '#EA580C',
        badgeBorder: '#FED7AA',
        cardBg: '#FFFFFF',
        title: `Grand Multigravida Considerations (Gravida ${safePatient.gravida})`,
        description:
          'Grand multigravida (≥4 pregnancies). Higher risk for placenta previa, PPH. Plan delivery at facility with blood bank access.',
        guidelineReference:
          'WHO Guidelines for the Prevention and Management of Postpartum Haemorrhage (PPH) & ANC Guidelines: Gravida ≥ 4 (grand multiparity) is an established risk factor for uterine atony, abnormal placentation (placenta previa/accreta spectrum), malpresentation, and precipitate labor. WHO guidelines mandate institutional delivery at emergency obstetric centers with on-site blood banking, alongside proactive active management of the third stage of labor (AMTSL).',
        actionRecommendation:
          'Schedule ultrasound to verify placental location, verify hemoglobin levels, arrange delivery in a facility with comprehensive blood bank services, and prepare prophylactic uterotonic agents (oxytocin 10 IU) for delivery.',
        evidenceCode: 'WHO PPH-GL-2018',
      });
    }

    // ─── RULE 6: Rh-Negative Blood Type (INFO - BLUE) ────────────────────────
    // IF patient.bloodGroup contains '-' (e.g., A-, B-, O-, AB-)
    const bloodGroupStr = (safePatient.bloodGroup || '').trim();
    const isRhNegative =
      bloodGroupStr.includes('-') ||
      bloodGroupStr.toLowerCase().includes('neg') ||
      bloodGroupStr.toLowerCase().includes('rh-');

    if (isRhNegative) {
      recs.push({
        id: 'rule-6-rh-negative',
        ruleNumber: 6,
        severity: 'INFO',
        color: '#3B82F6',
        badgeBg: '#EFF6FF',
        badgeText: '#2563EB',
        badgeBorder: '#BFDBFE',
        cardBg: '#FFFFFF',
        title: `Rh-Negative Blood Type Protocol (${bloodGroupStr})`,
        description:
          'Rh-negative blood type. Ensure Anti-D immunoglobulin administration at 28 weeks and within 72 hours post-delivery.',
        guidelineReference:
          'WHO Guidelines on Prevention and Management of Rh Isoimmunization: Routine antenatal anti-D immunoglobulin prophylaxis (single dose of 300 µg / 1500 IU or two-dose regimen at 28 and 34 weeks) is recommended for unsensitized RhD-negative pregnant women. Post-delivery administration within 72 hours is required if the neonate is RhD-positive. Maternal antibody screening (indirect Coombs test) is indicated prior to injection.',
        actionRecommendation:
          'Verify maternal indirect Coombs antibody screen result. Administer 300 µg anti-D immunoglobulin at 28 weeks gestation, and verify neonatal blood type upon delivery.',
        evidenceCode: 'WHO RH-ISO-2016',
      });
    }

    // ─── RULE 7: Third Trimester Monitoring (INFO - GREEN) ───────────────────
    // IF gestationalWeek >= 28
    if (safePatient.gestationalWeek && safePatient.gestationalWeek >= 28) {
      recs.push({
        id: 'rule-7-third-trimester',
        ruleNumber: 7,
        severity: 'INFO',
        color: '#10B981',
        badgeBg: '#ECFDF5',
        badgeText: '#059669',
        badgeBorder: '#A7F3D0',
        cardBg: '#FFFFFF',
        title: `Third Trimester Monitoring (Week ${safePatient.gestationalWeek})`,
        description:
          'Third trimester. Recommend: kick counting daily, GBS screening at 36 weeks, birth plan discussion.',
        guidelineReference:
          'WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience (2016): From 28 weeks onward, antenatal care focuses on maternal fetal movement monitoring (daily kick charts), repeat full blood count screening for maternal anemia, screening for Group B Streptococcus (GBS) at 35–37 weeks, and formal birth preparedness counseling.',
        actionRecommendation:
          'Instruct mother on daily fetal kick counting protocol (10 movements within 2 hours), repeat full blood count for late-pregnancy anemia, schedule GBS screen at 36 weeks, and review birth preparedness plan.',
        evidenceCode: 'WHO ANC-2016-E.4',
      });
    }

    // ─── RULE 8: Near Term (INFO - GREEN) ────────────────────────────────────
    // IF gestationalWeek >= 36
    if (safePatient.gestationalWeek && safePatient.gestationalWeek >= 36) {
      recs.push({
        id: 'rule-8-near-term',
        ruleNumber: 8,
        severity: 'INFO',
        color: '#10B981',
        badgeBg: '#ECFDF5',
        badgeText: '#059669',
        badgeBorder: '#A7F3D0',
        cardBg: '#FFFFFF',
        title: `Near Term Delivery Preparation (Week ${safePatient.gestationalWeek})`,
        description:
          'Near term. Discuss delivery plan, signs of labor onset, when to go to hospital. Weekly cervical checks recommended.',
        guidelineReference:
          'WHO Intrapartum Care Guidelines: Late third-trimester contacts should occur weekly from 36 weeks until delivery. Key clinical priorities include confirming fetal presentation (vertex vs breech) by Leopold maneuvers or ultrasound, assessing pelvic engagement and cervical status, discussing spontaneous labor signs, and reviewing hospital emergency contact details.',
        actionRecommendation:
          'Schedule weekly antenatal clinic visits, verify vertex fetal presentation, evaluate cervical readiness, and educate patient on true labor onset signs and immediate hospital reporting criteria.',
        evidenceCode: 'WHO IPC-GL-2018',
      });
    }

    // ─── RULE 9: Weight Concern (WARNING - ORANGE) ───────────────────────────
    // Check recent vitals weight changes. If weight gain > 2kg in a single week
    let hasRapidWeightGain = false;
    let weightGainMessage = '';

    const vitalsWithWeight = sortedVitalsAsc.filter(
      (v) => typeof v.weightKg === 'number' && v.weightKg > 0 && v.date
    );

    for (let i = 0; i < vitalsWithWeight.length - 1; i++) {
      const v1 = vitalsWithWeight[i];
      const v2 = vitalsWithWeight[i + 1];
      const t1 = new Date(v1.date).getTime();
      const t2 = new Date(v2.date).getTime();
      const diffDays = (t2 - t1) / (1000 * 60 * 60 * 24);
      const weightGain = v2.weightKg - v1.weightKg;

      if (diffDays >= 1 && diffDays <= 14) {
        const weeklyRate = (weightGain / diffDays) * 7;
        if (weightGain > 2 || (diffDays <= 7 && weightGain > 2) || (diffDays > 7 && weeklyRate > 2)) {
          hasRapidWeightGain = true;
          weightGainMessage = `(+${weightGain.toFixed(1)} kg over ${Math.round(diffDays)} days)`;
          break;
        }
      }
    }

    // Secondary check: compare most recent reading with earlier reading in 2-10 day window
    if (!hasRapidWeightGain && vitalsWithWeight.length >= 2) {
      const latest = vitalsWithWeight[vitalsWithWeight.length - 1];
      const latestTime = new Date(latest.date).getTime();

      for (let i = vitalsWithWeight.length - 2; i >= 0; i--) {
        const earlier = vitalsWithWeight[i];
        const earlierTime = new Date(earlier.date).getTime();
        const diffDays = (latestTime - earlierTime) / (1000 * 60 * 60 * 24);

        if (diffDays >= 2 && diffDays <= 10) {
          const gain = latest.weightKg - earlier.weightKg;
          if (gain > 2.0) {
            hasRapidWeightGain = true;
            weightGainMessage = `(+${gain.toFixed(1)} kg over ${Math.round(diffDays)} days)`;
            break;
          }
        }
      }
    }

    if (hasRapidWeightGain) {
      recs.push({
        id: 'rule-9-weight-concern',
        ruleNumber: 9,
        severity: 'WARNING',
        color: '#F97316',
        badgeBg: '#FFF7ED',
        badgeText: '#EA580C',
        badgeBorder: '#FED7AA',
        cardBg: '#FFFFFF',
        title: 'Rapid Weight Gain Detected (>2 kg/week)',
        description: `Rapid weight gain detected (>2kg/week)${
          weightGainMessage ? ` ${weightGainMessage}` : ''
        }. Screen for gestational edema and preeclampsia.`,
        guidelineReference:
          'WHO & Institute of Medicine (IOM) Gestational Weight Gain Guidelines: Rapid gestational weight gain (>1 kg/week in second/third trimester or >2 kg in 7–10 days) typically reflects occult fluid retention rather than nutritional adipose accretion. Fluid overload is an early prodromal hallmark of pre-eclampsia and requires rule-out of dependent and facial edema and proteinuria.',
        actionRecommendation:
          'Examine for pretibial, ankle, and facial pitting edema, perform urine protein dipstick, check current blood pressure, and review dietary sodium and fluid balance.',
        evidenceCode: 'WHO-IOM-GWG-2016',
      });
    }

    // ─── RULE 10: Medication Review (INFO - BLUE) ────────────────────────────
    // IF prescriptions.length > 3
    if (safePrescriptions.length > 3) {
      recs.push({
        id: 'rule-10-medication-review',
        ruleNumber: 10,
        severity: 'INFO',
        color: '#3B82F6',
        badgeBg: '#EFF6FF',
        badgeText: '#2563EB',
        badgeBorder: '#BFDBFE',
        cardBg: '#FFFFFF',
        title: `Medication Review: Active Polypharmacy (${safePrescriptions.length} Regimens)`,
        description:
          'Multiple active prescriptions. Review for drug interactions and polypharmacy risk.',
        guidelineReference:
          'WHO Guidelines on Rational Use of Medicines in Pregnancy: When pregnant women receive >3 concurrent pharmacological prescriptions, systematic medication reconciliation is recommended. Evaluate contraindications in pregnancy (teratogenic profiles), cumulative hemodynamic or glycemic side effects, and adherence feasibility.',
        actionRecommendation:
          'Conduct formal pharmacological review across all active medications, verify pregnancy safety tiers, discontinue non-essential supplements or drugs, and check for drug-drug interactions.',
        evidenceCode: 'WHO RUM-PREG-2017',
      });
    }

    // Sort recommendations by severity: URGENT first, then WARNING, then INFO
    const severityPriority: Record<SeverityLevel, number> = {
      URGENT: 1,
      WARNING: 2,
      INFO: 3,
    };

    return recs.sort((a, b) => {
      const pA = severityPriority[a.severity] || 99;
      const pB = severityPriority[b.severity] || 99;
      if (pA !== pB) return pA - pB;
      return a.ruleNumber - b.ruleNumber;
    });
  }, [patient, latestRisk, vitalsHistory, prescriptions]);

  const urgentCount = recommendations.filter((r) => r.severity === 'URGENT').length;
  const warningCount = recommendations.filter((r) => r.severity === 'WARNING').length;
  const infoCount = recommendations.filter((r) => r.severity === 'INFO').length;

  const renderSeverityIcon = (severity: SeverityLevel, color: string) => {
    if (severity === 'URGENT' || severity === 'WARNING') {
      return <AlertTriangle size={13} color={color} />;
    }
    return <Info size={13} color={color} />;
  };

  return (
    <View className="mb-6">
      {/* ── Section Header (Collapsible) ── */}
      <TouchableOpacity
        onPress={() => setIsSectionExpanded((prev) => !prev)}
        activeOpacity={0.8}
        className="bg-white rounded-[20px] p-4 mb-3 border border-slate-100 flex-row items-center justify-between"
        style={CARD_SHADOW}
      >
        <View className="flex-row items-center flex-1 mr-3">
          <View className="w-10 h-10 rounded-[14px] bg-emerald-50 border border-emerald-100 items-center justify-center mr-3">
            <Sparkles size={20} color="#15803D" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-800 font-bold text-[15px] leading-5">
              🩺 AI Clinical Decision Support
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              WHO Guideline-Based Recommendations
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          {urgentCount > 0 && (
            <View className="bg-red-100 px-2 py-0.5 rounded-full">
              <Text className="text-red-700 font-bold text-[11px]">{urgentCount} Urgent</Text>
            </View>
          )}
          {warningCount > 0 && (
            <View className="bg-orange-100 px-2 py-0.5 rounded-full">
              <Text className="text-orange-700 font-bold text-[11px]">{warningCount} Warning</Text>
            </View>
          )}
          {recommendations.length === 0 && (
            <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
              <Text className="text-emerald-700 font-bold text-[11px]">Normal</Text>
            </View>
          )}
          <View className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center ml-1">
            {isSectionExpanded ? (
              <ChevronUp size={16} color="#64748B" />
            ) : (
              <ChevronDown size={16} color="#64748B" />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Section Body (Visible when expanded) ── */}
      {isSectionExpanded && (
        <View>
          {/* Quick Summary Strip if multiple recommendations */}
          {recommendations.length > 0 && (
            <View className="flex-row items-center justify-between px-1 mb-2.5">
              <Text className="text-slate-500 font-semibold text-xs">
                {recommendations.length} Active {recommendations.length === 1 ? 'Notice' : 'Notices'}
              </Text>
              <View className="flex-row gap-1.5">
                {urgentCount > 0 && (
                  <View className="flex-row items-center bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                    <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                    <Text className="text-red-700 text-[10px] font-bold">{urgentCount} Urgent</Text>
                  </View>
                )}
                {warningCount > 0 && (
                  <View className="flex-row items-center bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                    <View className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5" />
                    <Text className="text-orange-700 text-[10px] font-bold">{warningCount} Warning</Text>
                  </View>
                )}
                {infoCount > 0 && (
                  <View className="flex-row items-center bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                    <Text className="text-blue-700 text-[10px] font-bold">{infoCount} Info</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Empty State: Green Success Card ── */}
          {recommendations.length === 0 ? (
            <View
              className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-5 mb-2"
              style={CARD_SHADOW}
            >
              <View className="flex-row items-start">
                <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center mr-3 mt-0.5">
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-900 font-bold text-sm mb-1">
                    Normal Clinical Status
                  </Text>
                  <Text className="text-emerald-800 text-[13px] leading-5">
                    No clinical concerns detected. Patient vitals within normal range.
                  </Text>
                  <View className="flex-row items-center mt-3 pt-2.5 border-t border-emerald-100">
                    <Shield size={13} color="#15803D" />
                    <Text className="text-emerald-700 font-medium text-xs ml-1.5">
                      Compliant with WHO Antenatal Care Standards
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* ── Recommendation Cards List ── */
            recommendations.map((rec) => {
              const isCardExpanded = Boolean(expandedCardIds[rec.id]);

              return (
                <View
                  key={rec.id}
                  className="bg-white rounded-[20px] mb-3 overflow-hidden border border-slate-100"
                  style={CARD_SHADOW}
                >
                  <View className="flex-row">
                    {/* Left Color Bar */}
                    <View style={{ width: 6, backgroundColor: rec.color }} />

                    {/* Card Content Body */}
                    <View className="flex-1 p-4">
                      {/* Top Row: Severity Badge + Evidence Tag */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View
                          className="flex-row items-center px-2.5 py-1 rounded-full border"
                          style={{
                            backgroundColor: rec.badgeBg,
                            borderColor: rec.badgeBorder,
                          }}
                        >
                          {renderSeverityIcon(rec.severity, rec.color)}
                          <Text
                            className="font-bold text-[11px] ml-1.5 uppercase tracking-wide"
                            style={{ color: rec.badgeText }}
                          >
                            {rec.severity}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Text className="text-slate-400 text-[11px] font-medium">
                            WHO ANC Guideline
                          </Text>
                        </View>
                      </View>

                      {/* Title */}
                      <Text className="text-slate-900 font-bold text-[15px] leading-5 mb-1.5">
                        {rec.title}
                      </Text>

                      {/* Description Text */}
                      <Text className="text-slate-600 text-[13px] leading-5 mb-2">
                        {rec.description}
                      </Text>

                      {/* Expandable Guideline Reference Toggle Button */}
                      <TouchableOpacity
                        onPress={() => toggleCardExpanded(rec.id)}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between bg-slate-50 border border-slate-200/70 rounded-[12px] px-3.5 py-2.5 mt-1"
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <Shield size={14} color={rec.color} />
                          <Text className="text-slate-700 font-semibold text-xs ml-2">
                            {isCardExpanded ? 'Hide Guideline Reference' : 'Guideline Reference'}
                          </Text>
                          {rec.evidenceCode && (
                            <View className="ml-2 bg-slate-200/80 px-1.5 py-0.5 rounded">
                              <Text className="text-slate-600 font-mono text-[10px]">
                                {rec.evidenceCode}
                              </Text>
                            </View>
                          )}
                        </View>
                        {isCardExpanded ? (
                          <ChevronUp size={16} color="#64748B" />
                        ) : (
                          <ChevronDown size={16} color="#64748B" />
                        )}
                      </TouchableOpacity>

                      {/* Expanded Guideline Details */}
                      {isCardExpanded && (
                        <View className="mt-2.5 bg-slate-50 border border-slate-200 rounded-[14px] p-3.5">
                          {/* Evidence Reference */}
                          <View className="mb-2.5">
                            <Text className="text-slate-500 font-bold text-[11px] uppercase tracking-wider mb-1">
                              Clinical Evidence & Reference
                            </Text>
                            <Text className="text-slate-700 text-xs leading-5">
                              {rec.guidelineReference}
                            </Text>
                          </View>

                          {/* Recommended Clinical Action */}
                          <View className="pt-2.5 border-t border-slate-200">
                            <Text className="text-emerald-700 font-bold text-[11px] uppercase tracking-wider mb-1">
                              Recommended Clinical Action
                            </Text>
                            <Text className="text-slate-800 text-xs leading-5 font-medium">
                              • {rec.actionRecommendation}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}
