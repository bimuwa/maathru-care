import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageCircle, Circle } from 'lucide-react-native';
import { api, PatientProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};
const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5', Moderate: '#FFFBEB', High: '#FFF7ED', 'Very High': '#FEF2F2',
};

export default function DoctorChatListTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [filtered, setFiltered] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const doctorId = user?.id ?? '';

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.getDoctorPatients(doctorId);
      const list = res?.patients ?? [];
      setPatients(list);
      setFiltered(list);
    } catch (err) {
      console.warn('Chat list fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(patients);
    } else {
      setFiltered(
        patients.filter((p) =>
          p.fullName.toLowerCase().includes(text.toLowerCase())
        )
      );
    }
  };

  const openChat = (patient: PatientProfile) => {
    router.push({
      pathname: '/doctor-chat',
      params: { patientId: patient.id, patientName: patient.fullName },
    });
  };

  const renderPatient = ({ item }: { item: PatientProfile }) => {
    const riskColor = RISK_COLORS[item.currentRiskLevel ?? 'Low'] ?? '#10B981';
    const riskBg = RISK_BG[item.currentRiskLevel ?? 'Low'] ?? '#ECFDF5';
    const initials = item.fullName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        onPress={() => openChat(item)}
        activeOpacity={0.7}
        className="flex-row items-center px-5 py-4 border-b border-slate-50 bg-white"
      >
        {/* Avatar */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: riskBg, borderWidth: 2, borderColor: riskColor + '50' }}
        >
          <Text className="font-bold text-sm" style={{ color: riskColor }}>{initials}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-800 font-bold text-sm">{item.fullName}</Text>
            <Text className="text-slate-400 text-xs">Week {item.gestationalAgeWeeks ?? '—'}</Text>
          </View>
          <View className="flex-row items-center mt-1 gap-2">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: riskBg }}>
              <Text className="text-[10px] font-bold" style={{ color: riskColor }}>
                {item.currentRiskLevel ?? 'Unknown'} Risk
              </Text>
            </View>
            <Text className="text-slate-400 text-xs">
              {item.bloodGroup ? `Blood: ${item.bloodGroup}` : ''}
            </Text>
          </View>
        </View>

        {/* Chat icon */}
        <View className="bg-emerald-50 w-9 h-9 rounded-full items-center justify-center ml-2">
          <MessageCircle color="#15803D" size={18} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-emerald-700 px-5 pt-14 pb-5 rounded-b-[28px]">
        <View className="flex-row items-center gap-2 mb-4">
          <MessageCircle size={22} color="#fff" />
          <Text className="text-white text-2xl font-bold">Patient Chats</Text>
        </View>
        {/* Search */}
        <View className="flex-row items-center bg-white/20 rounded-[14px] px-3 py-2.5">
          <Search color="#D1FAE5" size={16} />
          <TextInput
            className="flex-1 ml-2 text-white text-sm"
            placeholder="Search patients..."
            placeholderTextColor="#A7F3D0"
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderPatient}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPatients(); }} tintColor="#15803D" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-0" />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <MessageCircle color="#D1FAE5" size={48} />
            <Text className="text-slate-400 mt-3 font-medium">No patients found</Text>
            <Text className="text-slate-300 text-xs text-center mt-1 px-8">
              Patients will appear here once they are assigned to you.
            </Text>
          </View>
        }
      />
    </View>
  );
}
