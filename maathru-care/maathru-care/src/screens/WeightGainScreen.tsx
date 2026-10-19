import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Dimensions, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText, Path, Circle as SvgCircle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Plus, Scale, RotateCcw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 48;
const CHART_H = 220;
const PAD = { top: 20, right: 16, bottom: 30, left: 36 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

// IOM Guidelines — weekly gain rates (kg/week) after first trimester
const IOM: Record<string, { minTotal: number; maxTotal: number; weeklyMin: number; weeklyMax: number; label: string }> = {
  underweight: { minTotal: 12.5, maxTotal: 18, weeklyMin: 0.44, weeklyMax: 0.58, label: 'Underweight' },
  normal:      { minTotal: 11.5, maxTotal: 16, weeklyMin: 0.35, weeklyMax: 0.50, label: 'Normal' },
  overweight:  { minTotal: 7,    maxTotal: 11.5, weeklyMin: 0.23, weeklyMax: 0.33, label: 'Overweight' },
  obese:       { minTotal: 5,    maxTotal: 9,   weeklyMin: 0.17, weeklyMax: 0.27, label: 'Obese' },
};

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

function getRecommendedGain(cat: string, week: number): { min: number; max: number } {
  const g = IOM[cat] || IOM.normal;
  if (week <= 13) {
    const frac = week / 13;
    return { min: frac * 2, max: frac * 2 }; // ~2kg in first trimester
  }
  const weeksAfter = week - 13;
  return { min: 2 + weeksAfter * g.weeklyMin, max: 2 + weeksAfter * g.weeklyMax };
}

export default function WeightGainScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Setup state
  const [preWeight, setPreWeight] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [setupDone, setSetupDone] = useState(false);
  const [bmiCat, setBmiCat] = useState('normal');
  const [bmi, setBmi] = useState(0);

  // New entry
  const [newWeight, setNewWeight] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getWeightHistory(user.id);
      if (res.success && res.logs?.length > 0) {
        setLogs(res.logs);
        const first = res.logs[0];
        if (first.prePregnancyWeightKg && first.heightCm) {
          setPreWeight(String(first.prePregnancyWeightKg));
          setHeightCm(String(first.heightCm));
          const b = first.prePregnancyWeightKg / Math.pow(first.heightCm / 100, 2);
          setBmi(+b.toFixed(1));
          setBmiCat(getBMICategory(b));
          setSetupDone(true);
        }
      } else {
        setLogs([]);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSetup = () => {
    const pw = parseFloat(preWeight);
    const h = parseFloat(heightCm);
    if (!pw || pw < 30 || pw > 200 || !h || h < 120 || h > 200) {
      Alert.alert('Invalid Input', 'Please enter valid weight (30-200 kg) and height (120-200 cm).');
      return;
    }
    const b = pw / Math.pow(h / 100, 2);
    setBmi(+b.toFixed(1));
    setBmiCat(getBMICategory(b));
    setSetupDone(true);
  };

  const handleSave = async () => {
    const w = parseFloat(newWeight);
    if (!w || w < 30 || w > 200) { Alert.alert('Invalid', 'Enter a valid weight between 30-200 kg.'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      await api.saveWeightLog({
        patientId: user.id,
        weightKg: w,
        gestationalWeek: user.gestationalAgeWeeks || 0,
        prePregnancyWeightKg: parseFloat(preWeight) || undefined,
        heightCm: parseFloat(heightCm) || undefined,
        bmiCategory: bmiCat,
      });
      setNewWeight('');
      await fetchLogs();
      Alert.alert('Saved!', 'Weight logged successfully.');
    } catch { Alert.alert('Error', 'Could not save weight.'); }
    setSaving(false);
  };

  const handleResetConfirm = () => {
    Alert.alert(
      'Reset Weight Tracker?',
      'Are you sure you want to reset all your weight logs and baseline details? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Reset',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
              await api.resetWeightLogs(user.id);
              setLogs([]);
              setPreWeight('');
              setHeightCm('');
              setBmi(0);
              setBmiCat('normal');
              setSetupDone(false);
              setNewWeight('');
              Alert.alert('Reset Complete', 'Your weight tracker has been reset. You can now setup your baseline again.');
            } catch {
              Alert.alert('Error', 'Could not reset weight logs. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => { setRefreshing(true); await fetchLogs(); setRefreshing(false); };

  // Chart and dynamic BMI calculations
  const ppw = parseFloat(preWeight) || 60;
  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weightKg : (parseFloat(preWeight) || 0);
  const currentGain = logs.length > 0 ? latestWeight - ppw : 0;
  const rec = getRecommendedGain(bmiCat, user?.gestationalAgeWeeks || 0);
  const gd = IOM[bmiCat] || IOM.normal;

  // Dynamic current BMI based on latest weight
  const heightM = parseFloat(heightCm) ? parseFloat(heightCm) / 100 : 0;
  const currentBmi = (latestWeight > 0 && heightM > 0)
    ? +(latestWeight / (heightM * heightM)).toFixed(1)
    : bmi;
  const currentBmiCat = getBMICategory(currentBmi);
  const currentBmiDetails = IOM[currentBmiCat] || IOM.normal;

  const status = currentGain < rec.min ? 'below' : currentGain > rec.max ? 'above' : 'on_track';
  const statusLabel = status === 'on_track' ? 'On Track' : status === 'below' ? 'Below Target' : 'Above Target';
  const statusColor = status === 'on_track' ? '#10B981' : status === 'below' ? '#F59E0B' : '#F97316';
  const statusBg = status === 'on_track' ? '#ECFDF5' : status === 'below' ? '#FFFBEB' : '#FFF7ED';

  // Build chart paths
  const xScale = (week: number) => PAD.left + (week / 40) * PLOT_W;
  const yMax = 22;
  const yScale = (gain: number) => PAD.top + PLOT_H - (gain / yMax) * PLOT_H;

  // Recommended zone path
  let zonePath = '';
  const upperPts: string[] = [];
  const lowerPts: string[] = [];
  for (let w = 0; w <= 40; w += 2) {
    const r = getRecommendedGain(bmiCat, w);
    upperPts.push(`${xScale(w)},${yScale(r.max)}`);
    lowerPts.push(`${xScale(w)},${yScale(r.min)}`);
  }
  zonePath = `M ${upperPts.join(' L ')} L ${lowerPts.reverse().join(' L ')} Z`;

  // Data points path
  let dataPath = '';
  const dataPoints = logs.map(l => ({ week: l.gestationalWeek, gain: l.weightKg - ppw }));
  if (dataPoints.length > 0) {
    dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.week)},${yScale(p.gain)}`).join(' ');
  }

  const BMI_COLORS: Record<string, { bg: string; text: string }> = {
    underweight: { bg: '#DBEAFE', text: '#2563EB' },
    normal: { bg: '#D1FAE5', text: '#059669' },
    overweight: { bg: '#FEF3C7', text: '#D97706' },
    obese: { bg: '#FEE2E2', text: '#DC2626' },
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
            <Text className="text-slate-800 text-xl font-bold">Weight Tracker</Text>
            <Text className="text-slate-500 text-xs mt-0.5">IOM Guidelines Chart</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {setupDone && (
              <TouchableOpacity
                onPress={handleResetConfirm}
                activeOpacity={0.7}
                className="flex-row items-center bg-red-50 border border-red-200 rounded-full px-3 py-1.5"
              >
                <RotateCcw color="#EF4444" size={13} />
                <Text className="text-red-600 font-semibold text-xs ml-1">Reset</Text>
              </TouchableOpacity>
            )}
            <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center">
              <Scale color="#15803D" size={20} />
            </View>
          </View>
        </View>
      </View>

      <View className="px-5 pt-5">
        {loading ? <ActivityIndicator color="#15803D" size="large" className="my-10" /> : (
          <>
            {/* BMI Setup */}
            {!setupDone ? (
              <View className="bg-white rounded-[20px] p-5 mb-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                <Text className="text-slate-800 font-bold text-lg mb-1">Setup Your Baseline</Text>
                <Text className="text-slate-500 text-sm mb-4">Enter your pre-pregnancy details to calculate your recommended weight gain range.</Text>
                <Text className="text-slate-600 text-sm font-semibold mb-1">Pre-pregnancy Weight (kg)</Text>
                <TextInput value={preWeight} onChangeText={setPreWeight} keyboardType="numeric" placeholder="e.g. 58" className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 mb-3 text-slate-800" />
                <Text className="text-slate-600 text-sm font-semibold mb-1">Height (cm)</Text>
                <TextInput value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="e.g. 162" className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 mb-4 text-slate-800" />
                <TouchableOpacity onPress={handleSetup} className="bg-emerald-600 rounded-[14px] py-3.5 items-center">
                  <Text className="text-white font-bold">Calculate BMI & Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* BMI Badge */}
                <View className="flex-row mb-4 gap-3">
                  <View className="flex-1 bg-white rounded-[16px] p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                    <Text className="text-slate-400 text-xs font-semibold">CURRENT BMI</Text>
                    <Text className="text-slate-800 font-bold text-xl">{currentBmi}</Text>
                    <View className="rounded-full px-2 py-0.5 mt-1 self-start" style={{ backgroundColor: BMI_COLORS[currentBmiCat]?.bg }}>
                      <Text className="text-xs font-bold" style={{ color: BMI_COLORS[currentBmiCat]?.text }}>{currentBmiDetails.label}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mt-1.5">At {latestWeight} kg</Text>
                  </View>
                  <View className="flex-1 bg-white rounded-[16px] p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                    <Text className="text-slate-400 text-xs font-semibold">GAIN SO FAR</Text>
                    <Text className="text-slate-800 font-bold text-xl">{currentGain > 0 ? '+' : ''}{currentGain.toFixed(1)} kg</Text>
                    <View className="rounded-full px-2 py-0.5 mt-1 self-start" style={{ backgroundColor: statusBg }}>
                      <Text className="text-xs font-bold" style={{ color: statusColor }}>{statusLabel}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mt-1.5">Baseline: {ppw} kg</Text>
                  </View>
                </View>

                {/* Recommended Range Card */}
                <View className="bg-white rounded-[16px] p-4 mb-4 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                  <Target color="#15803D" size={18} />
                  <Text className="text-slate-600 text-sm ml-2">Recommended total gain: </Text>
                  <Text className="text-emerald-700 font-bold text-sm">{gd.minTotal} – {gd.maxTotal} kg</Text>
                </View>

                {/* SVG Chart */}
                <View className="bg-white rounded-[20px] p-3 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                  <Text className="text-slate-700 font-bold text-sm mb-2 ml-2">Weight Gain vs IOM Guidelines</Text>
                  <Svg width={CHART_W} height={CHART_H}>
                    <Defs>
                      <LinearGradient id="zoneGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#10B981" stopOpacity="0.2" />
                        <Stop offset="1" stopColor="#10B981" stopOpacity="0.05" />
                      </LinearGradient>
                    </Defs>

                    {/* Grid lines */}
                    {[0, 5, 10, 15, 20].map(g => (
                      <Line key={`g${g}`} x1={PAD.left} y1={yScale(g)} x2={PAD.left + PLOT_W} y2={yScale(g)} stroke="#E2E8F0" strokeWidth={0.5} />
                    ))}
                    {[0, 8, 16, 24, 32, 40].map(w => (
                      <Line key={`w${w}`} x1={xScale(w)} y1={PAD.top} x2={xScale(w)} y2={PAD.top + PLOT_H} stroke="#E2E8F0" strokeWidth={0.5} />
                    ))}

                    {/* IOM Zone */}
                    <Path d={zonePath} fill="url(#zoneGrad)" stroke="#10B981" strokeWidth={1} strokeDasharray="4,4" />

                    {/* Data line */}
                    {dataPath ? <Path d={dataPath} stroke="#15803D" strokeWidth={2.5} fill="none" /> : null}

                    {/* Data points */}
                    {dataPoints.map((p, i) => (
                      <SvgCircle key={i} cx={xScale(p.week)} cy={yScale(p.gain)} r={i === dataPoints.length - 1 ? 5 : 3} fill={i === dataPoints.length - 1 ? '#15803D' : '#34D399'} stroke="#fff" strokeWidth={1.5} />
                    ))}

                    {/* Y-axis labels */}
                    {[0, 5, 10, 15, 20].map(g => (
                      <SvgText key={`yl${g}`} x={PAD.left - 6} y={yScale(g) + 4} fill="#94A3B8" fontSize={10} textAnchor="end">{g}</SvgText>
                    ))}
                    {/* X-axis labels */}
                    {[0, 8, 16, 24, 32, 40].map(w => (
                      <SvgText key={`xl${w}`} x={xScale(w)} y={CHART_H - 6} fill="#94A3B8" fontSize={10} textAnchor="middle">{w}w</SvgText>
                    ))}

                    {/* Axis labels */}
                    <SvgText x={4} y={CHART_H / 2} fill="#64748B" fontSize={9} textAnchor="middle" rotation={-90} origin={`4, ${CHART_H / 2}`}>Gain (kg)</SvgText>
                  </Svg>
                  <View className="flex-row items-center justify-center gap-4 mt-1">
                    <View className="flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B98140' }} />
                      <Text className="text-slate-500 text-xs">IOM Zone</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <View className="w-3 h-3 rounded-full bg-emerald-600" />
                      <Text className="text-slate-500 text-xs">Your Weight</Text>
                    </View>
                  </View>
                </View>

                {/* Log Weight */}
                <View className="bg-white rounded-[20px] p-5 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                  <Text className="text-slate-800 font-bold text-base mb-3">Log Current Weight</Text>
                  <View className="flex-row gap-3">
                    <TextInput value={newWeight} onChangeText={setNewWeight} keyboardType="numeric" placeholder="Weight (kg)" className="flex-1 bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-slate-800" />
                    <TouchableOpacity onPress={handleSave} disabled={saving} className="bg-emerald-600 rounded-[14px] px-5 py-3 items-center justify-center">
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Plus color="#fff" size={20} />}
                    </TouchableOpacity>
                  </View>
                  <Text className="text-slate-400 text-xs mt-2">Week {user?.gestationalAgeWeeks || '?'} • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>

                {/* History */}
                <Text className="text-slate-800 font-bold text-lg mb-3">History</Text>
                {logs.length === 0 ? (
                  <View className="bg-white rounded-[16px] p-5 items-center mb-8">
                    <Text className="text-slate-500 text-sm">No weight logs yet. Start tracking above!</Text>
                  </View>
                ) : (
                  <View className="mb-8">
                    {logs.slice().reverse().map((l: any, i: number) => (
                      <View key={l.id || i} className="bg-white rounded-[14px] p-3.5 mb-2 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 }}>
                        <View className="w-9 h-9 bg-emerald-50 rounded-full items-center justify-center mr-3">
                          <Text className="text-emerald-700 font-bold text-xs">W{l.gestationalWeek}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-800 font-semibold text-sm">{l.weightKg} kg</Text>
                          <Text className="text-slate-400 text-xs">{new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                        </View>
                        <Text className="text-slate-500 text-sm font-semibold">
                          {(l.weightKg - ppw) > 0 ? '+' : ''}{(l.weightKg - ppw).toFixed(1)} kg
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
