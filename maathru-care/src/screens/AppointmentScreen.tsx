import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  routine_checkup: { bg: '#D1FAE5', color: '#059669', label: 'Routine' },
  follow_up:       { bg: '#DBEAFE', color: '#2563EB', label: 'Follow-up' },
  urgent:          { bg: '#FEE2E2', color: '#DC2626', label: 'Urgent' },
  ultrasound:      { bg: '#EDE9FE', color: '#7C3AED', label: 'Ultrasound' },
  lab_test:        { bg: '#FEF3C7', color: '#D97706', label: 'Lab Test' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  scheduled:  { bg: '#DBEAFE', color: '#2563EB' },
  completed:  { bg: '#D1FAE5', color: '#059669' },
  cancelled:  { bg: '#F1F5F9', color: '#94A3B8' },
};

function formatApptDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
function formatApptTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `In ${days}d ${hrs}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `In ${hrs}h ${mins}m`;
}

export default function AppointmentScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const fetchAppointments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getPatientAppointments(user.id);
      if (res.success) setAppointments(res.appointments || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  const onRefresh = async () => { setRefreshing(true); await fetchAppointments(); setRefreshing(false); };

  const now = Date.now();
  const upcoming = appointments.filter(a => new Date(a.appointmentDate).getTime() > now && a.status === 'scheduled');
  const past = appointments.filter(a => new Date(a.appointmentDate).getTime() <= now || a.status !== 'scheduled');

  const displayed = filter === 'upcoming' ? upcoming : filter === 'past' ? past : appointments;
  const nextAppt = upcoming[0];

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}>
      {/* Header */}
      <View className="bg-white pt-14 pb-5 px-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <ArrowLeft color="#334155" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-800 text-xl font-bold">My Appointments</Text>
            <Text className="text-slate-500 text-xs mt-0.5">View your scheduled visits</Text>
          </View>
          <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center">
            <Calendar color="#7C3AED" size={20} />
          </View>
        </View>
      </View>

      <View className="px-5 pt-5">
        {loading ? <ActivityIndicator color="#15803D" size="large" className="my-10" /> : (
          <>
            {/* Next Appointment Countdown */}
            {nextAppt && (
              <View className="bg-emerald-600 rounded-[20px] p-5 mb-4" style={{ shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
                <Text className="text-emerald-100 text-xs font-semibold">NEXT APPOINTMENT</Text>
                <Text className="text-white font-bold text-lg mt-1">{formatApptDate(nextAppt.appointmentDate)}</Text>
                <View className="flex-row items-center mt-2 gap-4">
                  <View className="flex-row items-center gap-1">
                    <Clock color="#A7F3D0" size={14} />
                    <Text className="text-emerald-100 text-sm">{formatApptTime(nextAppt.appointmentDate)}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <User color="#A7F3D0" size={14} />
                    <Text className="text-emerald-100 text-sm">Dr. {nextAppt.doctorName || 'Your Doctor'}</Text>
                  </View>
                </View>
                <View className="bg-white/20 rounded-full px-3 py-1.5 self-start mt-3">
                  <Text className="text-white font-bold text-xs">{getCountdown(nextAppt.appointmentDate)}</Text>
                </View>
              </View>
            )}

            {/* Filter Tabs */}
            <View className="flex-row bg-white rounded-[14px] p-1 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
              {(['upcoming', 'past', 'all'] as const).map(f => (
                <TouchableOpacity key={f} onPress={() => setFilter(f)} className={`flex-1 py-2.5 rounded-[10px] items-center ${filter === f ? 'bg-emerald-600' : ''}`}>
                  <Text className={`text-sm font-semibold ${filter === f ? 'text-white' : 'text-slate-500'}`}>{f === 'upcoming' ? `Upcoming (${upcoming.length})` : f === 'past' ? `Past (${past.length})` : `All (${appointments.length})`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Appointments List */}
            {displayed.length === 0 ? (
              <View className="bg-white rounded-[20px] p-8 items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                <Text className="text-4xl mb-3">📅</Text>
                <Text className="text-slate-800 font-bold text-base mb-1">No Appointments</Text>
                <Text className="text-slate-500 text-sm text-center">Your doctor will schedule appointments for you. They'll appear here automatically.</Text>
              </View>
            ) : (
              displayed.map((appt: any) => {
                const typeStyle = TYPE_STYLES[appt.appointmentType] || TYPE_STYLES.routine_checkup;
                const statusStyle = STATUS_STYLES[appt.status] || STATUS_STYLES.scheduled;
                return (
                  <View key={appt.id} className="bg-white rounded-[18px] p-4 mb-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="rounded-full px-3 py-1" style={{ backgroundColor: typeStyle.bg }}>
                        <Text className="text-xs font-bold" style={{ color: typeStyle.color }}>{typeStyle.label}</Text>
                      </View>
                      <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: statusStyle.bg }}>
                        <Text className="text-xs font-semibold" style={{ color: statusStyle.color }}>{appt.status}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-800 font-bold text-base">{formatApptDate(appt.appointmentDate)}</Text>
                    <View className="flex-row items-center gap-3 mt-2">
                      <View className="flex-row items-center gap-1">
                        <Clock color="#94A3B8" size={13} />
                        <Text className="text-slate-500 text-xs">{formatApptTime(appt.appointmentDate)}</Text>
                      </View>
                      {appt.doctorName && (
                        <View className="flex-row items-center gap-1">
                          <User color="#94A3B8" size={13} />
                          <Text className="text-slate-500 text-xs">Dr. {appt.doctorName}</Text>
                        </View>
                      )}
                      {appt.location && (
                        <View className="flex-row items-center gap-1">
                          <MapPin color="#94A3B8" size={13} />
                          <Text className="text-slate-500 text-xs">{appt.location}</Text>
                        </View>
                      )}
                    </View>
                    {appt.notes && <Text className="text-slate-400 text-xs mt-2 italic">{appt.notes}</Text>}
                  </View>
                );
              })
            )}

            <View className="mb-8" />
          </>
        )}
      </View>
    </ScrollView>
  );
}
