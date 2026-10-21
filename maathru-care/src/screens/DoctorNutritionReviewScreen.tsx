import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, RefreshCw, ChevronLeft, ChevronRight, Users, Utensils } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { UserCustomFood } from '../types/customFood';
import type { SavedDiaryMeal } from '../services/foodDiaryService';
import { aggregateDiaryWeek, localDateString, mondayOf, shiftLocalDate, DIARY_NUTRIENTS, type DiaryDay, type DiaryNutrientKey } from '../services/wellnessDiaryAggregation';
import { MealList, WeekChart } from '../components/ui/WellnessDiaryDashboard';

type Mother = { id: string; full_name: string; email: string; age: number | null; gestational_week: number | null; blood_group: string | null };
const card = { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 } as const;
const muted = { color: '#64748B', fontSize: 12, lineHeight: 18 } as const;

export default function DoctorNutritionReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<Mother[]>([]);
  const [query, setQuery] = useState('');
  const [patientId, setPatientId] = useState('');
  const [foods, setFoods] = useState<UserCustomFood[]>([]);
  const [meals, setMeals] = useState<SavedDiaryMeal[]>([]);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [reload, setReload] = useState(0);
  const [weekStart, setWeekStart] = useState(mondayOf(localDateString(new Date())));
  const [selectedDate, setSelectedDate] = useState(localDateString(new Date()));
  const [nutrientKey, setNutrientKey] = useState<DiaryNutrientKey>('carbs_g');

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await api.getDevDoctorMothers(); setUsers(result.users ?? []); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load users. Start the backend with development review enabled.'); }
    finally { setLoading(false); }
  }, [reload]);
  useEffect(() => { if (user?.isMock) void loadUsers(); }, [loadUsers, user?.isMock]);

  const loadSelected = useCallback(async () => {
    if (!patientId) { setFoods([]); setMeals([]); return; }
    setLoading(true); setError('');
    try {
      const result = await api.getDevDoctorMotherData(patientId);
      setFoods(result.foods ?? []); setMeals(result.meals ?? []); setWarning(result.warning ?? '');
      const newest = (result.meals ?? []).map((meal) => meal.logged_date).filter(Boolean).sort().at(-1);
      if (newest) { const monday = mondayOf(newest); setWeekStart(monday); setSelectedDate(newest); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the selected user records.'); }
    finally { setLoading(false); }
  }, [patientId, reload]);
  useEffect(() => { if (user?.isMock && patientId) void loadSelected(); }, [loadSelected, user?.isMock, patientId]);

  const filteredUsers = useMemo(() => users.filter((mother) => (mother.full_name ?? '').toLowerCase().includes(query.trim().toLowerCase())), [users, query]);
  const week = useMemo(() => aggregateDiaryWeek(weekStart, meals), [weekStart, meals]);
  const selectedDay: DiaryDay | undefined = week.find((day) => day.date === selectedDate) ?? week[0];

  const changeStatus = async (food: UserCustomFood, status: 'verified' | 'rejected') => {
    if (!patientId || savingId) return;
    setSavingId(food.id); setError('');
    try {
      const result = await api.setDevDoctorFoodStatus(patientId, food.id, status);
      setFoods((current) => current.map((item) => item.id === food.id ? { ...item, verification_status: result.food.verification_status, updated_at: result.food.updated_at } : item));
      const updated = await api.getDevDoctorMotherData(patientId);
      setMeals(updated.meals ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update label.'); }
    finally { setSavingId(''); }
  };

  const button = (label: string, action: () => void, icon?: React.ReactNode) => <TouchableOpacity accessibilityRole="button" onPress={action} style={{ minHeight: 42, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#ECFDF5', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' }}>{icon}<Text style={{ color: '#047857', fontWeight: '700', fontSize: 12 }}>{label}</Text></TouchableOpacity>;
  if (!user?.isMock) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' }}><Text style={{ color: '#475569', textAlign: 'center' }}>This review area is available from the development doctor login.</Text>{button('Back to dashboard', () => router.replace('/(doctor)/home'))}</View>;

  return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 48, paddingBottom: 40, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 760, gap: 12 }}>
        <View style={card}>
          <TouchableOpacity accessibilityRole="button" onPress={() => patientId ? setPatientId('') : router.back()} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6 }}><ArrowLeft size={18} color="#047857"/><Text style={{ color: '#047857', fontWeight: '700' }}>{patientId ? 'All mothers' : 'Doctor dashboard'}</Text></TouchableOpacity>
          <Text style={{ color: '#0F172A', fontSize: 22, fontWeight: '800' }}>Mother Nutrition & Camera Data Review</Text>
          <Text style={muted}>Development preview using saved meal scans and food diary records.</Text>
          {!patientId && <View style={{ minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}><Search size={17} color="#64748B"/><TextInput value={query} onChangeText={setQuery} placeholder="Search mothers by name" style={{ flex: 1, marginLeft: 9, color: '#0F172A' }}/><TouchableOpacity onPress={() => setReload((n) => n + 1)}><RefreshCw size={17} color="#047857"/></TouchableOpacity></View>}
        </View>
        {error ? <View style={card}><Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 13 }}>{error}</Text>{button('Retry', () => setReload((n) => n + 1), <RefreshCw size={14} color="#047857"/>)}</View> : null}
        {warning ? <View style={{ ...card, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}><Text style={{ color: '#92400E', fontSize: 12 }}>{warning}</Text></View> : null}
        {loading && <View style={card}><ActivityIndicator color="#047857"/></View>}
        {!patientId && !loading && <View style={card}>
          <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>{filteredUsers.length} mothers</Text>
          {filteredUsers.length ? filteredUsers.map((mother) => <TouchableOpacity key={mother.id} accessibilityRole="button" onPress={() => setPatientId(mother.id)} style={{ minHeight: 72, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}><Users size={19} color="#047857"/></View><View style={{ flex: 1 }}><Text style={{ color: '#0F172A', fontWeight: '700' }}>{mother.full_name || 'Unnamed mother'}</Text><Text style={muted}>Week {mother.gestational_week ?? '—'} · {mother.email}</Text></View><ChevronRight size={18} color="#94A3B8"/></TouchableOpacity>) : <Text style={muted}>No mothers match this search.</Text>}
        </View>}
        {!!patientId && !loading && <>
          <View style={card}><Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '800' }}>{users.find((mother) => mother.id === patientId)?.full_name ?? 'Mother profile'}</Text><Text style={muted}>Week {users.find((mother) => mother.id === patientId)?.gestational_week ?? '—'} · {users.find((mother) => mother.id === patientId)?.email}</Text><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1, borderRadius: 12, backgroundColor: '#ECFDF5', padding: 12 }}><Text style={{ color: '#047857', fontSize: 19, fontWeight: '800' }}>{meals.length}</Text><Text style={muted}>Saved meals</Text></View><View style={{ flex: 1, borderRadius: 12, backgroundColor: '#ECFDF5', padding: 12 }}><Text style={{ color: '#047857', fontSize: 19, fontWeight: '800' }}>{meals.reduce((n, meal) => n + meal.food_diary_items.length, 0)}</Text><Text style={muted}>Detected foods recorded</Text></View></View><Text style={muted}>Only meal scans that were saved to the Food Diary appear here.</Text></View>
          <View style={card}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{button('Previous week', () => { const next = mondayOf(shiftLocalDate(weekStart, -7)); setWeekStart(next); setSelectedDate(next); }, <ChevronLeft size={14} color="#047857"/>)}<Text style={{ color: '#0F172A', fontWeight: '700' }}>Weekly food and nutrition</Text>{button('Next week', () => { const next = mondayOf(shiftLocalDate(weekStart, 7)); setWeekStart(next); setSelectedDate(next); }, <ChevronRight size={14} color="#047857"/>)}</View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{DIARY_NUTRIENTS.map((nutrient) => <TouchableOpacity key={nutrient.key} onPress={() => setNutrientKey(nutrient.key)} style={{ paddingHorizontal: 9, minHeight: 36, justifyContent: 'center', borderRadius: 9, backgroundColor: nutrientKey === nutrient.key ? '#CCFBF1' : '#F1F5F9' }}><Text style={{ color: '#047857', fontSize: 11, fontWeight: '700' }}>{nutrient.short}</Text></TouchableOpacity>)}</View><WeekChart days={week} selected={selectedDay?.date ?? selectedDate} onSelect={setSelectedDate} nutrientKey={nutrientKey}/><Text style={muted}>Recorded estimated {DIARY_NUTRIENTS.find((entry) => entry.key === nutrientKey)?.label.toLowerCase()} by day. Missing values are not counted as zero.</Text></View>
          {selectedDay && <View style={card}><Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>{new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {selectedDay.mealCount} meals · {selectedDay.foodCount} foods</Text>{selectedDay.meals.length ? <MealList meals={selectedDay.meals}/> : <Text style={muted}>No saved food detection or meal records for this day.</Text>}</View>}
          <View style={card}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '700' }}>User-created nutrition labels</Text><Text style={muted}>{foods.length}</Text></View><Text style={muted}>Verify or reject each mother-entered label. Rejected labels are excluded from previous diary totals by the database workflow.</Text>{foods.length === 0 ? <Text style={muted}>No custom labels for this user.</Text> : foods.map((food) => <View key={food.id} style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, gap: 7 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ flex: 1, color: '#0F172A', fontWeight: '700' }}>{food.display_name}</Text><Text style={{ color: food.verification_status === 'verified' ? '#047857' : food.verification_status === 'rejected' ? '#B91C1C' : '#B45309', fontSize: 11, fontWeight: '700' }}>{food.verification_status}</Text></View><Text style={muted}>{[food.english_name, food.sinhala_name, food.category, food.serving_unit && `Per ${food.serving_unit}`].filter(Boolean).join(' · ') || 'No extra label details'}</Text><Text style={{ color: '#475569', fontSize: 12 }}>Carbs {food.carbs_g ?? '—'} g · Sugar {food.sugar_g ?? '—'} g · Fiber {food.fiber_g ?? '—'} g · Fat {food.fat_g ?? '—'} g · Iron {food.iron_mg ?? '—'} mg · Calcium {food.calcium_mg ?? '—'} mg</Text>{Object.keys(food.other_nutrients ?? {}).length > 0 && <Text style={muted}>Other: {Object.entries(food.other_nutrients).map(([key, value]) => `${key} ${value ?? '—'}`).join(' · ')}</Text>}<View style={{ flexDirection: 'row', gap: 8 }}>{button(savingId === food.id ? 'Saving…' : 'Approve', () => void changeStatus(food, 'verified'), <Utensils size={14} color="#047857"/>)}{button('Reject', () => void changeStatus(food, 'rejected'))}</View></View>)}</View>
        </>}
      </View>
    </ScrollView>
  </View>;
}
