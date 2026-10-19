import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Stethoscope, Building2, Phone, Hash,
  FileText, Calendar, MessageCircle, Star, Clock, Shield, CheckCircle
} from 'lucide-react-native';
import { api, RiskPredictionResult } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}>
      <View style={{ width: 32, alignItems: 'center' }}>{icon}</View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 14, marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

interface DoctorProfile {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
  phone: string;
  medicalLicense: string;
}

export default function MotherDoctorProfileScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const doctorId = (params.doctorId as string) ?? user?.assignedDoctorId ?? '';
  const doctorNameParam = (params.doctorName as string) ?? user?.assignedDoctorName ?? 'Doctor';

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskPredictionResult[]>([]);
  const [patientAlerts, setPatientAlerts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [doctorsRes, riskRes, alertsRes, apptsRes] = await Promise.all([
        api.getRegisteredDoctors().catch(() => ({ success: false, doctors: [] })),
        user?.id ? api.getRiskHistory(user.id).catch(() => ({ success: false, history: [] })) : Promise.resolve({ success: false, history: [] }),
        user?.id ? api.getPatientAlerts(user.id).catch(() => ({ success: false, alerts: [] })) : Promise.resolve({ success: false, alerts: [] }),
        user?.id ? api.getPatientAppointments(user.id).catch(() => ({ success: false, appointments: [] })) : Promise.resolve({ success: false, appointments: [] }),
      ]);

      if (doctorsRes.success && doctorsRes.doctors) {
        const found = doctorsRes.doctors.find((d: any) => d.id === doctorId);
        if (found) {
          setDoctor({
            id: found.id,
            fullName: found.fullName,
            specialty: found.specialty || 'General Practitioner',
            hospital: found.hospital || 'N/A',
            phone: found.phone || 'N/A',
            medicalLicense: found.medicalLicense || 'N/A',
          });
        }
      }

      if (riskRes.success) setRiskHistory((riskRes as any).history ?? []);
      if (alertsRes.success) setPatientAlerts((alertsRes as any).alerts ?? []);
      if (apptsRes.success && apptsRes.appointments) setAppointments(apptsRes.appointments);
    } catch (e) {
      console.warn('Failed to load doctor profile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const displayName = doctor?.fullName || doctorNameParam;

  // Clinical notes: from risk_assessments via riskHistory
  const recordsWithFeedback = riskHistory.filter(r => r.doctorNotes && r.doctorNotes.trim().length > 0);

  // Also get standalone clinical_note alerts (added when doctor saves notes)
  const clinicalNoteAlerts = patientAlerts.filter(a => a.alertType === 'clinical_note' || (a.alert_type === 'clinical_note'));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#15803D" />}
    >
      {/* Header */}
      <View style={{ backgroundColor: '#15803D', paddingTop: 56, paddingBottom: 40, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <ArrowLeft color="#FFFFFF" size={20} />
          <Text style={{ color: '#FFFFFF', marginLeft: 8, fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Stethoscope color="#FFFFFF" size={36} />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>{displayName}</Text>
          <Text style={{ color: '#A7F3D0', fontSize: 13, marginTop: 4 }}>
            {loading ? 'Loading...' : (doctor?.specialty || 'Specialist')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
            <Star color="#FBBF24" size={14} />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}>Verified Doctor</Text>
            <Shield color="#A7F3D0" size={12} style={{ marginLeft: 6 }} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {/* Chat Button */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/mother-chat', params: { doctorId, doctorName: displayName } })}
          style={{ backgroundColor: '#15803D', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
        >
          <MessageCircle color="#FFFFFF" size={18} />
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 }}>Chat with Doctor</Text>
        </TouchableOpacity>

        {/* Professional Details */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>Professional Details</Text>
          {loading ? (
            <ActivityIndicator color="#15803D" />
          ) : (
            <>
              <InfoRow icon={<Building2 color="#94A3B8" size={16} />} label="Hospital" value={doctor?.hospital || 'N/A'} />
              <InfoRow icon={<Hash color="#94A3B8" size={16} />} label="Medical License" value={doctor?.medicalLicense || 'N/A'} />
              <InfoRow icon={<Phone color="#94A3B8" size={16} />} label="Phone" value={doctor?.phone || 'N/A'} />
              <InfoRow icon={<Stethoscope color="#94A3B8" size={16} />} label="Specialty" value={doctor?.specialty || 'N/A'} />
            </>
          )}
        </View>

        {/* Doctor Feedback / Clinical Notes */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FileText color="#15803D" size={16} />
            <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>Doctor Feedback</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#15803D" />
          ) : clinicalNoteAlerts.length > 0 ? (
            // Show standalone clinical note alerts (most recent from doctor)
            clinicalNoteAlerts.map((alert: any, i: number) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <CheckCircle color="#10B981" size={10} />
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#10B981', marginLeft: 3 }}>Saved Note</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#15803D' }}>
                  <Text style={{ color: '#475569', fontSize: 13, lineHeight: 20 }}>{alert.alertMessage}</Text>
                </View>
              </View>
            ))
          ) : recordsWithFeedback.length > 0 ? (
            // Fallback: notes attached to risk assessments
            recordsWithFeedback.map((record, i) => (
              <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `Assessment #${i + 1}`}
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: RISK_BG[record.riskLevel] ?? '#ECFDF5' }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: RISK_COLORS[record.riskLevel] ?? '#10B981' }}>{record.riskLevel}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#15803D' }}>
                  <Text style={{ color: '#475569', fontSize: 13, lineHeight: 20 }}>{record.doctorNotes}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <FileText color="#D1FAE5" size={36} />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>No doctor feedback yet</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                Feedback will appear after your doctor reviews your assessments.
              </Text>
            </View>
          )}
        </View>

        {/* Appointment History */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar color="#2563EB" size={16} />
              <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>Appointment History</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/appointments')}>
              <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '600' }}>View All →</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : appointments.length > 0 ? (
            appointments.map((appt: any, i: number) => {
              const isUpcoming = appt.status === 'scheduled';
              const statusBg = isUpcoming ? '#DBEAFE' : appt.status === 'completed' ? '#D1FAE5' : '#F1F5F9';
              const statusColor = isUpcoming ? '#1D4ED8' : appt.status === 'completed' ? '#065F46' : '#64748B';
              const typeLabel = appt.appointmentType
                ? (appt.appointmentType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))
                : 'Routine Checkup';
              const dateStr = new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
              });

              return (
                <View key={appt.id || i} style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: '#2563EB',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar color="#2563EB" size={13} />
                      <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 13, marginLeft: 5 }}>
                        {typeLabel}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: statusBg,
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: statusColor, textTransform: 'capitalize' }}>
                        {appt.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: '#1E40AF', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                    <Clock color="#3B82F6" size={11} /> {dateStr}
                  </Text>
                  {appt.doctorName ? (
                    <Text style={{ color: '#3B82F6', fontSize: 12, marginBottom: 2 }}>Doctor: {appt.doctorName}</Text>
                  ) : null}
                  {appt.location ? (
                    <Text style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>📍 Location: {appt.location}</Text>
                  ) : null}
                  {appt.notes ? (
                    <Text style={{ color: '#475569', fontSize: 12, marginBottom: 2 }}>📝 Notes: {appt.notes}</Text>
                  ) : null}
                  <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 4 }}>
                    Scheduled: {appt.createdAt ? new Date(appt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Calendar color="#BFDBFE" size={36} />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>No appointments scheduled</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                Appointments scheduled by your doctor will appear here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
