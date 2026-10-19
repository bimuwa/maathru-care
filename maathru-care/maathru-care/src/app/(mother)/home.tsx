import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  Brain, Activity, Bell, ChevronRight, Heart, AlertTriangle,
  TrendingUp, HeartPulse, Pill, ShieldAlert, Calendar, Clock,
  CheckCircle, Stethoscope, Baby, Scale, FileText,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api, RiskPredictionResult } from '../../services/api';

// ─── Risk colour maps ─────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

// ─── Doctor availability ──────────────────────────────────────────────────────
const STATUS_INFO: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available:   { label: 'Available',   color: '#10B981', bg: '#ECFDF5', dot: '#10B981' },
  busy:        { label: 'Busy',        color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  in_surgery:  { label: 'In Surgery',  color: '#EF4444', bg: '#FEF2F2', dot: '#EF4444' },
  away:        { label: 'Away',        color: '#94A3B8', bg: '#F1F5F9', dot: '#94A3B8' },
};

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

function getFirstName(fullName: string) {
  return fullName?.split(' ')[0] || 'Mom';
}

function getTrimester(weeks: number) {
  if (weeks <= 13) return { label: 'Trimester 1', number: 1, percent: Math.round((weeks / 13) * 100) };
  if (weeks <= 26) return { label: 'Trimester 2', number: 2, percent: Math.round(((weeks - 13) / 13) * 100) };
  return { label: 'Trimester 3', number: 3, percent: Math.round(((weeks - 26) / 14) * 100) };
}

// ── Due date countdown using Naegele's rule from gestational weeks ────────────
function getDueDateInfo(gestationalWeeks: number): { weeksLeft: number; daysLeft: number; eddFormatted: string } {
  const totalPregnancyDays = 280;
  const daysPregnant = Math.round(gestationalWeeks * 7);
  const daysLeft = Math.max(0, totalPregnancyDays - daysPregnant);
  const edd = new Date();
  edd.setDate(edd.getDate() + daysLeft);
  return {
    weeksLeft: Math.floor(daysLeft / 7),
    daysLeft: daysLeft % 7,
    eddFormatted: edd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

export default function MotherHomeScreen() {
  const { user } = useAuth();
  const [latestRisk, setLatestRisk] = useState<RiskPredictionResult | null>(null);
  const [hasAlert, setHasAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorStatus, setDoctorStatus] = useState<{ status: string; message?: string } | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  const [upcomingAppointment, setUpcomingAppointment] = useState<any | null>(null);

  const weeks = user?.gestationalAgeWeeks ?? 0;
  const trimester = getTrimester(weeks);
  const dueDateInfo = weeks > 0 ? getDueDateInfo(weeks) : null;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [historyRes, alertsRes] = await Promise.all([
        api.getRiskHistory(user.id).catch(() => ({ success: false, history: [] })),
        api.getPatientAlerts(user.id).catch(() => ({ success: false, alerts: [] })),
      ]);

      if (historyRes.success && (historyRes as any).history?.length > 0) {
        setLatestRisk((historyRes as any).history[0]);
        setHasAlert((historyRes as any).history[0].isAlertRequired);
      }

      // Check for upcoming appointment alerts
      if (alertsRes.success) {
        const allAlerts: any[] = (alertsRes as any).alerts ?? [];
        const apptAlert = allAlerts.find(a =>
          a.alertType === 'appointment' ||
          a.alert_type === 'appointment' ||
          a.status === 'Upcoming'
        );
        setUpcomingAppointment(apptAlert || null);
      }
    } catch { }
    finally { setIsLoading(false); setRefreshing(false); }
  }, [user?.id]);

  const fetchDoctorStatus = useCallback(async () => {
    if (!user?.assignedDoctorId) return;
    try {
      const statusRes = await api.getDoctorStatus(user.assignedDoctorId);
      if (statusRes.success) setDoctorStatus(statusRes);
    } catch { }
  }, [user?.assignedDoctorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll doctor status every 10 seconds for real-time updates
  useEffect(() => {
    fetchDoctorStatus();
    const interval = setInterval(fetchDoctorStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchDoctorStatus]);

  const handleSOS = async () => {
    setSosConfirmVisible(false);
    setSosLoading(true);
    try {
      await api.sendSOS({
        patientId: user!.id,
        patientName: user!.fullName,
        patientAge: user?.age ?? 0,
        gestationalAge: weeks,
        doctorId: user?.assignedDoctorId ?? 'doc-elizabeth-001',
        lastRiskLevel: latestRisk?.riskLevel ?? 'Unknown',
        lastBP: latestRisk
          ? `${latestRisk.factors?.find((f: any) => f.feature === 'SystolicBP')?.value ?? '—'}/${latestRisk.factors?.find((f: any) => f.feature === 'DiastolicBP')?.value ?? '—'}`
          : 'Unknown',
      });
      Alert.alert(
        '🆘 SOS Sent!',
        `Your emergency alert has been sent to ${user?.assignedDoctorName ?? 'your doctor'}. They have been notified immediately. Please stay calm and call emergency services if needed.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'Failed to send SOS. Please call emergency services directly.');
    } finally { setSosLoading(false); }
  };

  const riskColor = latestRisk ? RISK_COLORS[latestRisk.riskLevel] ?? '#10B981' : '#10B981';
  const riskBg = latestRisk ? RISK_BG[latestRisk.riskLevel] ?? '#ECFDF5' : '#ECFDF5';
  const docStatus = doctorStatus?.status ? STATUS_INFO[doctorStatus.status] ?? STATUS_INFO.available : null;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#15803D" />}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-emerald-100 text-sm">{getGreeting()},</Text>
            <Text className="text-white text-2xl font-bold mt-0.5">
              {getFirstName(user?.fullName ?? 'Mom')} 👶
            </Text>
            <Text className="text-emerald-200 text-xs mt-1">Your maternal care companion</Text>
          </View>
          <View className="bg-white/20 w-12 h-12 rounded-full items-center justify-center">
            <Heart color="#FFFFFF" size={22} fill="#FFFFFF" />
          </View>
        </View>
        <View className="bg-white/15 rounded-[16px] mt-4 px-4 py-2 flex-row items-center self-start">
          <View className="w-2 h-2 rounded-full bg-emerald-300 mr-2" />
          <Text className="text-white text-xs font-semibold uppercase tracking-wider">
            Week {weeks} of Pregnancy
          </Text>
        </View>
      </View>

      <View className="px-5 -mt-4">

        {/* ── SOS BUTTON ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setSosConfirmVisible(true)}
          activeOpacity={0.85}
          disabled={sosLoading}
          className="rounded-[20px] py-4 px-5 mb-4 flex-row items-center justify-center"
          style={{
            backgroundColor: '#EF4444',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {sosLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ShieldAlert color="#FFFFFF" size={22} />
              <View className="ml-3">
                <Text className="text-white font-bold text-lg">🆘 Emergency SOS</Text>
                <Text className="text-red-200 text-xs">Alert your doctor immediately</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* ── Appointment Notification Banner ─────────────────────────────────── */}
        {upcomingAppointment && (
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/mother-doctor-profile',
              params: { doctorId: user?.assignedDoctorId ?? '', doctorName: user?.assignedDoctorName ?? '' }
            })}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#BFDBFE',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ backgroundColor: '#2563EB', borderRadius: 12, padding: 10, marginRight: 12 }}>
              <Calendar color="#FFFFFF" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1E40AF', fontWeight: 'bold', fontSize: 13 }}>
                📅 Appointment Scheduled!
              </Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {upcomingAppointment.alertMessage?.split('\n')[1]?.replace('Date & Time: ', '') ||
                  upcomingAppointment.scheduledAt ||
                  'Your doctor has scheduled a visit'}
              </Text>
              <Text style={{ color: '#93C5FD', fontSize: 10, marginTop: 2 }}>Tap to view details →</Text>
            </View>
            <ChevronRight color="#93C5FD" size={16} />
          </TouchableOpacity>
        )}

        {/* ── Due Date Countdown ──────────────────────────────────────────────── */}
        {dueDateInfo && dueDateInfo.weeksLeft > 0 && (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Calendar color="#15803D" size={16} />
                  <Text className="text-emerald-700 font-bold text-sm ml-2">AI Estimated Due Date</Text>
                </View>
                <Text className="text-slate-800 font-bold text-2xl">
                  {dueDateInfo.weeksLeft} weeks
                  {dueDateInfo.daysLeft > 0 ? ` ${dueDateInfo.daysLeft} days` : ''}
                </Text>
                <Text className="text-slate-500 text-xs mt-1">until estimated delivery</Text>
                <Text className="text-emerald-600 text-xs font-semibold mt-0.5">~{dueDateInfo.eddFormatted}</Text>
              </View>
              <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center">
                <Text className="text-emerald-700 font-bold text-xl">{dueDateInfo.weeksLeft}</Text>
                <Text className="text-emerald-500 text-[9px] font-semibold">wks left</Text>
              </View>
            </View>
            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <View className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, (weeks / 40) * 100)}%` }} />
            </View>
            <Text className="text-slate-400 text-[10px] mt-2">
              ⚠️ This is an AI estimation based on your gestational age. Actual date may vary. Always confirm with your doctor.
            </Text>
          </View>
        )}

        {/* ── Trimester Progress ──────────────────────────────────────────────── */}
        <View className="bg-white rounded-[20px] p-5 shadow-sm shadow-slate-200 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-emerald-700 font-bold text-base">Week {weeks}</Text>
              <Text className="text-slate-600 text-sm mt-0.5">Your baby is growing beautifully 💚</Text>
            </View>
            <View className="bg-emerald-50 p-2 rounded-full">
              <Heart color="#15803D" size={22} />
            </View>
          </View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{trimester.label}</Text>
            <Text className="text-emerald-700 text-xs font-bold">{trimester.percent}%</Text>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(trimester.percent, 100)}%` }} />
          </View>
        </View>

        {/* ── Alert Banner ────────────────────────────────────────────────────── */}
        {hasAlert && (
          <View className="bg-red-50 border border-red-200 rounded-[16px] p-4 mb-4 flex-row items-center">
            <AlertTriangle color="#EF4444" size={20} />
            <View className="flex-1 ml-3">
              <Text className="text-red-700 font-semibold text-sm">High-Risk Alert Active</Text>
              <Text className="text-red-500 text-xs mt-0.5">Your doctor has been notified. Please contact them promptly.</Text>
            </View>
          </View>
        )}

        {/* ── Current Risk Card ───────────────────────────────────────────────── */}
        <View className="rounded-[20px] p-5 mb-4" style={{ backgroundColor: riskBg, borderWidth: 1, borderColor: riskColor + '30' }}>
          <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-3">Current Risk Level</Text>
          {isLoading ? (
            <ActivityIndicator color="#15803D" />
          ) : latestRisk ? (
            <>
              <View className="flex-row items-center justify-between">
                <View>
                  <View className="px-4 py-1.5 rounded-full self-start mb-2" style={{ backgroundColor: riskColor }}>
                    <Text className="text-white font-bold text-sm">{latestRisk.riskLevel}</Text>
                  </View>
                  <Text className="text-slate-700 font-bold text-2xl">{latestRisk.highRiskProbability.toFixed(1)}%</Text>
                  <Text className="text-slate-500 text-xs">High-risk probability</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(mother)/trends')} className="bg-white/80 rounded-[14px] p-3 items-center">
                  <TrendingUp color={riskColor} size={24} />
                  <Text className="text-xs mt-1" style={{ color: riskColor }}>Trends</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-slate-400 text-xs mt-3">
                Assessed: {latestRisk.createdAt ? new Date(latestRisk.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </>
          ) : (
            <View>
              <Text className="text-slate-500 text-sm">No assessment yet.</Text>
              <TouchableOpacity onPress={() => router.push('/(mother)/detect')} className="bg-emerald-700 rounded-[12px] px-5 py-2.5 mt-3 self-start">
                <Text className="text-white font-semibold text-sm">Start Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Quick Actions Grid ──────────────────────────────────────────────── */}
        <Text className="text-slate-800 font-bold text-base mb-3">Quick Actions</Text>
        <View className="flex-row flex-wrap gap-3 mb-4">
          {[
            { label: 'AI Risk Assessment', sub: '13-vital analysis', icon: <Brain color="#fff" size={22} />, bg: '#15803D', onPress: () => router.push('/(mother)/detect'), dark: true },
            { label: 'Daily Symptoms', sub: 'Log today', icon: <Activity color="#15803D" size={22} />, bg: '#fff', onPress: () => router.push('/(mother)/wellness'), dark: false },
            { label: 'BP & Weight', sub: 'Track vitals', icon: <HeartPulse color="#15803D" size={22} />, bg: '#fff', onPress: () => router.push('/vitals'), dark: false },
            { label: 'Medications', sub: 'My prescriptions', icon: <Pill color="#15803D" size={22} />, bg: '#fff', onPress: () => router.push('/medications'), dark: false },
            { label: 'Risk Trends', sub: 'History & analysis', icon: <TrendingUp color="#15803D" size={22} />, bg: '#fff', onPress: () => router.push('/(mother)/trends'), dark: false },
            { label: 'Chat Doctor', sub: 'Message now', icon: <Bell color="#15803D" size={22} />, bg: '#fff', onPress: () => router.push({ pathname: '/mother-chat', params: { doctorId: user?.assignedDoctorId ?? '', doctorName: user?.assignedDoctorName ?? 'Doctor' } }), dark: false },
          ].map((action, i) => (
            <TouchableOpacity key={i} onPress={action.onPress} activeOpacity={0.8}
              className="rounded-[18px] p-4 flex-1 border"
              style={{ minWidth: '45%', backgroundColor: action.bg, borderColor: action.dark ? '#15803D' : '#F1F5F9' }}>
              {action.icon}
              <Text className="font-bold text-sm mt-2" style={{ color: action.dark ? '#fff' : '#1E293B' }}>{action.label}</Text>
              <Text className="text-xs mt-0.5" style={{ color: action.dark ? '#86EFAC' : '#94A3B8' }}>{action.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Assigned Doctor with Availability Status ────────────────────────── */}
        {user?.assignedDoctorName && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/mother-doctor-profile', params: { doctorId: user.assignedDoctorId ?? '', doctorName: user.assignedDoctorName ?? '' } })}
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-5 mb-8 border border-slate-100"
          >
            <Text className="text-slate-500 text-xs font-semibold uppercase mb-3">Your Assigned Doctor</Text>
            <View className="flex-row items-center">
              <View className="bg-emerald-50 w-12 h-12 rounded-full items-center justify-center mr-3">
                <Stethoscope color="#15803D" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 font-bold">{user.assignedDoctorName}</Text>
                <Text className="text-slate-400 text-xs">Obstetrics & Gynaecology</Text>
                {/* ── Doctor Availability Status ── */}
                {docStatus && (
                  <View className="flex-row items-center mt-1.5">
                    <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: docStatus.dot }} />
                    <Text className="text-xs font-semibold" style={{ color: docStatus.color }}>{docStatus.label}</Text>
                    {doctorStatus?.message ? (
                      <Text className="text-slate-400 text-xs ml-1.5">— {doctorStatus.message}</Text>
                    ) : null}
                  </View>
                )}
                <Text className="text-emerald-600 text-xs mt-1">Tap to view profile & feedback →</Text>
              </View>
              <ChevronRight color="#94A3B8" size={18} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── More Tools ──────────────────────────────────────────────────── */}
      <View className="px-5 mt-6 mb-4">
        <Text className="text-slate-800 font-bold text-base mb-3">More Tools</Text>
        <View className="flex-row flex-wrap gap-3">
          {/* Kick Counter */}
          <TouchableOpacity
            onPress={() => router.push('/kick-counter')}
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-4 items-center justify-center"
            style={{ width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <View className="w-12 h-12 bg-pink-50 rounded-full items-center justify-center mb-2">
              <Baby color="#EC4899" size={22} />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Kick Counter</Text>
            <Text className="text-slate-400 text-xs text-center mt-0.5">Track baby movements</Text>
          </TouchableOpacity>

          {/* Weight Tracker */}
          <TouchableOpacity
            onPress={() => router.push('/weight-tracker')}
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-4 items-center justify-center"
            style={{ width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mb-2">
              <Scale color="#3B82F6" size={22} />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Weight Tracker</Text>
            <Text className="text-slate-400 text-xs text-center mt-0.5">IOM guidelines chart</Text>
          </TouchableOpacity>

          {/* Health Report */}
          <TouchableOpacity
            onPress={() => router.push('/health-report')}
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-4 items-center justify-center"
            style={{ width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center mb-2">
              <FileText color="#15803D" size={22} />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Health Report</Text>
            <Text className="text-slate-400 text-xs text-center mt-0.5">Generate PDF report</Text>
          </TouchableOpacity>

          {/* Appointments */}
          <TouchableOpacity
            onPress={() => router.push('/appointments')}
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-4 items-center justify-center"
            style={{ width: '47%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <View className="w-12 h-12 bg-purple-50 rounded-full items-center justify-center mb-2">
              <Calendar color="#7C3AED" size={22} />
            </View>
            <Text className="text-slate-700 font-semibold text-sm">Appointments</Text>
            <Text className="text-slate-400 text-xs text-center mt-0.5">View schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SOS Confirmation Modal ─────────────────────────────────────────── */}
      <Modal visible={sosConfirmVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-[28px] p-8 w-full">
            <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center self-center mb-5">
              <ShieldAlert color="#EF4444" size={36} />
            </View>
            <Text className="text-slate-800 font-bold text-xl text-center">Send Emergency SOS?</Text>
            <Text className="text-slate-500 text-sm text-center mt-3 mb-2 leading-5">
              This will immediately send an emergency alert to{' '}
              <Text className="font-bold text-slate-700">{user?.assignedDoctorName ?? 'your doctor'}</Text> with your current health information.
            </Text>
            <Text className="text-slate-400 text-xs text-center mb-6">
              Use this only for genuine emergencies. For life-threatening situations, call emergency services (110/119) directly.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setSosConfirmVisible(false)} className="flex-1 py-4 bg-slate-100 rounded-[16px] items-center">
                <Text className="text-slate-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSOS} className="flex-1 py-4 rounded-[16px] items-center" style={{ backgroundColor: '#EF4444' }}>
                <Text className="text-white font-bold">Send SOS 🆘</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}
