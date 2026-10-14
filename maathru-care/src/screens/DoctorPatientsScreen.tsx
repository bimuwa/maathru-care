import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Droplets, Calendar, UserX } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, PatientProfile } from '../services/api';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

function RiskBadge({ level }: { level: string }) {
  const safeLevel = level || 'Low';
  const color = RISK_COLORS[safeLevel] || '#10B981';
  const bg = RISK_BG[safeLevel] || '#ECFDF5';
  return (
    <View style={{ backgroundColor: bg }} className="rounded-full px-3 py-1 flex-row items-center">
      <View style={{ backgroundColor: color }} className="w-1.5 h-1.5 rounded-full mr-1.5" />
      <Text style={{ color }} className="text-xs font-bold">{safeLevel}</Text>
    </View>
  );
}

function PatientCard({ patient, onPress }: { patient: PatientProfile; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      className="bg-white rounded-[20px] p-4 mb-3 border border-slate-100"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-slate-800 font-bold text-base mb-1">{patient.fullName}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-slate-500 text-xs font-medium">Age {patient.age || '—'}</Text>
            <Text className="text-slate-300 text-xs">•</Text>
            <Text className="text-slate-500 text-xs font-medium">{patient.bloodGroup || '—'}</Text>
          </View>
        </View>
        <RiskBadge level={patient.currentRiskLevel || 'Low'} />
      </View>
      <View className="flex-row items-center justify-between border-t border-slate-50 pt-3">
        <View className="bg-emerald-50 px-3 py-1.5 rounded-[10px]">
          <Text className="text-emerald-700 text-xs font-semibold">Week {patient.gestationalAgeWeeks || '—'}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-emerald-600 text-xs font-semibold mr-1">View File</Text>
          <ChevronRight size={14} color="#15803D" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DoctorPatientsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getDoctorPatients(user.id);
      setPatients(res?.patients ?? []);
    } catch (err) {
      console.error('Patients fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const onRefresh = () => { setRefreshing(true); fetchPatients(); };

  const filtered = patients.filter((p) =>
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-emerald-700 px-5 pt-14 pb-6 rounded-b-[28px]">
        <Text className="text-white text-2xl font-bold mb-4">Patient Roster</Text>
        <View className="bg-white/20 rounded-full flex-row items-center px-4 py-2.5">
          <Search size={18} color="#D1FAE5" />
          <TextInput
            className="flex-1 ml-3 text-white text-sm"
            placeholder="Search patients by name..."
            placeholderTextColor="#A7F3D0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PatientCard patient={item}
            onPress={() => router.push({ pathname: '/doctor-patient-detail', params: { patientId: item.id } })} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <UserX size={48} color="#D1FAE5" />
            <Text className="text-slate-400 mt-3 font-medium">No patients found</Text>
          </View>
        }
      />
    </View>
  );
}
