import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { ArrowLeft, Plus, HeartPulse, Weight, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VitalsLog {
  id: string;
  patientId: string;
  logDate: string;
  systolicBP: number;
  diastolicBP: number;
  weightKg: number;
  pulseRate?: number;
  notes?: string;
  createdAt: string;
}

function getBPStatus(systolic: number, diastolic: number): { label: string; color: string; bg: string } {
  if (systolic >= 160 || diastolic >= 110) return { label: 'Severe Hypertension', color: '#EF4444', bg: '#FEF2F2' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High — Preeclampsia Risk', color: '#F97316', bg: '#FFF7ED' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'Elevated', color: '#F59E0B', bg: '#FFFBEB' };
  if (systolic < 90 || diastolic < 60) return { label: 'Low BP', color: '#3B82F6', bg: '#EFF6FF' };
  return { label: 'Normal', color: '#10B981', bg: '#ECFDF5' };
}

// Simple inline bar chart component — no external library needed
function MiniBarChart({ data, color, label, unit, maxVal }: {
  data: number[]; color: string; label: string; unit: string; maxVal: number;
}) {
  const barWidth = Math.max(8, (SCREEN_WIDTH - 80) / Math.max(data.length, 1) - 4);
  return (
    <View className="mb-2">
      <Text className="text-slate-500 text-xs font-semibold mb-2">{label}</Text>
      <View className="flex-row items-end" style={{ height: 60, gap: 3 }}>
        {data.slice().reverse().map((val, i) => {
          const heightPct = maxVal > 0 ? Math.max(4, (val / maxVal) * 60) : 4;
          return (
            <View key={i} style={{ width: barWidth, alignItems: 'center' }}>
              <View
                style={{ width: barWidth - 2, height: heightPct, backgroundColor: color, borderRadius: 3 }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-slate-400 text-[10px]">Oldest</Text>
        <Text className="text-slate-400 text-[10px]">Latest ({data[0]?.toFixed(0)} {unit})</Text>
      </View>
    </View>
  );
}

export default function VitalsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [history, setHistory] = useState<VitalsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [weight, setWeight] = useState('');
  const [pulse, setPulse] = useState('');
  const [notes, setNotes] = useState('');

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.getVitalsHistory(user.id);
      if (res.success) setHistory(res.history || []);
      else setHistory([]); // ✅ Empty state on failure
    } catch {
      setHistory([]); // ✅ Empty state on error (e.g. table not created yet)
    } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSubmit = async () => {
    const sys = parseFloat(systolic);
    const dia = parseFloat(diastolic);
    const wt = parseFloat(weight);
    if (!systolic || !diastolic || !weight) {
      Alert.alert('Missing Fields', 'Please enter Systolic BP, Diastolic BP, and Weight.');
      return;
    }
    if (sys < 60 || sys > 240 || dia < 30 || dia > 160) {
      Alert.alert('Invalid BP', 'Please check your blood pressure values.');
      return;
    }
    setSubmitting(true);
    try {
      await api.logVitals({
        patientId: user!.id,
        systolicBP: sys,
        diastolicBP: dia,
        weightKg: wt,
        pulseRate: pulse ? parseFloat(pulse) : undefined,
        notes: notes.trim() || undefined,
      });
      setSystolic(''); setDiastolic(''); setWeight(''); setPulse(''); setNotes('');
      setShowForm(false);
      Alert.alert('✅ Vitals Logged', 'Your vitals have been recorded successfully.');
      loadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save vitals.');
    } finally { setSubmitting(false); }
  };

  const latest = history[0];
  const bpStatus = latest ? getBPStatus(latest.systolicBP, latest.diastolicBP) : null;
  const systolicData = history.slice(0, 10).map(h => h.systolicBP);
  const diastolicData = history.slice(0, 10).map(h => h.diastolicBP);
  const weightData = history.slice(0, 10).map(h => h.weightKg);
  const maxBP = Math.max(...systolicData, 160);
  const maxWeight = Math.max(...weightData, 80);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3">
          <ArrowLeft color="#fff" size={20} />
          <Text className="text-white ml-2 font-semibold">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Vitals Tracker</Text>
        <Text className="text-emerald-200 text-sm mt-1">Blood Pressure & Weight Monitoring</Text>
      </View>

      <View className="px-5 pt-4">
        {/* Log Button */}
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          className="bg-emerald-700 rounded-[16px] py-4 flex-row items-center justify-center mb-4"
        >
          <Plus color="#fff" size={20} />
          <Text className="text-white font-bold ml-2">{showForm ? 'Cancel' : 'Log Today\'s Vitals'}</Text>
        </TouchableOpacity>

        {/* Log Form */}
        {showForm && (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
            <Text className="text-slate-800 font-bold text-base mb-4">Enter Vitals</Text>

            {/* BP row */}
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Blood Pressure (mmHg)</Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3">
                <Text className="text-slate-400 text-[10px] mb-1">SYSTOLIC (upper)</Text>
                <TextInput value={systolic} onChangeText={setSystolic} keyboardType="numeric"
                  placeholder="e.g. 120" placeholderTextColor="#CBD5E1" className="text-slate-800 font-bold text-lg" />
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3">
                <Text className="text-slate-400 text-[10px] mb-1">DIASTOLIC (lower)</Text>
                <TextInput value={diastolic} onChangeText={setDiastolic} keyboardType="numeric"
                  placeholder="e.g. 80" placeholderTextColor="#CBD5E1" className="text-slate-800 font-bold text-lg" />
              </View>
            </View>

            {/* Weight & Pulse */}
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3">
                <Text className="text-slate-400 text-[10px] mb-1">WEIGHT (kg)</Text>
                <TextInput value={weight} onChangeText={setWeight} keyboardType="numeric"
                  placeholder="e.g. 65" placeholderTextColor="#CBD5E1" className="text-slate-800 font-bold text-lg" />
              </View>
              <View className="flex-1 bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3">
                <Text className="text-slate-400 text-[10px] mb-1">PULSE (bpm) opt.</Text>
                <TextInput value={pulse} onChangeText={setPulse} keyboardType="numeric"
                  placeholder="e.g. 75" placeholderTextColor="#CBD5E1" className="text-slate-800 font-bold text-lg" />
              </View>
            </View>

            <TextInput value={notes} onChangeText={setNotes} placeholder="Optional notes..."
              placeholderTextColor="#CBD5E1" multiline numberOfLines={2}
              className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-slate-700 text-sm mb-4"
              style={{ textAlignVertical: 'top' }} />

            <TouchableOpacity onPress={handleSubmit} disabled={submitting}
              className="bg-emerald-700 rounded-[14px] py-4 items-center">
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold">Save Vitals</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Latest Reading */}
        {latest && bpStatus && (
          <View className="rounded-[20px] p-5 mb-4" style={{ backgroundColor: bpStatus.bg, borderWidth: 1, borderColor: bpStatus.color + '40' }}>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Latest Reading</Text>
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-slate-800 font-bold text-3xl">{latest.systolicBP}/{latest.diastolicBP}</Text>
                <Text className="text-slate-500 text-xs">mmHg</Text>
                <View className="mt-2 px-3 py-1 rounded-full self-start" style={{ backgroundColor: bpStatus.color }}>
                  <Text className="text-white text-xs font-bold">{bpStatus.label}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-slate-800 font-bold text-2xl">{latest.weightKg}</Text>
                <Text className="text-slate-500 text-xs">kg</Text>
                {latest.pulseRate && (
                  <View className="mt-2">
                    <Text className="text-slate-600 font-bold text-base">{latest.pulseRate} bpm</Text>
                    <Text className="text-slate-400 text-xs">pulse</Text>
                  </View>
                )}
              </View>
            </View>
            <Text className="text-slate-400 text-xs mt-3">
              {new Date(latest.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {/* BP Reference Guide */}
        <View className="bg-blue-50 border border-blue-100 rounded-[16px] p-4 mb-4 flex-row">
          <Info color="#3B82F6" size={16} />
          <View className="ml-3 flex-1">
            <Text className="text-blue-700 font-bold text-xs mb-1">BP Reference (Pregnancy)</Text>
            <Text className="text-blue-600 text-xs">Normal: below 130/80 · Elevated: 130-139/80-89 · High: 140+/90+ · Emergency: 160+/110+</Text>
          </View>
        </View>

        {/* Charts */}
        {history.length >= 2 && (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
            <Text className="text-slate-800 font-bold text-sm mb-4">Trend Charts (last 10 readings)</Text>
            <MiniBarChart data={systolicData} color="#F97316" label="Systolic BP (upper)" unit="mmHg" maxVal={maxBP} />
            <View className="h-px bg-slate-100 my-3" />
            <MiniBarChart data={diastolicData} color="#F59E0B" label="Diastolic BP (lower)" unit="mmHg" maxVal={maxBP} />
            <View className="h-px bg-slate-100 my-3" />
            <MiniBarChart data={weightData} color="#15803D" label="Weight" unit="kg" maxVal={maxWeight} />
          </View>
        )}

        {/* History List */}
        {loading ? (
          <View className="items-center py-8"><ActivityIndicator color="#15803D" /></View>
        ) : history.length === 0 ? (
          <View className="bg-white rounded-[20px] p-8 items-center shadow-sm shadow-slate-100 mb-8">
            <HeartPulse color="#CBD5E1" size={40} />
            <Text className="text-slate-500 font-semibold mt-3">No vitals logged yet</Text>
            <Text className="text-slate-400 text-sm text-center mt-1">
              Start logging your BP and weight to see trends over time.
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-slate-800 font-bold text-sm mb-3">All Readings ({history.length})</Text>
            {history.map((h, i) => {
              const st = getBPStatus(h.systolicBP, h.diastolicBP);
              const prev = history[i + 1];
              const bpDiff = prev ? (h.systolicBP - prev.systolicBP) : 0;
              return (
                <View key={h.id} className="bg-white rounded-[16px] p-4 mb-3 border border-slate-100">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs">
                        {new Date(h.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text className="text-slate-800 font-bold text-xl mt-0.5">{h.systolicBP}/{h.diastolicBP} <Text className="text-slate-400 font-normal text-sm">mmHg</Text></Text>
                      <Text className="text-slate-500 text-sm">{h.weightKg} kg{h.pulseRate ? ` · ${h.pulseRate} bpm` : ''}</Text>
                    </View>
                    <View className="items-end gap-1">
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg }}>
                        <Text className="text-xs font-bold" style={{ color: st.color }}>{st.label}</Text>
                      </View>
                      {prev !== undefined && Math.abs(bpDiff) >= 2 && (
                        <View className="flex-row items-center">
                          {bpDiff > 0
                            ? <TrendingUp color="#EF4444" size={12} />
                            : <TrendingDown color="#10B981" size={12} />}
                          <Text className="text-xs ml-1" style={{ color: bpDiff > 0 ? '#EF4444' : '#10B981' }}>
                            {bpDiff > 0 ? '+' : ''}{bpDiff} sys
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {h.notes ? <Text className="text-slate-400 text-xs mt-2 italic">"{h.notes}"</Text> : null}
                </View>
              );
            })}
          </>
        )}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
