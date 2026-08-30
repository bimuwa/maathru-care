import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Stethoscope,
  Building2,
  Phone,
  Hash,
  FileText,
  Calendar,
  MessageCircle,
  Star,
  Clock,
} from 'lucide-react-native';
import { api, RiskPredictionResult } from '../services/api';
import { useAuth } from '../context/AuthContext';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-slate-50">
      <View className="w-8 items-center">{icon}</View>
      <View className="flex-1 ml-3">
        <Text className="text-slate-400 text-xs">{label}</Text>
        <Text className="text-slate-800 font-semibold text-sm mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

export default function MotherDoctorProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const doctorId = (params.doctorId as string) ?? user?.assignedDoctorId ?? '';
  const doctorName = (params.doctorName as string) ?? user?.assignedDoctorName ?? 'Doctor';

  const [riskHistory, setRiskHistory] = useState<RiskPredictionResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const patientId = user?.id ?? '';
        const res = await api.getRiskHistory(patientId);
        if (res.success) setRiskHistory(res.history ?? []);
      } catch (e) {
        console.warn('Failed to load risk history:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // Mock doctor details — in production, fetch from backend
  const doctorDetails = {
    name: doctorName,
    specialty: 'Obstetrics & Gynaecology',
    hospital: 'National Maternity Hospital',
    phone: '+94777654321',
    licenseNo: 'SLMC-12345',
    experience: '12 years',
    rating: '4.9',
    consultationHours: 'Mon–Fri, 9:00 AM – 5:00 PM',
  };

  // Group risk records by notes (where doctorNotes exists)
  const recordsWithFeedback = riskHistory.filter(
    (r) => r.doctorNotes && r.doctorNotes.trim().length > 0
  );

  // Appointments from risk records that have scheduledFollowupAt
  const appointments = riskHistory
    .filter((r) => (r as any).scheduledFollowupAt)
    .map((r) => ({
      date: new Date((r as any).scheduledFollowupAt).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      }),
      time: new Date((r as any).scheduledFollowupAt).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit',
      }),
      reason: r.riskLevel + ' Risk Follow-up',
    }));

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-10 px-5">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-5">
          <ArrowLeft color="#FFFFFF" size={20} />
          <Text className="text-white ml-2 font-semibold">Back</Text>
        </TouchableOpacity>
        <View className="items-center">
          <View className="bg-white/20 w-20 h-20 rounded-full items-center justify-center mb-3">
            <Stethoscope color="#FFFFFF" size={36} />
          </View>
          <Text className="text-white text-xl font-bold">{doctorDetails.name}</Text>
          <Text className="text-emerald-200 text-sm mt-1">{doctorDetails.specialty}</Text>
          <View className="flex-row items-center mt-2 bg-white/20 px-4 py-1.5 rounded-full">
            <Star color="#FBBF24" size={14} />
            <Text className="text-white text-sm font-bold ml-1">{doctorDetails.rating} Rating</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pt-5">
        {/* Quick Actions */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/mother-chat', params: { doctorId, doctorName: doctorDetails.name } })}
          className="bg-emerald-700 rounded-[16px] py-4 flex-row items-center justify-center mb-5"
        >
          <MessageCircle color="#FFFFFF" size={18} />
          <Text className="text-white font-bold ml-2">Chat with Doctor</Text>
        </TouchableOpacity>

        {/* Doctor Details */}
        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
          <Text className="text-slate-700 font-bold text-sm mb-3">Professional Details</Text>
          <InfoRow icon={<Building2 color="#94A3B8" size={16} />} label="Hospital" value={doctorDetails.hospital} />
          <InfoRow icon={<Hash color="#94A3B8" size={16} />} label="Medical License" value={doctorDetails.licenseNo} />
          <InfoRow icon={<Phone color="#94A3B8" size={16} />} label="Phone" value={doctorDetails.phone} />
          <InfoRow icon={<Stethoscope color="#94A3B8" size={16} />} label="Experience" value={doctorDetails.experience} />
          <InfoRow icon={<Clock color="#94A3B8" size={16} />} label="Consultation Hours" value={doctorDetails.consultationHours} />
        </View>

        {/* Doctor Feedback on Risk Records */}
        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
          <Text className="text-slate-700 font-bold text-sm mb-3">Doctor Feedback</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#15803D" />
          ) : recordsWithFeedback.length > 0 ? (
            recordsWithFeedback.map((record, i) => (
              <View key={i} className="border-b border-slate-50 pb-3 mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-slate-400 text-xs">
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `Assessment #${i + 1}`}
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: RISK_BG[record.riskLevel] ?? '#ECFDF5' }}>
                    <Text className="text-xs font-bold" style={{ color: RISK_COLORS[record.riskLevel] ?? '#10B981' }}>
                      {record.riskLevel}
                    </Text>
                  </View>
                </View>
                <View className="bg-slate-50 rounded-[12px] p-3">
                  <FileText color="#94A3B8" size={14} />
                  <Text className="text-slate-600 text-sm mt-1">{record.doctorNotes}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-5">
              <FileText color="#D1FAE5" size={36} />
              <Text className="text-slate-400 text-sm mt-2">No doctor feedback yet</Text>
              <Text className="text-slate-300 text-xs text-center mt-1">Feedback will appear after your doctor reviews your risk assessments.</Text>
            </View>
          )}
        </View>

        {/* Appointments */}
        <View className="bg-white rounded-[20px] p-5 mb-10 shadow-sm shadow-slate-100">
          <Text className="text-slate-700 font-bold text-sm mb-3">Appointment History</Text>
          {appointments.length > 0 ? (
            appointments.map((appt, i) => (
              <View key={i} className="flex-row items-center py-3 border-b border-slate-50">
                <View className="bg-emerald-50 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Calendar color="#15803D" size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-700 font-semibold text-sm">{appt.date}</Text>
                  <Text className="text-slate-400 text-xs">{appt.time} • {appt.reason}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-5">
              <Calendar color="#D1FAE5" size={36} />
              <Text className="text-slate-400 text-sm mt-2">No appointments scheduled</Text>
              <Text className="text-slate-300 text-xs text-center mt-1">Chat with your doctor to schedule your next visit.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
