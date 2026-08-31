import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Stethoscope, Building2, Phone, Hash,
  FileText, Calendar, MessageCircle, Star, Clock, Shield
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
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const doctorId = (params.doctorId as string) ?? user?.assignedDoctorId ?? '';
  const doctorNameParam = (params.doctorName as string) ?? user?.assignedDoctorName ?? 'Doctor';

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskPredictionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // ✅ Fetch real doctor details from the list of registered doctors
        const doctorsRes = await api.getRegisteredDoctors();
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

        // Fetch patient's risk history for doctor feedback
        if (user?.id) {
          const res = await api.getRiskHistory(user.id);
          if (res.success) setRiskHistory(res.history ?? []);
        }
      } catch (e) {
        console.warn('Failed to load doctor profile:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [doctorId, user?.id]);

  const displayName = doctor?.fullName || doctorNameParam;
  const recordsWithFeedback = riskHistory.filter(r => r.doctorNotes && r.doctorNotes.trim().length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} showsVerticalScrollIndicator={false}>
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

        {/* Doctor Feedback */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>Doctor Feedback</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#15803D" />
          ) : recordsWithFeedback.length > 0 ? (
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
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 }}>
                  <FileText color="#94A3B8" size={14} />
                  <Text style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{record.doctorNotes}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <FileText color="#D1FAE5" size={36} />
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>No doctor feedback yet</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                Feedback will appear after your doctor reviews your risk assessments.
              </Text>
            </View>
          )}
        </View>

        {/* Appointment Placeholder */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 14, marginBottom: 12 }}>Appointment History</Text>
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Calendar color="#D1FAE5" size={36} />
            <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>No appointments scheduled</Text>
            <Text style={{ color: '#CBD5E1', fontSize: 11, textAlign: 'center', marginTop: 4 }}>Chat with your doctor to schedule your next visit.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
