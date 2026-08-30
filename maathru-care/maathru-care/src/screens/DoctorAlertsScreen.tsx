import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Bell, CheckCircle, AlertTriangle, Clock, ChevronRight, ChevronDown, ChevronUp, FileText, Phone } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, DoctorAlert } from '../services/api';

type FilterTab = 'All' | 'Pending' | 'Reviewed' | 'Closed';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981', Moderate: '#F59E0B', High: '#F97316', 'Very High': '#EF4444',
};

const RISK_BG: Record<string, string> = {
  Low: '#D1FAE5', Moderate: '#FEF3C7', High: '#FFEDD5', 'Very High': '#FEE2E2',
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

function StatusBadge({ status }: { status: DoctorAlert['status'] }) {
  let color = '#3B82F6'; let bg = '#EFF6FF';
  if (status === 'Pending') { color = '#F59E0B'; bg = '#FFFBEB'; }
  if (status === 'Closed') { color = '#10B981'; bg = '#ECFDF5'; }
  if (status === 'Contacted') { color = '#8B5CF6'; bg = '#F5F3FF'; }
  return (
    <View className="rounded-full px-2 py-0.5 border" style={{ borderColor: color + '40', backgroundColor: bg }}>
      <Text style={{ color }} className="text-[10px] font-bold uppercase tracking-wide">{status}</Text>
    </View>
  );
}

const WORKFLOW_STEPS: { label: string; targetStatus: DoctorAlert['status']; icon: React.ReactNode; color: string }[] = [
  { label: 'Mark Reviewed', targetStatus: 'Reviewed', icon: <CheckCircle size={14} color="#3B82F6" />, color: '#3B82F6' },
  { label: 'Mark Contacted', targetStatus: 'Contacted', icon: <Phone size={14} color="#8B5CF6" />, color: '#8B5CF6' },
  { label: 'Close Alert', targetStatus: 'Closed', icon: <CheckCircle size={14} color="#10B981" />, color: '#10B981' },
];

function AlertCard({
  alert,
  expanded,
  onToggle,
  onUpdateStatus,
}: {
  alert: DoctorAlert;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (alertId: string, status: DoctorAlert['status'], notes: string) => void;
}) {
  const [notes, setNotes] = useState(alert.doctorNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    setSaving(true);
    await onUpdateStatus(alert.id, alert.status, notes);
    setSaving(false);
  };

  return (
    <View className="bg-white rounded-[20px] mb-3 overflow-hidden border border-slate-100"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-2">
              <AlertTriangle size={16} color={RISK_COLORS[alert.riskLevel] || '#10B981'} />
              <Text className="text-slate-800 font-bold text-sm flex-1">{alert.patientName}</Text>
            </View>
            <View className="flex-row gap-2 flex-wrap">
              <RiskBadge level={alert.riskLevel} />
              <StatusBadge status={alert.status} />
            </View>
          </View>
          <View className="items-end gap-2 ml-2">
            <Text className="text-lg font-bold" style={{ color: RISK_COLORS[alert.riskLevel] || '#10B981' }}>
              {(alert.probability * 100).toFixed(1)}%
            </Text>
            {expanded ? <ChevronUp size={18} color="#94A3B8" /> : <ChevronDown size={18} color="#94A3B8" />}
          </View>
        </View>
        <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
          <View className="h-full rounded-full"
            style={{ width: `${alert.probability * 100}%`, backgroundColor: RISK_COLORS[alert.riskLevel] || '#10B981' }} />
        </View>
        <Text className="text-slate-400 text-xs mt-2">
          {new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View className="border-t border-slate-100 p-4 bg-slate-50">
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Update Status</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {WORKFLOW_STEPS.map((step) => (
              <TouchableOpacity key={step.targetStatus}
                onPress={() => onUpdateStatus(alert.id, step.targetStatus, notes)}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 bg-white"
                style={{ borderWidth: 1, borderColor: step.color + '40', opacity: alert.status === step.targetStatus ? 0.5 : 1 }}>
                {step.icon}
                <Text className="text-xs font-semibold" style={{ color: step.color }}>{step.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Doctor Notes</Text>
          <TextInput className="bg-white border border-slate-200 rounded-2xl p-3 text-slate-700 text-sm"
            placeholder="Add clinical notes for this alert..."
            placeholderTextColor="#94A3B8" multiline numberOfLines={3}
            value={notes} onChangeText={setNotes}
            style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <TouchableOpacity onPress={handleSaveNotes} disabled={saving} activeOpacity={0.8}
            className="flex-row items-center justify-center bg-emerald-700 rounded-[14px] py-3 mt-3">
            <FileText size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-2">{saving ? 'Saving...' : 'Save Notes'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function FilterTabItem({ label, active, count, onPress }: { label: string; active: boolean; count: number; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-1 items-center py-3"
      style={{ borderBottomWidth: active ? 2 : 0, borderBottomColor: '#15803D' }}>
      <Text className="text-xs font-semibold" style={{ color: active ? '#15803D' : '#94A3B8' }}>{label}</Text>
      {count > 0 && (
        <View className="rounded-full px-1.5 mt-0.5"
          style={{ backgroundColor: active ? '#15803D' : '#E2E8F0', minWidth: 18, alignItems: 'center' }}>
          <Text className="text-[10px] font-bold" style={{ color: active ? '#fff' : '#64748B' }}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const FILTER_MAP: Record<FilterTab, DoctorAlert['status'][] | null> = {
  All: null,
  Pending: ['Pending'],
  Reviewed: ['Reviewed', 'Contacted', 'Follow-up scheduled'],
  Closed: ['Closed'],
};

export default function DoctorAlertsScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<DoctorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const doctorId = user?.id ?? '';

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.getDoctorAlerts(doctorId);
      const data: DoctorAlert[] = res?.alerts ?? [];
      setAlerts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Alerts fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [doctorId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleUpdateStatus = useCallback(async (alertId: string, status: DoctorAlert['status'], notes: string) => {
    try {
      await api.updateAlertStatus(alertId, status, notes);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status, doctorNotes: notes } : a));
    } catch (err) {
      Alert.alert('Error', 'Failed to update alert. Please try again.');
    }
  }, []);

  const filterCounts: Record<FilterTab, number> = {
    All: alerts.length,
    Pending: alerts.filter((a) => a.status === 'Pending').length,
    Reviewed: alerts.filter((a) => ['Reviewed', 'Contacted', 'Follow-up scheduled'].includes(a.status)).length,
    Closed: alerts.filter((a) => a.status === 'Closed').length,
  };

  const filteredAlerts = alerts.filter((a) => {
    const allowed = FILTER_MAP[activeFilter];
    return allowed === null || allowed.includes(a.status);
  });

  const onRefresh = () => { setRefreshing(true); fetchAlerts(); };

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
        <View className="flex-row items-center gap-2">
          <Bell size={22} color="#fff" />
          <Text className="text-white text-2xl font-bold">Clinical Alerts</Text>
        </View>
        <Text className="text-emerald-100 text-sm mt-1">{filterCounts.Pending} pending alerts require attention</Text>
      </View>

      <View className="bg-white border-b border-slate-100 flex-row mx-5 mt-4 rounded-2xl overflow-hidden shadow-sm shadow-slate-200">
        {(['All', 'Pending', 'Reviewed', 'Closed'] as FilterTab[]).map((tab) => (
          <FilterTabItem key={tab} label={tab} active={activeFilter === tab}
            count={filterCounts[tab]} onPress={() => setActiveFilter(tab)} />
        ))}
      </View>

      <FlatList data={filteredAlerts} keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard alert={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onUpdateStatus={handleUpdateStatus} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <CheckCircle size={48} color="#D1FAE5" />
            <Text className="text-slate-400 mt-3 font-medium">No alerts in this category</Text>
          </View>
        } />
    </View>
  );
}
