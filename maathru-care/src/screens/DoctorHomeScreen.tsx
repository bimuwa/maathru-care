import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Bell,
  Activity,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, DoctorAlert } from '../services/api';
import DoctorApprovalBanner from './DoctorApprovalBanner';

type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High';

interface Stats {
  totalPatients: number;
  pendingAlerts: number;
  activeCases: number;
}


const RISK_COLORS: Record<RiskLevel, string> = {
  Low: '#10B981',
  Moderate: '#F59E0B',
  High: '#F97316',
  'Very High': '#EF4444',
};

const RISK_BG: Record<RiskLevel, string> = {
  Low: '#D1FAE5',
  Moderate: '#FEF3C7',
  High: '#FFEDD5',
  'Very High': '#FEE2E2',
};

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <View style={{ backgroundColor: RISK_BG[level] }} className="rounded-full px-3 py-1">
      <Text style={{ color: RISK_COLORS[level] }} className="text-xs font-bold">{level}</Text>
    </View>
  );
}

function StatusIcon({ status }: { status: DoctorAlert['status'] }) {
  if (status === 'Pending') return <Clock size={14} color="#F59E0B" />;
  if (status === 'Reviewed') return <AlertTriangle size={14} color="#F97316" />;
  if (status === 'Closed') return <CheckCircle size={14} color="#10B981" />;
  return <Activity size={14} color="#15803D" />;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ title, value, icon, accent }: StatCardProps) {
  return (
    <View className="flex-1 bg-white rounded-[20px] p-4 mx-1"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
      <View className="w-9 h-9 rounded-full items-center justify-center mb-3" style={{ backgroundColor: accent + '20' }}>
        {icon}
      </View>
      <Text className="text-2xl font-bold text-slate-800">{value}</Text>
      <Text className="text-xs text-slate-500 mt-1 font-medium">{title}</Text>
    </View>
  );
}

function AlertCard({ alert, onPress }: { alert: DoctorAlert; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      className="bg-white rounded-[20px] p-4 mb-3"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <StatusIcon status={alert.status} />
            <Text className="text-slate-800 font-semibold text-sm">{alert.patientName}</Text>
          </View>
          <Text className="text-slate-500 text-xs">
            Probability: <Text className="font-semibold text-slate-700">{(alert.probability * 100).toFixed(1)}%</Text>
          </Text>
        </View>
        <View className="items-end gap-2">
          <RiskBadge level={alert.riskLevel as RiskLevel} />
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DoctorHomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ totalPatients: 0, pendingAlerts: 0, activeCases: 0 });
  const [recentAlerts, setRecentAlerts] = useState<DoctorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myStatus, setMyStatus] = useState<string>('available');
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const doctorId = user?.id ?? '';
  const lastName = user?.fullName ? user.fullName.split(' ').slice(-1)[0] : 'Doctor';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const STATUS_OPTIONS = [
    { key: 'available',  label: 'Available',  desc: 'Accepting consultations', color: '#10B981' },
    { key: 'busy',       label: 'Busy',        desc: 'In a consultation',       color: '#F59E0B' },
    { key: 'in_surgery', label: 'In Surgery',  desc: 'Unavailable right now',   color: '#EF4444' },
    { key: 'away',       label: 'Away',        desc: 'Out of office',           color: '#94A3B8' },
  ];

  const currentStatusInfo = STATUS_OPTIONS.find(s => s.key === myStatus) ?? STATUS_OPTIONS[0];

  const fetchData = useCallback(async () => {
    try {
      const [patientsRes, alertsRes, statusRes] = await Promise.all([
        api.getDoctorPatients(doctorId),
        api.getDoctorAlerts(doctorId),
        api.getDoctorStatus(doctorId),
      ]);
      const patients = patientsRes?.patients ?? [];
      const alerts = alertsRes?.alerts ?? [];
      const pending = alerts.filter((a: any) => a.status === 'Pending');
      const active = patients.filter((p: any) => p.riskLevel !== 'Low');
      setStats({ totalPatients: patients.length, pendingAlerts: pending.length, activeCases: active.length });
      setRecentAlerts(
        alerts
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
      );
      if (statusRes?.status) setMyStatus(statusRes.status);
    } catch (err) {
      console.error('DoctorHome fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const handleStatusChange = async (newStatus: string) => {
    setMyStatus(newStatus);
    setStatusModalVisible(false);
    try { await api.updateDoctorStatus(doctorId, newStatus); } catch { }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}
      showsVerticalScrollIndicator={false}>
      {/* ── Header with status pill ───────────────────────────────────────── */}
      <View className="bg-[#15803D] px-5 pt-14 pb-8 rounded-b-[32px]">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-emerald-200 text-sm font-medium">{greeting},</Text>
            <Text className="text-white text-2xl font-bold mt-1">Dr. {lastName}</Text>
            <Text className="text-emerald-100 text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} className="bg-emerald-800 p-2 rounded-full" activeOpacity={0.7}>
            <LogOut size={20} color="#D1FAE5" />
          </TouchableOpacity>
        </View>
        {/* Availability status pill — tap to change */}
        <TouchableOpacity onPress={() => setStatusModalVisible(true)} activeOpacity={0.8}
          className="mt-4 flex-row items-center self-start bg-white/20 rounded-full px-4 py-2">
          <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: currentStatusInfo.color }} />
          <Text className="text-white font-bold text-sm">{currentStatusInfo.label}</Text>
          <Text className="text-emerald-200 text-xs ml-1">▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Change Modal ───────────────────────────────────────────── */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setStatusModalVisible(false)}
          className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-[24px] p-6">
            <Text className="text-slate-800 font-bold text-lg mb-1">Set Your Availability</Text>
            <Text className="text-slate-400 text-sm mb-5">Patients will see your status on their app</Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => handleStatusChange(opt.key)} activeOpacity={0.8}
                className="flex-row items-center p-4 rounded-[16px] mb-2"
                style={{ backgroundColor: myStatus === opt.key ? opt.color + '15' : '#F8FAFC', borderWidth: myStatus === opt.key ? 1.5 : 1, borderColor: myStatus === opt.key ? opt.color : '#E2E8F0' }}>
                <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: opt.color }} />
                <View className="flex-1">
                  <Text className="font-bold text-slate-800">{opt.label}</Text>
                  <Text className="text-slate-400 text-xs">{opt.desc}</Text>
                </View>
                {myStatus === opt.key && <CheckCircle color={opt.color} size={18} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Approval Requests Banner ──────────────────────────────────────── */}
      <View className="pt-5">
        <DoctorApprovalBanner onApproved={fetchData} />
      </View>

      <View className="px-5">
        <View className="flex-row mt-2 mb-6">
          <StatCard title="Total Patients" value={stats.totalPatients} icon={<Users size={18} color="#15803D" />} accent="#15803D" />
          <StatCard title="Pending Alerts" value={stats.pendingAlerts} icon={<Bell size={18} color="#F97316" />} accent="#F97316" />
          <StatCard title="Active Cases" value={stats.activeCases} icon={<Activity size={18} color="#EF4444" />} accent="#EF4444" />
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-800 font-bold text-base">Recent Alerts</Text>
          <TouchableOpacity onPress={() => router.push('/(doctor)/alerts')} activeOpacity={0.7}>
            <Text className="text-emerald-600 text-sm font-semibold">View All</Text>
          </TouchableOpacity>
        </View>

        {recentAlerts.length === 0 ? (
          <View className="bg-white rounded-[20px] p-6 items-center">
            <CheckCircle size={32} color="#10B981" />
            <Text className="text-slate-600 mt-2 font-medium">No pending alerts</Text>
          </View>
        ) : (
          recentAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onPress={() => router.push('/(doctor)/alerts')} />
          ))
        )}

        <Text className="text-slate-800 font-bold text-base mt-6 mb-3">Quick Actions</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => router.push('/(doctor)/patients')} activeOpacity={0.8}
            className="flex-1 bg-[#15803D] rounded-[20px] p-4 items-center"
            style={{ shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}>
            <Users size={24} color="#fff" />
            <Text className="text-white font-semibold text-sm mt-2">View Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(doctor)/alerts')} activeOpacity={0.8}
            className="flex-1 bg-white rounded-[20px] p-4 items-center border border-orange-200"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <Bell size={24} color="#F97316" />
            <Text className="text-orange-500 font-semibold text-sm mt-2">Manage Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
