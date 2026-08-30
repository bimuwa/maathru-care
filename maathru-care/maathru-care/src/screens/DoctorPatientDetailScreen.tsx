import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Calendar,
  CheckCircle,
  Save,
  Pill,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { api, DailySymptomLog, RiskPredictionResult, DoctorAlert } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── PrescriptionWriter inline component ─────────────────────────────────────
const FREQ_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'With meals', 'At bedtime', 'As needed'];
const DUR_OPTIONS = ['7 days', '14 days', '30 days', '3 months', 'Ongoing'];

interface MedEntry { name: string; dosage: string; frequency: string; duration: string; instructions: string; }

function PrescriptionWriter({ patientId, doctorId }: { patientId: string; doctorId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [meds, setMeds] = useState<MedEntry[]>([{ name: '', dosage: '', frequency: 'Once daily', duration: '30 days', instructions: '' }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addMed = () => setMeds(prev => [...prev, { name: '', dosage: '', frequency: 'Once daily', duration: '30 days', instructions: '' }]);
  const removeMed = (i: number) => setMeds(prev => prev.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof MedEntry, val: string) =>
    setMeds(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const handleSave = async () => {
    const validMeds = meds.filter(m => m.name.trim() && m.dosage.trim());
    if (validMeds.length === 0) { Alert.alert('Missing Details', 'Please enter at least one medication name and dosage.'); return; }
    setSaving(true);
    try {
      await api.createPrescription({ patientId, doctorId, medications: validMeds, notes });
      setSaved(true);
      setMeds([{ name: '', dosage: '', frequency: 'Once daily', duration: '30 days', instructions: '' }]);
      setNotes('');
      setExpanded(false);
      Alert.alert('✅ Prescription Sent', 'The patient will see this prescription in their Medications tab immediately.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save prescription.');
    } finally { setSaving(false); }
  };

  return (
    <View className="bg-white rounded-[20px] p-5 mb-8 shadow-sm shadow-slate-100">
      <TouchableOpacity onPress={() => { setExpanded(!expanded); setSaved(false); }}
        className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pill color="#15803D" size={18} />
          <Text className="text-slate-800 font-bold text-sm ml-2">Write Prescription</Text>
          {saved && <View className="ml-2 bg-emerald-100 px-2 py-0.5 rounded-full"><Text className="text-emerald-700 text-xs font-bold">Sent ✓</Text></View>}
        </View>
        <Text className="text-emerald-600 text-sm font-semibold">{expanded ? '▲ Close' : '▼ Add Rx'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-4">
          <Text className="text-slate-400 text-xs mb-4 leading-4">
            Prescriptions are sent directly to the patient's app and visible in their Medications tab.
          </Text>

          {meds.map((med, i) => (
            <View key={i} className="bg-slate-50 rounded-[16px] p-4 mb-3 border border-slate-200">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-slate-600 font-bold text-xs uppercase tracking-wider">Medication {i + 1}</Text>
                {meds.length > 1 && (
                  <TouchableOpacity onPress={() => removeMed(i)}>
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row gap-2 mb-2">
                <TextInput value={med.name} onChangeText={v => updateMed(i, 'name', v)}
                  placeholder="Medicine name" placeholderTextColor="#CBD5E1"
                  className="flex-1 bg-white border border-slate-200 rounded-[10px] px-3 py-2.5 text-slate-800 text-sm" />
                <TextInput value={med.dosage} onChangeText={v => updateMed(i, 'dosage', v)}
                  placeholder="Dosage (e.g. 500mg)" placeholderTextColor="#CBD5E1"
                  className="flex-1 bg-white border border-slate-200 rounded-[10px] px-3 py-2.5 text-slate-800 text-sm" />
              </View>
              {/* Frequency chips */}
              <Text className="text-slate-400 text-xs mb-1">Frequency</Text>
              <View className="flex-row flex-wrap gap-1.5 mb-2">
                {FREQ_OPTIONS.map(f => (
                  <TouchableOpacity key={f} onPress={() => updateMed(i, 'frequency', f)}
                    className="px-3 py-1 rounded-full border"
                    style={{ backgroundColor: med.frequency === f ? '#15803D' : '#fff', borderColor: med.frequency === f ? '#15803D' : '#E2E8F0' }}>
                    <Text className="text-xs font-semibold" style={{ color: med.frequency === f ? '#fff' : '#64748B' }}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Duration chips */}
              <Text className="text-slate-400 text-xs mb-1">Duration</Text>
              <View className="flex-row flex-wrap gap-1.5 mb-2">
                {DUR_OPTIONS.map(d => (
                  <TouchableOpacity key={d} onPress={() => updateMed(i, 'duration', d)}
                    className="px-3 py-1 rounded-full border"
                    style={{ backgroundColor: med.duration === d ? '#0EA5E9' : '#fff', borderColor: med.duration === d ? '#0EA5E9' : '#E2E8F0' }}>
                    <Text className="text-xs font-semibold" style={{ color: med.duration === d ? '#fff' : '#64748B' }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={med.instructions} onChangeText={v => updateMed(i, 'instructions', v)}
                placeholder="Special instructions (optional)" placeholderTextColor="#CBD5E1"
                className="bg-white border border-slate-200 rounded-[10px] px-3 py-2.5 text-slate-700 text-sm" />
            </View>
          ))}

          <TouchableOpacity onPress={addMed} className="flex-row items-center justify-center py-3 border border-dashed border-emerald-300 rounded-[14px] mb-3">
            <Plus color="#15803D" size={16} />
            <Text className="text-emerald-700 font-semibold ml-1 text-sm">Add Another Medication</Text>
          </TouchableOpacity>

          <TextInput value={notes} onChangeText={setNotes}
            placeholder="General prescription notes (e.g. take with food, avoid alcohol...)"
            placeholderTextColor="#CBD5E1" multiline numberOfLines={2}
            className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-slate-700 text-sm mb-4"
            style={{ textAlignVertical: 'top' }} />

          <TouchableOpacity onPress={handleSave} disabled={saving}
            className="bg-emerald-700 rounded-[14px] py-4 flex-row items-center justify-center">
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Pill color="#fff" size={16} />
                <Text className="text-white font-bold ml-2">Send Prescription to Patient</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

export default function DoctorPatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const patientId = (params.patientId as string) ?? '';

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState('Patient');
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [patientGestWeeks, setPatientGestWeeks] = useState<number | null>(null);
  const [patientBloodGroup, setPatientBloodGroup] = useState<string>('—');
  const [riskHistory, setRiskHistory] = useState<RiskPredictionResult[]>([]);
  const [symptoms, setSymptoms] = useState<DailySymptomLog[]>([]);
  const [alerts, setAlerts] = useState<DoctorAlert[]>([]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Summary Modal
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Appointment Modal
  const [apptVisible, setApptVisible] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptReason, setApptReason] = useState('Follow-up visit');
  const [schedulingAppt, setSchedulingAppt] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [riskRes, symRes, alertsRes, patientsRes] = await Promise.all([
        api.getRiskHistory(patientId).catch(() => ({ success: false, history: [] })),
        api.getSymptomsHistory(patientId).catch(() => ({ success: false, history: [] })),
        api.getDoctorAlerts(user?.id ?? '').catch(() => ({ success: false, alerts: [] })),
        api.getDoctorPatients(user?.id ?? '').catch(() => ({ success: false, patients: [] })),
      ]);

      if (riskRes.success) setRiskHistory(riskRes.history || []);
      if (symRes.success) setSymptoms(symRes.history || []);
      if (alertsRes.success) setAlerts((alertsRes.alerts || []).filter((a) => a.patientId === patientId));
      if (patientsRes.success) {
        const found = patientsRes.patients?.find((p) => p.id === patientId);
        if (found) {
          setPatientName(found.fullName);
          setPatientAge(found.age || null);
          setPatientGestWeeks(found.gestationalAgeWeeks || null);
          setPatientBloodGroup(found.bloodGroup || '—');
        }
      }
    } catch (err) {
      console.warn('Load patient detail error:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryVisible(true);
    try {
      const res = await api.getPatientAppointmentSummary(patientId);
      if (res.success) setSummary(res.summary);
    } catch {
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!doctorNotes.trim()) {
      Alert.alert('Empty Notes', 'Please write your clinical notes before saving.');
      return;
    }
    setSavingNotes(true);
    try {
      const latestAssessmentId = riskHistory[0]?.id;
      await api.saveDoctorNotes(patientId, doctorNotes.trim(), latestAssessmentId);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
      Alert.alert('✅ Notes Saved', 'Your clinical notes have been saved and are now visible to the patient.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!apptDate.trim()) {
      Alert.alert('Date Required', 'Please enter a date and time for the appointment.');
      return;
    }
    setSchedulingAppt(true);
    try {
      await api.scheduleAppointment(patientId, apptDate.trim(), apptReason, user?.id ?? '');
      setApptVisible(false);
      setApptDate('');
      setApptReason('Follow-up visit');
      Alert.alert('📅 Appointment Scheduled', `Appointment set for ${apptDate}. Pending alerts for this patient have been updated.`);
      loadData(); // Refresh
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule appointment.');
    } finally {
      setSchedulingAppt(false);
    }
  };

  const currentRisk = riskHistory[0];
  const prevRisk = riskHistory[1];
  const riskColor = currentRisk ? RISK_COLORS[currentRisk.riskLevel] ?? '#10B981' : '#10B981';
  const riskBg = currentRisk ? RISK_BG[currentRisk.riskLevel] ?? '#ECFDF5' : '#ECFDF5';

  let trendIcon = <Minus color="#64748B" size={18} />;
  let trendText = 'Stable';
  let trendColor = '#64748B';
  if (currentRisk && prevRisk) {
    const diff = currentRisk.highRiskProbability - prevRisk.highRiskProbability;
    if (diff > 5) { trendIcon = <TrendingUp color="#EF4444" size={18} />; trendText = `+${diff.toFixed(1)}% Increasing`; trendColor = '#EF4444'; }
    else if (diff < -5) { trendIcon = <TrendingDown color="#10B981" size={18} />; trendText = `${diff.toFixed(1)}% Improving`; trendColor = '#10B981'; }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803D" />
        <Text className="text-slate-400 mt-3">Loading patient file...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-emerald-700 pt-14 pb-8 px-5">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
            <ArrowLeft color="#FFFFFF" size={20} />
            <Text className="text-white ml-2 font-semibold">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">{patientName}</Text>
          <Text className="text-emerald-200 text-sm mt-1">
            {patientGestWeeks ? `Week ${patientGestWeeks}` : ''}
            {patientAge ? ` • Age ${patientAge}` : ''}
            {patientBloodGroup !== '—' ? ` • ${patientBloodGroup}` : ''}
          </Text>
        </View>

        <View className="px-5 pt-4">
          {/* Quick Actions Row */}
          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              onPress={handleGenerateSummary}
              className="flex-1 bg-emerald-700 rounded-[16px] py-4 items-center"
            >
              <Sparkles color="#FFFFFF" size={18} />
              <Text className="text-white font-bold text-xs mt-1 text-center">AI Summary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setApptVisible(true)}
              className="flex-1 bg-blue-600 rounded-[16px] py-4 items-center"
            >
              <Calendar color="#FFFFFF" size={18} />
              <Text className="text-white font-bold text-xs mt-1 text-center">Schedule Appt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/doctor-chat', params: { patientId, patientName } })}
              className="flex-1 bg-white border border-slate-200 rounded-[16px] py-4 items-center"
            >
              <MessageCircle color="#15803D" size={18} />
              <Text className="text-emerald-700 font-bold text-xs mt-1 text-center">Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Current Risk Card */}
          {currentRisk ? (
            <View className="rounded-[20px] p-5 mb-4" style={{ backgroundColor: riskBg, borderWidth: 1, borderColor: riskColor + '40' }}>
              <Text className="text-slate-500 text-xs font-semibold uppercase mb-2">Current Risk Assessment</Text>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-slate-800 font-bold text-3xl">{currentRisk.highRiskProbability.toFixed(1)}%</Text>
                  <View className="px-3 py-1 rounded-full self-start mt-1" style={{ backgroundColor: riskColor }}>
                    <Text className="text-white font-bold text-xs">{currentRisk.riskLevel}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center gap-1">
                    {trendIcon}
                    <Text className="font-semibold text-xs" style={{ color: trendColor }}>{trendText}</Text>
                  </View>
                  <Text className="text-xs text-slate-400 mt-1">{riskHistory.length} assessments</Text>
                </View>
              </View>
              <View className="h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${Math.min(100, currentRisk.highRiskProbability)}%`, backgroundColor: riskColor }} />
              </View>
              {currentRisk.createdAt && (
                <Text className="text-slate-400 text-xs mt-2">
                  Last assessed: {new Date(currentRisk.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              )}
            </View>
          ) : (
            <View className="bg-white rounded-[20px] p-5 mb-4 items-center">
              <Text className="text-slate-400 text-sm">No risk assessments yet</Text>
            </View>
          )}

          {/* Risk Assessment History */}
          {riskHistory.length > 0 && (
            <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
              <Text className="text-slate-800 font-bold text-sm mb-3">Assessment History</Text>
              {riskHistory.slice(0, 5).map((h, i) => (
                <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-50">
                  <Text className="text-slate-500 text-xs">
                    {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : `#${i + 1}`}
                  </Text>
                  <Text className="text-slate-700 font-semibold text-sm">{h.highRiskProbability.toFixed(1)}%</Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: RISK_BG[h.riskLevel] ?? '#ECFDF5' }}>
                    <Text className="text-xs font-bold" style={{ color: RISK_COLORS[h.riskLevel] ?? '#10B981' }}>{h.riskLevel}</Text>
                  </View>
                  {(h as any).doctorNotes && (
                    <FileText color="#15803D" size={14} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recent Symptoms */}
          {symptoms.length > 0 && (
            <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
              <Text className="text-slate-800 font-bold text-sm mb-3">Recent Symptoms</Text>
              {symptoms.slice(0, 3).map((s, i) => (
                <View key={i} className="flex-row items-start py-2 border-b border-slate-50">
                  <Text className="text-slate-400 text-xs w-20">
                    {new Date(s.logDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <View className="flex-1 flex-row flex-wrap gap-1">
                    {s.symptoms.map((sym) => (
                      <Text key={sym} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{sym}</Text>
                    ))}
                  </View>
                  <Text className="text-xs capitalize font-semibold" style={{
                    color: s.severity === 'mild' ? '#10B981' : s.severity === 'moderate' ? '#F59E0B' : '#EF4444'
                  }}>{s.severity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
              <Text className="text-slate-800 font-bold text-sm mb-3">Alerts ({alerts.length})</Text>
              {alerts.slice(0, 3).map((a, i) => (
                <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-slate-700 text-sm font-semibold" numberOfLines={1}>{a.alertTitle}</Text>
                    <Text className="text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View className="px-2 py-0.5 rounded-full" style={{
                    backgroundColor: a.status === 'Pending' ? '#FFFBEB' : a.status === 'Closed' ? '#ECFDF5' : '#EFF6FF'
                  }}>
                    <Text className="text-xs font-semibold" style={{
                      color: a.status === 'Pending' ? '#F59E0B' : a.status === 'Closed' ? '#10B981' : '#3B82F6'
                    }}>{a.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Doctor Notes (WIRED to backend) ── */}
          <View className="bg-white rounded-[20px] p-5 mb-8 shadow-sm shadow-slate-100">
            <View className="flex-row items-center mb-3">
              <FileText color="#15803D" size={18} />
              <Text className="text-slate-800 font-bold text-sm ml-2">Clinical Notes</Text>
            </View>
            <Text className="text-slate-400 text-xs mb-3">
              These notes will be visible to the patient on their profile. Use this for feedback, instructions, or observations.
            </Text>
            <TextInput
              value={doctorNotes}
              onChangeText={(t) => { setDoctorNotes(t); setNotesSaved(false); }}
              placeholder="Type your clinical observations, instructions, or feedback for the patient..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={4}
              className="bg-slate-50 border border-slate-200 rounded-[14px] p-4 text-slate-700 text-sm mb-3"
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
            <TouchableOpacity
              onPress={handleSaveNotes}
              disabled={savingNotes || !doctorNotes.trim()}
              className="rounded-[14px] py-3.5 flex-row items-center justify-center"
              style={{
                backgroundColor: notesSaved ? '#10B981' : (!doctorNotes.trim() ? '#E2E8F0' : '#15803D'),
              }}
            >
              {savingNotes ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : notesSaved ? (
                <>
                  <CheckCircle color="#fff" size={16} />
                  <Text className="text-white font-bold ml-2">Notes Saved!</Text>
                </>
              ) : (
                <>
                  <Save color={!doctorNotes.trim() ? '#94A3B8' : '#fff'} size={16} />
                  <Text className={`font-bold ml-2 ${!doctorNotes.trim() ? 'text-slate-400' : 'text-white'}`}>Save Notes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Write Prescription ──────────────────────────────────────────── */}
          <PrescriptionWriter patientId={patientId} doctorId={user?.id ?? ''} />

        </View>
      </ScrollView>

      {/* Pre-Appointment Summary Modal */}
      <Modal visible={summaryVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-800 font-bold text-lg">AI Pre-Appointment Summary</Text>
              <TouchableOpacity onPress={() => setSummaryVisible(false)}>
                <X color="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>
            {summaryLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#15803D" />
                <Text className="text-slate-400 mt-3">Generating summary...</Text>
              </View>
            ) : summary ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="bg-slate-50 rounded-[16px] p-4 mb-3">
                  <Text className="text-slate-700 font-bold text-sm mb-1">Current Risk</Text>
                  <Text className="text-slate-600 text-sm">{summary.currentRiskLevel} — {summary.riskProbability?.toFixed(1)}%</Text>
                  <Text className="text-slate-500 text-xs mt-1">Risk Trend: {summary.riskTrajectory}</Text>
                </View>
                {summary.recentVitals && (
                  <View className="bg-slate-50 rounded-[16px] p-4 mb-3">
                    <Text className="text-slate-700 font-bold text-sm mb-1">Last Recorded Vitals</Text>
                    <Text className="text-slate-600 text-sm">BP: {summary.recentVitals.bloodPressure} mmHg</Text>
                    <Text className="text-slate-600 text-sm">FHR: {summary.recentVitals.fetalHeartRate} bpm</Text>
                    <Text className="text-slate-600 text-sm">Weight: {summary.recentVitals.weightKg} kg</Text>
                  </View>
                )}
                {summary.recentSymptoms?.length > 0 && (
                  <View className="bg-slate-50 rounded-[16px] p-4 mb-3">
                    <Text className="text-slate-700 font-bold text-sm mb-1">Reported Symptoms</Text>
                    {summary.recentSymptoms.map((s: string, i: number) => (
                      <Text key={i} className="text-slate-600 text-sm">• {s}</Text>
                    ))}
                  </View>
                )}
                {summary.recommendedClinicalAction && (
                  <View className="bg-amber-50 border border-amber-100 rounded-[16px] p-4 mb-4">
                    <Text className="text-amber-700 font-bold text-sm mb-1">Recommended Action</Text>
                    <Text className="text-amber-600 text-sm">{summary.recommendedClinicalAction}</Text>
                  </View>
                )}
                <Text className="text-slate-400 text-xs text-center">
                  Generated: {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : '—'}
                </Text>
                <View className="h-4" />
              </ScrollView>
            ) : (
              <Text className="text-slate-400 text-center py-8">Could not generate summary.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Schedule Appointment Modal */}
      <Modal visible={apptVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-slate-800 font-bold text-lg">Schedule Appointment</Text>
              <TouchableOpacity onPress={() => setApptVisible(false)}>
                <X color="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-500 text-xs mb-4">
              Scheduling an appointment for {patientName} will update pending alerts and notify the patient.
            </Text>
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Date & Time</Text>
            <TextInput
              value={apptDate}
              onChangeText={setApptDate}
              placeholder="e.g. 2026-09-15 10:00 AM"
              placeholderTextColor="#CBD5E1"
              className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5 text-slate-700 text-sm mb-4"
            />
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Reason</Text>
            <TextInput
              value={apptReason}
              onChangeText={setApptReason}
              placeholder="Reason for appointment"
              placeholderTextColor="#CBD5E1"
              className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5 text-slate-700 text-sm mb-5"
            />
            <TouchableOpacity
              onPress={handleScheduleAppointment}
              disabled={schedulingAppt}
              className="bg-blue-600 rounded-[14px] py-4 items-center"
            >
              {schedulingAppt ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-bold">Confirm Appointment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
