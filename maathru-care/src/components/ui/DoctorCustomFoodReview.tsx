import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/services/api';
import type { UserCustomFood } from '@/types/customFood';

const nutritionSummary = (food: UserCustomFood) => [
  ['Carbs', food.carbs_g, 'g'], ['Sugar', food.sugar_g, 'g'], ['Fiber', food.fiber_g, 'g'],
  ['Fat', food.fat_g, 'g'], ['Iron', food.iron_mg, 'mg'], ['Calcium', food.calcium_mg, 'mg'],
].filter((entry) => entry[1] !== null && entry[1] !== undefined).map(([label, value, unit]) => `${label}: ${value} ${unit}`).join(' · ');

export function DoctorCustomFoodReview({ doctorId, patientId }: { doctorId: string; patientId: string }) {
  const [foods, setFoods] = useState<UserCustomFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFoodId, setSavingFoodId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const loadFoods = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getPatientCustomFoods(doctorId, patientId);
      setFoods(result.foods ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load patient food labels.');
    } finally { setLoading(false); }
  }, [doctorId, patientId, reload]);
  useEffect(() => { void loadFoods(); }, [loadFoods]);

  const setStatus = async (food: UserCustomFood, verificationStatus: 'verified' | 'rejected') => {
    if (savingFoodId) return;
    setSavingFoodId(food.id);
    setError('');
    try {
      const result = await api.setPatientCustomFoodVerification(doctorId, patientId, food.id, verificationStatus);
      setFoods((current) => current.map((entry) => entry.id === food.id ? { ...entry, verification_status: result.food.verification_status, updated_at: result.food.updated_at } : entry));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update food verification.');
    } finally { setSavingFoodId(null); }
  };

  return <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-slate-800 font-bold text-sm">Custom food labels</Text>
      <TouchableOpacity accessibilityRole="button" onPress={() => setReload((value) => value + 1)} className="px-2 py-2"><Text className="text-emerald-700 text-xs font-bold">Refresh</Text></TouchableOpacity>
    </View>
    <Text className="text-slate-500 text-xs leading-5 mb-3">Review the patient-entered label and per-serving nutrition before marking it verified. Rejected foods are blocked from future meal logging and excluded from previous diary totals.</Text>
    {loading ? <ActivityIndicator color="#15803D" /> : error ? <Text accessibilityRole="alert" className="text-red-700 text-xs">{error}</Text> : foods.length === 0
      ? <Text className="text-slate-400 text-xs">This patient has not added any custom food labels.</Text>
      : foods.map((food) => {
        const statusColor = food.verification_status === 'verified' ? '#047857' : food.verification_status === 'rejected' ? '#B91C1C' : '#B45309';
        const busy = savingFoodId === food.id;
        return <View key={food.id} className="border border-slate-200 rounded-xl p-3 mb-2 bg-slate-50">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-slate-800 font-bold">{food.display_name}</Text>
            <Text style={{ color: statusColor }} className="text-xs font-bold">{food.verification_status === 'verified' ? 'Verified' : food.verification_status === 'rejected' ? 'Rejected' : 'Needs review'}</Text>
          </View>
          <Text className="text-slate-500 text-xs mt-1">{[food.sinhala_name, food.english_name, food.category, food.serving_unit && `Per ${food.serving_unit}`].filter(Boolean).join(' · ') || 'No additional label details'}</Text>
          <Text className="text-slate-600 text-xs mt-2">{nutritionSummary(food) || 'No main nutrient values entered'}{food.gi_index !== null ? ` · GI: ${food.gi_index}` : ''}</Text>
          {Object.keys(food.other_nutrients ?? {}).length > 0 && <Text className="text-slate-500 text-xs mt-1">Additional: {Object.entries(food.other_nutrients).map(([key, value]) => `${key} ${value ?? '—'}`).join(' · ')}</Text>}
          <View className="flex-row gap-2 mt-3">
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || food.verification_status === 'verified' }} disabled={busy || food.verification_status === 'verified'} onPress={() => void setStatus(food, 'verified')} className="flex-1 rounded-lg py-2.5 items-center" style={{ backgroundColor: food.verification_status === 'verified' ? '#A7F3D0' : '#047857' }}>
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text className="text-white text-xs font-bold">Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || food.verification_status === 'rejected' }} disabled={busy || food.verification_status === 'rejected'} onPress={() => void setStatus(food, 'rejected')} className="flex-1 rounded-lg py-2.5 items-center" style={{ backgroundColor: food.verification_status === 'rejected' ? '#FECACA' : '#B91C1C' }}>
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text className="text-white text-xs font-bold">Reject</Text>}
            </TouchableOpacity>
          </View>
        </View>;
      })}
  </View>;
}
