import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CheckCircle, AlertCircle, Plus, ClipboardList, Calendar } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, DailySymptomLog } from '../services/api';

const ALL_SYMPTOMS = [
  { id: 'nausea', label: 'Nausea', emoji: '🤢' },
  { id: 'vomit', label: 'Vomiting', emoji: '🤮' },
  { id: 'headache', label: 'Headache', emoji: '🤕' },
  { id: 'fever', label: 'Fever', emoji: '🌡️' },
  { id: 'dizziness', label: 'Dizziness', emoji: '😵' },
  { id: 'abdominal_pain', label: 'Abdominal Discomfort', emoji: '😣' },
  { id: 'swelling', label: 'Swelling (feet/hands)', emoji: '🦶' },
  { id: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { id: 'back_pain', label: 'Back Pain', emoji: '🔙' },
  { id: 'vision_changes', label: 'Vision Changes', emoji: '👁️' },
  { id: 'shortness_of_breath', label: 'Shortness of Breath', emoji: '😮‍💨' },
  { id: 'leg_cramps', label: 'Leg Cramps', emoji: '🦵' },
];

const SEVERITY_OPTIONS: Array<{ value: 'mild' | 'moderate' | 'severe'; label: string; color: string; bg: string }> = [
  { value: 'mild', label: 'Mild', color: '#10B981', bg: '#ECFDF5' },
  { value: 'moderate', label: 'Moderate', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'severe', label: 'Severe', color: '#EF4444', bg: '#FEF2F2' },
];

function getPatternWarning(history: DailySymptomLog[]): string | null {
  if (history.length < 2) return null;
  const counts: Record<string, number> = {};
  const recent5 = history.slice(0, 5);
  for (const log of recent5) {
    for (const s of log.symptoms) {
      counts[s] = (counts[s] || 0) + 1;
    }
  }
  const repeated = Object.entries(counts)
    .filter(([, cnt]) => cnt >= 3)
    .map(([sym]) => ALL_SYMPTOMS.find((s) => s.id === sym)?.label ?? sym);
  if (repeated.length > 0) {
    return `Pattern detected: ${repeated.join(', ')} reported ${counts[Object.keys(counts).find((k) => counts[k] >= 3)!]} times in the last ${recent5.length} days.`;
  }
  return null;
}

export default function DailySymptomsScreen() {
  const { user } = useAuth();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState<DailySymptomLog[]>([]);
  const [patternWarning, setPatternWarning] = useState<string | null>(null);
  const [todayLogged, setTodayLogged] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const res = await api.getSymptomsHistory(user.id);
      if (res.success) {
        setHistory(res.history);
        setPatternWarning(getPatternWarning(res.history));
        const today = new Date().toDateString();
        const alreadyLogged = res.history.some(
          (h) => new Date(h.logDate).toDateString() === today
        );
        setTodayLogged(alreadyLogged);
      }
    } catch {
      // offline
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert('Select Symptoms', 'Please select at least one symptom, or select "None today" to log a symptom-free day.');
      return;
    }
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      const res = await api.logSymptoms({
        patientId: user.id,
        symptoms: selectedSymptoms,
        severity,
        notes: notes.trim() || undefined,
      });
      if (res.success) {
        Alert.alert('✅ Logged', 'Your symptoms for today have been recorded.');
        setSelectedSymptoms([]);
        setNotes('');
        loadHistory();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to log symptoms.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const logNone = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      await api.logSymptoms({ patientId: user.id, symptoms: ['none'], severity: 'mild', notes: 'No symptoms today' });
      Alert.alert('✅ Logged', 'Great! No symptoms logged for today.');
      loadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <View className="flex-row items-center mb-2">
          <ClipboardList color="#FFFFFF" size={20} />
          <Text className="text-white text-xs font-bold ml-2 uppercase tracking-wider">Daily Check-in</Text>
        </View>
        <Text className="text-white text-2xl font-bold">How are you feeling today?</Text>
        <Text className="text-emerald-200 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <View className="px-5 pt-4">
        {/* Already logged notice */}
        {todayLogged && (
          <View className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-4 mb-4 flex-row items-center">
            <CheckCircle color="#10B981" size={20} />
            <Text className="text-emerald-700 text-sm font-semibold ml-3">
              Today's check-in already submitted!
            </Text>
          </View>
        )}

        {/* Pattern Warning */}
        {patternWarning && (
          <View className="bg-amber-50 border border-amber-200 rounded-[16px] p-4 mb-4 flex-row items-start">
            <AlertCircle color="#F59E0B" size={20} />
            <View className="flex-1 ml-3">
              <Text className="text-amber-700 font-bold text-sm">⚠️ Symptom Pattern Detected</Text>
              <Text className="text-amber-600 text-xs mt-1">{patternWarning}</Text>
              <Text className="text-amber-500 text-xs mt-1">Please inform your doctor at your next visit.</Text>
            </View>
          </View>
        )}

        {/* Symptom Grid */}
        <Text className="text-slate-800 font-bold text-base mb-3">
          Select all symptoms you are experiencing today:
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {ALL_SYMPTOMS.map((symptom) => {
            const active = selectedSymptoms.includes(symptom.id);
            return (
              <TouchableOpacity
                key={symptom.id}
                onPress={() => toggleSymptom(symptom.id)}
                className={`flex-row items-center px-3 py-2 rounded-full border ${
                  active
                    ? 'bg-emerald-700 border-emerald-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text className="text-base mr-1.5">{symptom.emoji}</Text>
                <Text
                  className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-600'}`}
                >
                  {symptom.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Severity */}
        {selectedSymptoms.length > 0 && (
          <>
            <Text className="text-slate-800 font-bold text-sm mb-3">How severe are your symptoms?</Text>
            <View className="flex-row gap-2 mb-5">
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSeverity(opt.value)}
                  className="flex-1 py-3 rounded-[14px] items-center border"
                  style={{
                    backgroundColor: severity === opt.value ? opt.bg : '#FFFFFF',
                    borderColor: severity === opt.value ? opt.color : '#E2E8F0',
                  }}
                >
                  <Text
                    className="font-bold text-sm"
                    style={{ color: severity === opt.value ? opt.color : '#94A3B8' }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text className="text-slate-700 text-sm font-semibold mb-2">Additional notes (optional)</Text>
            <TextInput
              className="bg-white border border-slate-200 rounded-[14px] px-4 py-3 text-slate-700 text-sm mb-5"
              placeholder="Describe your symptoms in more detail..."
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        )}

        {/* Submit Buttons */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-emerald-700 rounded-[16px] py-4 items-center mb-3"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Log Today's Symptoms</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={logNone}
          disabled={isSubmitting}
          className="bg-white border border-slate-200 rounded-[16px] py-3 items-center mb-6"
        >
          <Text className="text-slate-500 font-semibold">No symptoms today ✓</Text>
        </TouchableOpacity>

        {/* History */}
        <Text className="text-slate-800 font-bold text-base mb-3">Symptom History</Text>
        {isLoadingHistory ? (
          <ActivityIndicator color="#15803D" />
        ) : history.length === 0 ? (
          <View className="bg-white rounded-[16px] p-5 items-center border border-slate-100 mb-8">
            <Calendar color="#94A3B8" size={32} />
            <Text className="text-slate-400 text-sm mt-2">No symptom history yet.</Text>
          </View>
        ) : (
          history.slice(0, 7).map((log) => (
            <View key={log.id} className="bg-white rounded-[16px] p-4 mb-3 border border-slate-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-700 font-semibold text-sm">
                  {new Date(log.logDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      log.severity === 'mild' ? '#ECFDF5' :
                      log.severity === 'moderate' ? '#FFFBEB' : '#FEF2F2',
                  }}
                >
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{
                      color:
                        log.severity === 'mild' ? '#10B981' :
                        log.severity === 'moderate' ? '#F59E0B' : '#EF4444',
                    }}
                  >
                    {log.severity}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-1">
                {log.symptoms.map((s) => {
                  const found = ALL_SYMPTOMS.find((a) => a.id === s);
                  return (
                    <Text key={s} className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">
                      {found ? `${found.emoji} ${found.label}` : s}
                    </Text>
                  );
                })}
              </View>
              {log.patternFlag && (
                <Text className="text-amber-600 text-xs mt-2">⚠️ {log.patternFlag}</Text>
              )}
            </View>
          ))
        )}
        <View className="h-6" />
      </View>
    </ScrollView>
  );
}
