import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, FileText, Download, Share2, Printer, CheckCircle, Activity, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const RISK_COLORS: Record<string, string> = { Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444' };

function generateHTML(summary: any): string {
  const p = summary.patient || {};
  const risk = summary.latestRiskAssessment;
  const rColor = risk ? (RISK_COLORS[risk.riskLevel] || '#64748B') : '#64748B';

  const vitalsRows = (summary.vitalsHistory || []).map((v: any) =>
    `<tr><td>${new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>${v.systolicBP || '-'}/${v.diastolicBP || '-'}</td><td>${v.weightKg || '-'}</td><td>${v.pulseRate || '-'}</td></tr>`
  ).join('');

  const prescRows = (summary.activePrescriptions || []).map((pr: any) =>
    (pr.medications || []).map((m: any) =>
      `<tr><td>${m.name || '-'}</td><td>${m.dosage || '-'}</td><td>${m.frequency || '-'}</td><td>${m.duration || '-'}</td></tr>`
    ).join('')
  ).join('');

  const kickRows = (summary.kickSessions || []).map((k: any) =>
    `<tr><td>${new Date(k.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td>${k.totalKicks}</td><td>${k.durationMinutes} min</td><td style="color:${k.completed ? '#10B981' : '#F97316'}">${k.completed ? 'Healthy' : 'Low Activity'}</td></tr>`
  ).join('');

  const apptRows = (summary.upcomingAppointments || []).map((a: any) =>
    `<tr><td>${new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td><td>${a.type?.replace(/_/g, ' ') || '-'}</td><td>${a.doctorName || '-'}</td><td>${a.location || '-'}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1E293B; line-height: 1.5; padding: 32px; }
    .header { background: linear-gradient(135deg, #15803D, #059669); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.9; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; color: #15803D; border-bottom: 2px solid #D1FAE5; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #F1F5F9; color: #475569; padding: 8px 10px; text-align: left; font-weight: 600; border: 1px solid #E2E8F0; }
    td { padding: 7px 10px; border: 1px solid #E2E8F0; }
    .info-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .info-item { flex: 1; min-width: 45%; background: #F8FAFC; padding: 10px 14px; border-radius: 8px; border: 1px solid #E2E8F0; }
    .info-label { font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 600; }
    .info-value { font-size: 14px; font-weight: bold; color: #1E293B; margin-top: 2px; }
    .risk-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; color: white; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 9px; color: #94A3B8; text-align: center; }
    .watermark { text-align: right; font-size: 10px; color: #CBD5E1; margin-top: 4px; }
  </style></head><body>
    <div class="header">
      <h1>🤰 Maathru Care — Patient Health Report</h1>
      <p>Comprehensive Maternal Health Summary • Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
    </div>

    <div class="section">
      <div class="section-title">👤 Patient Information</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${p.fullName || '-'}</div></div>
        <div class="info-item"><div class="info-label">Age</div><div class="info-value">${p.age || '-'} years</div></div>
        <div class="info-item"><div class="info-label">Blood Group</div><div class="info-value">${p.bloodGroup || '-'}</div></div>
        <div class="info-item"><div class="info-label">Gestational Week</div><div class="info-value">Week ${p.gestationalWeek || '-'}</div></div>
        <div class="info-item"><div class="info-label">Assigned Doctor</div><div class="info-value">${p.assignedDoctorName || 'Not assigned'}</div></div>
      </div>
    </div>

    ${risk ? `<div class="section">
      <div class="section-title">🧠 Latest AI Risk Assessment</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span class="risk-badge" style="background:${rColor}">${risk.riskLevel}</span>
        <span style="font-size:18px;font-weight:bold">${risk.probability}% probability</span>
      </div>
      <p style="font-size:11px;color:#64748B">Assessed on ${new Date(risk.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      ${risk.inputData ? `<table style="margin-top:10px">
        <tr><th>Parameter</th><th>Value</th><th>Parameter</th><th>Value</th></tr>
        <tr><td>Systolic BP</td><td>${risk.inputData.systolicBP} mmHg</td><td>Diastolic BP</td><td>${risk.inputData.diastolicBP} mmHg</td></tr>
        <tr><td>Weight</td><td>${risk.inputData.weightKg} kg</td><td>Height</td><td>${risk.inputData.heightFt} ft</td></tr>
        <tr><td>Fetal Heart Rate</td><td>${risk.inputData.fetalHeartRate} bpm</td><td>Gravida</td><td>${risk.inputData.gravida}</td></tr>
      </table>` : ''}
    </div>` : ''}

    ${vitalsRows ? `<div class="section">
      <div class="section-title">💓 Vitals History</div>
      <table><tr><th>Date</th><th>BP (mmHg)</th><th>Weight (kg)</th><th>Pulse (bpm)</th></tr>${vitalsRows}</table>
    </div>` : ''}

    ${prescRows ? `<div class="section">
      <div class="section-title">💊 Active Prescriptions</div>
      <table><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>${prescRows}</table>
    </div>` : ''}

    ${kickRows ? `<div class="section">
      <div class="section-title">👶 Fetal Kick Counter Sessions</div>
      <table><tr><th>Date</th><th>Kicks</th><th>Duration</th><th>Status</th></tr>${kickRows}</table>
    </div>` : ''}

    ${apptRows ? `<div class="section">
      <div class="section-title">📅 Upcoming Appointments</div>
      <table><tr><th>Date</th><th>Type</th><th>Doctor</th><th>Location</th></tr>${apptRows}</table>
    </div>` : ''}

    <div class="footer">
      <p>This report is generated by the Maathru Care AI-powered Maternal Health Platform for clinical decision-support purposes only.</p>
      <p>It does not replace professional medical diagnosis. Please consult your assigned obstetrician for diagnostic interpretation.</p>
      <p style="margin-top:6px">Report ID: ${Date.now().toString(36).toUpperCase()} • Generated: ${new Date().toISOString()}</p>
    </div>
    <div class="watermark">Maathru Care v1.0 • Powered by XGBoost AI</div>
  </body></html>`;
}

export default function HealthReportScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getHealthSummary(user.id);
      if (res.success) setSummary(res.summary);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleGenerate = async () => {
    if (!summary) return;
    setGenerating(true);
    try {
      const html = generateHTML(summary);
      const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
      setPdfUri(uri);
      Alert.alert('✅ Report Generated!', 'Your clinical health report PDF is ready.');
    } catch (e: any) {
      Alert.alert('Error', 'Could not generate PDF. ' + (e?.message || ''));
    }
    setGenerating(false);
  };

  const handleShare = async () => {
    if (!pdfUri) return;
    try { await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', dialogTitle: 'Share Health Report' }); }
    catch { Alert.alert('Error', 'Could not share the report.'); }
  };

  const handlePrint = async () => {
    if (!pdfUri) return;
    try { await Print.printAsync({ uri: pdfUri }); }
    catch { Alert.alert('Error', 'Could not print the report.'); }
  };

  const p = summary?.patient;
  const risk = summary?.latestRiskAssessment;
  const vitals = summary?.vitalsHistory?.[0];

  const sections = [
    { name: 'Patient Demographics', ready: !!p },
    { name: 'Latest AI Risk Assessment', ready: !!risk },
    { name: 'Vitals History (BP, Weight, Pulse)', ready: (summary?.vitalsHistory?.length || 0) > 0 },
    { name: 'Active Prescriptions', ready: (summary?.activePrescriptions?.length || 0) > 0 },
    { name: 'Fetal Kick Counter Summary', ready: (summary?.kickSessions?.length || 0) > 0 },
    { name: 'Upcoming Appointments', ready: (summary?.upcomingAppointments?.length || 0) > 0 },
  ];

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-white pt-14 pb-5 px-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <ArrowLeft color="#334155" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-800 text-xl font-bold">Health Report</Text>
            <Text className="text-slate-500 text-xs mt-0.5">Generate & Share PDF</Text>
          </View>
          <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
            <FileText color="#3B82F6" size={20} />
          </View>
        </View>
      </View>

      <View className="px-5 pt-5">
        {loading ? <ActivityIndicator color="#15803D" size="large" className="my-10" /> : (
          <>
            {/* Quick Stats */}
            <View className="flex-row mb-4 gap-3">
              <View className="flex-1 bg-white rounded-[16px] p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <Text className="text-slate-400 text-xs font-semibold">RISK LEVEL</Text>
                {risk ? (
                  <View className="rounded-full px-3 py-1 mt-1 self-start" style={{ backgroundColor: (RISK_COLORS[risk.riskLevel] || '#64748B') + '20' }}>
                    <Text className="text-xs font-bold" style={{ color: RISK_COLORS[risk.riskLevel] }}>{risk.riskLevel}</Text>
                  </View>
                ) : <Text className="text-slate-500 text-sm mt-1">N/A</Text>}
              </View>
              <View className="flex-1 bg-white rounded-[16px] p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <Text className="text-slate-400 text-xs font-semibold">LAST BP</Text>
                <Text className="text-slate-800 font-bold text-lg mt-1">{vitals ? `${vitals.systolicBP}/${vitals.diastolicBP}` : 'N/A'}</Text>
              </View>
              <View className="flex-1 bg-white rounded-[16px] p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <Text className="text-slate-400 text-xs font-semibold">WEEK</Text>
                <Text className="text-slate-800 font-bold text-lg mt-1">{p?.gestationalWeek || '?'}</Text>
              </View>
            </View>

            {/* Report Sections Preview */}
            <View className="bg-white rounded-[20px] p-5 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <Text className="text-slate-800 font-bold text-base mb-3">Report Contents</Text>
              {sections.map((s, i) => (
                <View key={i} className="flex-row items-center py-2 border-b border-slate-50">
                  {s.ready
                    ? <CheckCircle color="#10B981" size={16} />
                    : <View className="w-4 h-4 rounded-full border border-slate-300" />}
                  <Text className={`ml-3 text-sm ${s.ready ? 'text-slate-700' : 'text-slate-400'}`}>{s.name}</Text>
                  {s.ready && <Text className="text-emerald-500 text-xs ml-auto font-semibold">Data Available</Text>}
                </View>
              ))}
              <Text className="text-slate-400 text-xs mt-3">Data as of: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>

            {/* Generate Button */}
            {!pdfUri ? (
              <TouchableOpacity onPress={handleGenerate} disabled={generating} className="bg-emerald-600 rounded-[20px] py-5 items-center mb-4" style={{ shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
                {generating
                  ? <View className="flex-row items-center gap-2"><ActivityIndicator color="#fff" /><Text className="text-white font-bold text-base">Generating Report...</Text></View>
                  : <View className="flex-row items-center gap-2"><FileText color="#fff" size={20} /><Text className="text-white font-bold text-base">Generate PDF Report 📄</Text></View>}
              </TouchableOpacity>
            ) : (
              <View className="bg-emerald-50 rounded-[20px] p-5 mb-4 border border-emerald-200">
                <View className="flex-row items-center gap-2 mb-3">
                  <CheckCircle color="#10B981" size={20} />
                  <Text className="text-emerald-700 font-bold text-base">Report Ready!</Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={handleShare} className="flex-1 bg-white rounded-[14px] py-3.5 items-center flex-row justify-center gap-2 border border-emerald-200">
                    <Share2 color="#15803D" size={16} />
                    <Text className="text-emerald-700 font-semibold">Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePrint} className="flex-1 bg-white rounded-[14px] py-3.5 items-center flex-row justify-center gap-2 border border-emerald-200">
                    <Printer color="#15803D" size={16} />
                    <Text className="text-emerald-700 font-semibold">Print</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => { setPdfUri(null); handleGenerate(); }} className="mt-3 py-2 items-center">
                  <Text className="text-slate-500 text-sm">Regenerate Report</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="mb-8" />
          </>
        )}
      </View>
    </ScrollView>
  );
}
