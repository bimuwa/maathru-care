import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Calendar, Clock, MapPin, UserPlus, Check, X, Users, Plus } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const APPT_TYPES = [
  { key: 'routine_checkup', label: 'Routine', icon: '🩺', bg: '#D1FAE5', color: '#059669' },
  { key: 'follow_up', label: 'Follow-up', icon: '🔄', bg: '#DBEAFE', color: '#2563EB' },
  { key: 'urgent', label: 'Urgent', icon: '🚨', bg: '#FEE2E2', color: '#DC2626' },
  { key: 'ultrasound', label: 'Ultrasound', icon: '📡', bg: '#EDE9FE', color: '#7C3AED' },
  { key: 'lab_test', label: 'Lab Test', icon: '🧪', bg: '#FEF3C7', color: '#D97706' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: '#DBEAFE', color: '#2563EB' },
  completed: { bg: '#D1FAE5', color: '#059669' },
  cancelled: { bg: '#F1F5F9', color: '#94A3B8' },
};

export default function DoctorAppointmentScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string }>();
  const [tab, setTab] = useState<'schedule' | 'my'>('schedule');
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [date, setDate] = useState(new Date(Date.now() + 86400000)); // tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [apptType, setApptType] = useState('routine_checkup');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [pRes, aRes] = await Promise.all([
        api.getDoctorPatients(user.id),
        api.getDoctorAppointments(user.id),
      ]);
      if (pRes.success) setPatients(pRes.patients || []);
      if (aRes.success) setAppointments(aRes.appointments || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pre-select patient if navigated from patient profile
  useEffect(() => {
    if (params.patientId) {
      if (patients.length > 0) {
        const found = patients.find(p => p.id === params.patientId);
        if (found) {
          setSelectedPatient(found);
        } else {
          setSelectedPatient({ id: params.patientId, fullName: params.patientName || 'Patient' });
        }
      } else if (params.patientName) {
        setSelectedPatient({ id: params.patientId, fullName: params.patientName });
      }
    }
  }, [params.patientId, params.patientName, patients]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleSchedule = async () => {
    if (!selectedPatient) { Alert.alert('Select Patient', 'Please select a patient first.'); return; }
    if (date.getTime() < Date.now()) { Alert.alert('Invalid Date', 'Appointment date must be in the future.'); return; }
    setSaving(true);
    try {
      await api.createAppointment({
        patientId: selectedPatient.id,
        doctorId: user?.id || '',
        appointmentDate: date.toISOString(),
        appointmentType: apptType,
        notes: notes || undefined,
        location: location || undefined,
        doctorName: user?.fullName,
        patientName: selectedPatient.fullName,
      });
      Alert.alert('✅ Scheduled!', `Appointment for ${selectedPatient.fullName} has been scheduled.`);
      setSelectedPatient(null);
      setNotes('');
      setLocation('');
      setTab('my');
      await fetchData();
    } catch { Alert.alert('Error', 'Could not schedule appointment.'); }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateAppointment(id, { status });
      await fetchData();
    } catch { Alert.alert('Error', 'Could not update appointment.'); }
  };

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}>
      {/* Header */}
      <View className="bg-white pt-14 pb-5 px-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <ArrowLeft color="#334155" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-800 text-xl font-bold">Appointments</Text>
            <Text className="text-slate-500 text-xs mt-0.5">Schedule & Manage</Text>
          </View>
          <View className="w-10 h-10 bg-purple-50 rounded-full items-center justify-center">
            <Calendar color="#7C3AED" size={20} />
          </View>
        </View>
      </View>

      <View className="px-5 pt-4">
        {/* Tabs */}
        <View className="flex-row bg-white rounded-[14px] p-1 mb-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
          <TouchableOpacity onPress={() => setTab('schedule')} className={`flex-1 py-3 rounded-[10px] items-center ${tab === 'schedule' ? 'bg-emerald-600' : ''}`}>
            <Text className={`text-sm font-semibold ${tab === 'schedule' ? 'text-white' : 'text-slate-500'}`}>📝 Schedule New</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('my')} className={`flex-1 py-3 rounded-[10px] items-center ${tab === 'my' ? 'bg-emerald-600' : ''}`}>
            <Text className={`text-sm font-semibold ${tab === 'my' ? 'text-white' : 'text-slate-500'}`}>📋 My Schedule ({appointments.length})</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color="#15803D" size="large" className="my-10" /> : (
          <>
            {tab === 'schedule' && (
              <View>
                {/* Patient Selector */}
                <Text className="text-slate-600 text-sm font-semibold mb-2">Select Patient</Text>
                <TouchableOpacity onPress={() => setShowPatientPicker(!showPatientPicker)} className="bg-white border border-slate-200 rounded-[14px] px-4 py-3.5 flex-row items-center mb-1">
                  <Users color="#64748B" size={16} />
                  <Text className={`flex-1 ml-3 text-sm ${selectedPatient ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    {selectedPatient ? selectedPatient.fullName : 'Tap to select a patient...'}
                  </Text>
                </TouchableOpacity>
                {showPatientPicker && (
                  <View className="bg-white border border-slate-200 rounded-[14px] mb-3 overflow-hidden">
                    {patients.map(p => (
                      <TouchableOpacity key={p.id} onPress={() => { setSelectedPatient(p); setShowPatientPicker(false); }} className={`px-4 py-3 border-b border-slate-50 ${selectedPatient?.id === p.id ? 'bg-emerald-50' : ''}`}>
                        <Text className={`text-sm ${selectedPatient?.id === p.id ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>{p.fullName}</Text>
                        <Text className="text-slate-400 text-xs">Week {p.gestationalAgeWeeks} • {p.bloodGroup}</Text>
                      </TouchableOpacity>
                    ))}
                    {patients.length === 0 && <Text className="text-slate-400 text-sm text-center p-4">No patients assigned yet</Text>}
                  </View>
                )}

                {/* Date & Time */}
                <Text className="text-slate-600 text-sm font-semibold mb-2 mt-3">Date & Time</Text>
                <View className="flex-row gap-3 mb-4">
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} className="flex-1 bg-white border border-slate-200 rounded-[14px] px-4 py-3.5 flex-row items-center">
                    <Calendar color="#64748B" size={16} />
                    <Text className="text-slate-800 text-sm ml-2">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} className="flex-1 bg-white border border-slate-200 rounded-[14px] px-4 py-3.5 flex-row items-center">
                    <Clock color="#64748B" size={16} />
                    <Text className="text-slate-800 text-sm ml-2">{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker value={date} mode="date" minimumDate={new Date()} onChange={(e: any, d?: Date) => { setShowDatePicker(false); if (d) { const nd = new Date(d); nd.setHours(date.getHours(), date.getMinutes()); setDate(nd); } }} />
                )}
                {showTimePicker && (
                  <DateTimePicker value={date} mode="time" onChange={(e: any, d?: Date) => { setShowTimePicker(false); if (d) { const nd = new Date(date); nd.setHours(d.getHours(), d.getMinutes()); setDate(nd); } }} />
                )}

                {/* Appointment Type */}
                <Text className="text-slate-600 text-sm font-semibold mb-2">Appointment Type</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {APPT_TYPES.map(t => (
                    <TouchableOpacity key={t.key} onPress={() => setApptType(t.key)} className={`px-4 py-2.5 rounded-[12px] flex-row items-center gap-1.5`} style={{ backgroundColor: apptType === t.key ? t.bg : '#F1F5F9', borderWidth: apptType === t.key ? 1.5 : 0, borderColor: t.color }}>
                      <Text>{t.icon}</Text>
                      <Text className="text-xs font-semibold" style={{ color: apptType === t.key ? t.color : '#64748B' }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Location & Notes */}
                <Text className="text-slate-600 text-sm font-semibold mb-1">Location (optional)</Text>
                <TextInput value={location} onChangeText={setLocation} placeholder="e.g. Room 204, Maternity Ward" className="bg-white border border-slate-200 rounded-[14px] px-4 py-3 mb-3 text-slate-800 text-sm" />
                <Text className="text-slate-600 text-sm font-semibold mb-1">Notes (optional)</Text>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Any special instructions..." multiline numberOfLines={3} className="bg-white border border-slate-200 rounded-[14px] px-4 py-3 mb-5 text-slate-800 text-sm" style={{ textAlignVertical: 'top', minHeight: 70 }} />

                {/* Schedule Button */}
                <TouchableOpacity onPress={handleSchedule} disabled={saving} className="bg-emerald-600 rounded-[16px] py-4 items-center mb-6" style={{ shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 }}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <View className="flex-row items-center gap-2"><Plus color="#fff" size={18} /><Text className="text-white font-bold text-base">Schedule Appointment</Text></View>}
                </TouchableOpacity>
              </View>
            )}

            {tab === 'my' && (
              <View>
                {appointments.length === 0 ? (
                  <View className="bg-white rounded-[20px] p-8 items-center">
                    <Text className="text-4xl mb-3">📋</Text>
                    <Text className="text-slate-500 text-sm text-center">No appointments scheduled yet.</Text>
                  </View>
                ) : (
                  appointments.map((appt: any) => {
                    const typeInfo = APPT_TYPES.find(t => t.key === appt.appointmentType) || APPT_TYPES[0];
                    const sColor = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
                    return (
                      <View key={appt.id} className="bg-white rounded-[18px] p-4 mb-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2">
                            <Text>{typeInfo.icon}</Text>
                            <Text className="text-slate-800 font-bold text-sm">{appt.patientName || 'Patient'}</Text>
                          </View>
                          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: sColor.bg }}>
                            <Text className="text-xs font-semibold" style={{ color: sColor.color }}>{appt.status}</Text>
                          </View>
                        </View>
                        <Text className="text-slate-600 text-sm">{new Date(appt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(appt.appointmentDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                        {appt.location && <Text className="text-slate-400 text-xs mt-1">📍 {appt.location}</Text>}
                        {appt.notes && <Text className="text-slate-400 text-xs mt-1 italic">{appt.notes}</Text>}

                        {appt.status === 'scheduled' && (
                          <View className="flex-row gap-2 mt-3">
                            <TouchableOpacity onPress={() => handleStatusChange(appt.id, 'completed')} className="flex-1 bg-emerald-50 rounded-[12px] py-2.5 items-center flex-row justify-center gap-1">
                              <Check color="#059669" size={14} />
                              <Text className="text-emerald-700 font-semibold text-xs">Complete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleStatusChange(appt.id, 'cancelled')} className="flex-1 bg-slate-50 rounded-[12px] py-2.5 items-center flex-row justify-center gap-1">
                              <X color="#94A3B8" size={14} />
                              <Text className="text-slate-500 font-semibold text-xs">Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            <View className="mb-8" />
          </>
        )}
      </View>
    </ScrollView>
  );
}
