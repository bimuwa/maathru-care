import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DIARY_NUTRIENTS, aggregateDiaryWeek, localDateString, mondayOf, shiftLocalDate, type DiaryNutrientKey } from '../services/wellnessDiaryAggregation';
import type { SavedDiaryMeal } from '../services/foodDiaryService';
import { MealList, WeekChart } from '../components/ui/WellnessDiaryDashboard';

const panel = { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 } as const;
const muted = { color: '#64748B', fontSize: 12, lineHeight: 18 } as const;

export default function DoctorEatingPatternScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const patientId = typeof params.patientId === 'string' ? params.patientId : '';
  const patientName = typeof params.patientName === 'string' ? params.patientName : 'Patient';
  const today = localDateString(new Date());
  const [weekStart, setWeekStart] = useState(mondayOf(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedNutrient, setSelectedNutrient] = useState<DiaryNutrientKey>('carbs_g');
  const [meals, setMeals] = useState<SavedDiaryMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => { if (user?.role !== 'doctor' && !authLoading) router.replace('/login'); }, [user?.role, authLoading, router]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user?.id || !patientId) { setError('Select a patient from your assigned-patient list.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    void api.getPatientFoodDiary(user.id, patientId, weekStart, shiftLocalDate(weekStart, 6))
      .then((result) => { if (active) setMeals(result.meals ?? []); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load this patient’s food diary.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, patientId, weekStart, reload]));

  const days = useMemo(() => aggregateDiaryWeek(weekStart, meals), [weekStart, meals]);
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];
  const loggedDays = days.filter((day) => day.mealCount > 0).length;
  const foodCount = days.reduce((sum, day) => sum + day.foodCount, 0);
  const weekLabel = `${new Date(`${weekStart}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(`${shiftLocalDate(weekStart, 6)}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const button = (label: string, action: () => void, icon?: React.ReactNode) => <TouchableOpacity accessibilityRole="button" onPress={action} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' }}>{icon}<Text style={{ color: '#047857', fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
  if (authLoading || (loading && !meals.length)) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}><ActivityIndicator color="#047857" /><Text style={{ ...muted, marginTop: 10 }}>Loading eating pattern…</Text></View>;

  return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 40, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 680, gap: 12 }}>
        <View style={panel}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: 6 }}><ArrowLeft size={19} color="#047857"/><Text style={{ color: '#047857', fontWeight: '700' }}>Assigned patients</Text></TouchableOpacity>
          <Text style={{ color: '#0F172A', fontSize: 22, fontWeight: '800' }}>Eating pattern</Text>
          <Text style={muted}>{patientName} · Food Diary records</Text>
        </View>

        <View style={panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {button('Previous week', () => { const next = shiftLocalDate(weekStart, -7); setWeekStart(mondayOf(next)); setSelectedDate(mondayOf(next)); }, <ChevronLeft size={16} color="#047857"/>)}
            <Text style={{ color: '#0F172A', fontWeight: '700', flex: 1, textAlign: 'center' }}>{weekLabel}</Text>
            {button('Next week', () => { const next = shiftLocalDate(weekStart, 7); setWeekStart(mondayOf(next)); setSelectedDate(mondayOf(next)); }, <ChevronRight size={16} color="#047857"/>)}
          </View>
          {weekStart !== mondayOf(today) && button('This week', () => { setWeekStart(mondayOf(today)); setSelectedDate(today); })}
        </View>

        {error ? <View style={panel}><Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 13 }}>{error}</Text>{button('Try again', () => setReload((value) => value + 1), <RefreshCw size={15} color="#047857"/>)}</View> : <>
          <View style={panel}>
            <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>Weekly recorded overview</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['Days with meals', `${loggedDays} / 7`], ['Meals logged', String(days.reduce((sum, day) => sum + day.mealCount, 0))], ['Foods recorded', String(foodCount)]].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12 }}><Text style={{ color: '#047857', fontSize: 18, fontWeight: '800' }}>{value}</Text><Text style={{ ...muted, fontSize: 10 }}>{label}</Text></View>)}
            </View>
            <Text style={muted}>This summarizes logged meals only. Unlogged days and missing nutrient values are unknown, not zero intake.</Text>
            {days.flatMap((day) => day.meals).flatMap((meal) => meal.food_diary_items).some((item) => item.custom_food_verification_status === 'unverified' || item.custom_food_verification_status === null && item.food_id?.startsWith('custom_')) && <Text style={{ color: '#92400E', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, fontSize: 12 }}>Some custom-food nutrition has not been verified and should be treated as unconfirmed.</Text>}
            {days.flatMap((day) => day.meals).flatMap((meal) => meal.food_diary_items).some((item) => item.custom_food_verification_status === 'rejected') && <Text style={{ color: '#991B1B', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, fontSize: 12 }}>Rejected custom-food entries remain visible in history but are excluded from nutrient totals.</Text>}
          </View>

          <View style={panel}>
            <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>Nutrient pattern</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{DIARY_NUTRIENTS.map((entry) => <TouchableOpacity key={entry.key} accessibilityRole="button" onPress={() => setSelectedNutrient(entry.key)} style={{ minHeight: 40, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', backgroundColor: selectedNutrient === entry.key ? '#CCFBF1' : '#F1F5F9' }}><Text style={{ color: selectedNutrient === entry.key ? '#047857' : '#475569', fontSize: 12, fontWeight: '700' }}>{entry.short}</Text></TouchableOpacity>)}</View>
            <WeekChart days={days} selected={selected?.date ?? selectedDate} onSelect={setSelectedDate} nutrientKey={selectedNutrient}/>
            <Text style={muted}>Tap a day to view its meals. Rejected custom foods are omitted from these estimates.</Text>
          </View>

          {selected && <View style={panel}>
            <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>{new Date(`${selected.date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={muted}>{selected.mealCount} meals · {selected.foodCount} foods</Text>
            {selected.mealCount ? <MealList meals={selected.meals}/> : <Text style={muted}>No meal records for this day.</Text>}
          </View>}
        </>}
      </View>
    </ScrollView>
    {loading && meals.length > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 12, padding: 8, backgroundColor: '#FFFFFF', borderRadius: 20 }}><ActivityIndicator size="small" color="#047857"/></View>}
  </View>;
}
