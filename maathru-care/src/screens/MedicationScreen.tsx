import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { ArrowLeft, Pill, Clock, CheckCircle, Circle, Calendar, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  medications: Medication[];
  notes?: string;
  prescribedAt: string;
  isActive: boolean;
}

const FREQUENCY_COLORS: Record<string, string> = {
  'Once daily': '#10B981',
  'Twice daily': '#3B82F6',
  'Three times daily': '#F59E0B',
  'With meals': '#8B5CF6',
  'At bedtime': '#64748B',
};

export default function MedicationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which meds are marked taken today (stored locally per session)
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set());

  const loadPrescriptions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.getPrescriptions(user.id);
      if (res.success) setPrescriptions(res.prescriptions || []);
      else setPrescriptions([]); // ✅ Empty state on failure
    } catch {
      setPrescriptions([]); // ✅ Empty state on error (e.g. table not created yet)
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const toggleTaken = (key: string) => {
    setTakenToday(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const activePrescriptions = prescriptions.filter(p => p.isActive);
  const pastPrescriptions = prescriptions.filter(p => !p.isActive);

  const allMeds = activePrescriptions.flatMap((p, pi) =>
    p.medications.map((m, mi) => ({ ...m, key: `${pi}-${mi}`, prescriptionId: p.id, doctorName: p.doctorName, prescribedAt: p.prescribedAt }))
  );

  const takenCount = allMeds.filter(m => takenToday.has(m.key)).length;
  const totalCount = allMeds.length;

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3">
          <ArrowLeft color="#fff" size={20} />
          <Text className="text-white ml-2 font-semibold">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">My Medications</Text>
        <Text className="text-emerald-200 text-sm mt-1">Prescribed by your doctor</Text>
      </View>

      <View className="px-5 pt-4">
        {loading ? (
          <View className="items-center py-12"><ActivityIndicator color="#15803D" size="large" /></View>
        ) : totalCount === 0 ? (
          <View className="bg-white rounded-[20px] p-10 items-center shadow-sm shadow-slate-100 mb-8">
            <Pill color="#CBD5E1" size={48} />
            <Text className="text-slate-600 font-bold text-lg mt-4">No Medications Yet</Text>
            <Text className="text-slate-400 text-sm text-center mt-2 leading-5">
              Your doctor hasn't prescribed any medications yet.{'\n'}They will appear here once prescribed.
            </Text>
          </View>
        ) : (
          <>
            {/* Today's progress card */}
            <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Today's Medications</Text>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-slate-800 font-bold text-3xl">{takenCount}<Text className="text-slate-400 font-normal text-lg">/{totalCount}</Text></Text>
                  <Text className="text-slate-500 text-sm">medications taken today</Text>
                </View>
                <View className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: takenCount === totalCount ? '#ECFDF5' : '#FFFBEB' }}>
                  <Text className="font-bold text-xl" style={{ color: takenCount === totalCount ? '#10B981' : '#F59E0B' }}>
                    {totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0}%
                  </Text>
                </View>
              </View>
              {/* Progress bar */}
              <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <View className="h-full rounded-full"
                  style={{ width: `${totalCount > 0 ? (takenCount / totalCount) * 100 : 0}%`, backgroundColor: takenCount === totalCount ? '#10B981' : '#F59E0B' }} />
              </View>
              {takenCount === totalCount && totalCount > 0 && (
                <View className="flex-row items-center mt-3">
                  <CheckCircle color="#10B981" size={16} />
                  <Text className="text-emerald-600 text-sm font-semibold ml-2">All medications taken today! 🎉</Text>
                </View>
              )}
            </View>

            {/* Active Medications */}
            {activePrescriptions.map((pres) => (
              <View key={pres.id} className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center mr-3">
                    <User color="#15803D" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-800 font-bold text-sm">Prescribed by {pres.doctorName}</Text>
                    <Text className="text-slate-400 text-xs">
                      {new Date(pres.prescribedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                    <Text className="text-emerald-700 text-xs font-bold">Active</Text>
                  </View>
                </View>

                {pres.medications.map((med, i) => {
                  const key = `${prescriptions.indexOf(pres)}-${i}`;
                  const taken = takenToday.has(key);
                  const freqColor = FREQUENCY_COLORS[med.frequency] || '#64748B';
                  return (
                    <TouchableOpacity key={i} onPress={() => toggleTaken(key)} activeOpacity={0.8}
                      className="flex-row items-start p-4 rounded-[14px] mb-2 border"
                      style={{ backgroundColor: taken ? '#F0FDF4' : '#F8FAFC', borderColor: taken ? '#BBF7D0' : '#E2E8F0' }}>
                      <View className="mt-0.5 mr-3">
                        {taken
                          ? <CheckCircle color="#10B981" size={22} />
                          : <Circle color="#94A3B8" size={22} />}
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-800 font-bold text-base">{med.name}</Text>
                        <Text className="text-slate-600 text-sm font-semibold">{med.dosage}</Text>
                        <View className="flex-row items-center mt-1 gap-2 flex-wrap">
                          <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            <Clock color={freqColor} size={11} />
                            <Text className="text-xs ml-1 font-semibold" style={{ color: freqColor }}>{med.frequency}</Text>
                          </View>
                          <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            <Calendar color="#64748B" size={11} />
                            <Text className="text-xs ml-1 text-slate-600">{med.duration}</Text>
                          </View>
                        </View>
                        {med.instructions && (
                          <Text className="text-slate-400 text-xs mt-1.5 italic">{med.instructions}</Text>
                        )}
                        {taken && (
                          <Text className="text-emerald-600 text-xs font-semibold mt-1">✓ Marked as taken today</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {pres.notes ? (
                  <View className="bg-amber-50 rounded-[12px] p-3 mt-2">
                    <Text className="text-amber-700 text-xs font-bold mb-1">Doctor's Note:</Text>
                    <Text className="text-amber-600 text-xs">{pres.notes}</Text>
                  </View>
                ) : null}
              </View>
            ))}

            {/* Past Prescriptions */}
            {pastPrescriptions.length > 0 && (
              <>
                <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 mt-2">Past Prescriptions</Text>
                {pastPrescriptions.map((pres) => (
                  <View key={pres.id} className="bg-slate-100 rounded-[16px] p-4 mb-3 opacity-70">
                    <Text className="text-slate-500 text-xs font-bold">{pres.doctorName} — {new Date(pres.prescribedAt).toLocaleDateString()}</Text>
                    {pres.medications.map((m, i) => (
                      <Text key={i} className="text-slate-400 text-sm mt-1">• {m.name} {m.dosage}</Text>
                    ))}
                  </View>
                ))}
              </>
            )}
          </>
        )}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
