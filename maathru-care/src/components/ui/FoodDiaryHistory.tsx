import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { foodDiaryService, type SavedDiaryMeal } from '@/services/foodDiaryService';

const nutrientRows = [
  ['carbs_g', 'Carbs', 'g'], ['sugar_g', 'Total sugar', 'g'], ['fiber_g', 'Fiber', 'g'],
  ['fat_g', 'Fat', 'g'], ['iron_mg', 'Iron', 'mg'], ['calcium_mg', 'Calcium', 'mg'],
] as const;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const shiftDate = (iso: string, amount: number) => { const [y, m, d] = iso.split('-').map(Number); const date = new Date(y, m - 1, d + amount); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const prettyDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }); };

export function FoodDiaryHistory({ date, refreshKey, signedIn, setupReady, onSignIn, openAllOnMount = false }: {
  date: string; refreshKey: number; signedIn: boolean; setupReady: boolean; onSignIn: () => void; openAllOnMount?: boolean;
}) {
  const [meals, setMeals] = useState<SavedDiaryMeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [historyDate, setHistoryDate] = useState(date);
  const [historyMeals, setHistoryMeals] = useState<SavedDiaryMeal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => { if (openAllOnMount) { setHistoryDate(date); setShowAll(true); } }, [openAllOnMount, date]);

  const load = useCallback(async (selectedDate: string, full = false) => {
    if (!signedIn || !setupReady) {
      if (full) { setHistoryMeals([]); setHistoryError(''); }
      else { setMeals([]); setError(''); }
      return;
    }
    if (full) { setHistoryLoading(true); setHistoryError(''); }
    else { setLoading(true); setError(''); }
    try {
      const result = await foodDiaryService.getMealsForDate(selectedDate);
      if (full) setHistoryMeals(result); else setMeals(result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load diary history.';
      if (full) setHistoryError(message); else setError(message);
    } finally { if (full) setHistoryLoading(false); else setLoading(false); }
  }, [setupReady, signedIn]);

  useEffect(() => { void load(date); }, [date, refreshKey, reloadKey, load]);
  useEffect(() => { if (showAll) void load(historyDate, true); }, [historyDate, showAll, reloadKey, load]);

  const renderMeal = (meal: SavedDiaryMeal, detailed: boolean) => <View key={meal.id} style={{ borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 10, gap: 7 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: '#065F46', fontWeight: '700', flex: 1 }}>{meal.meal_type}</Text>
      {detailed && <Text style={{ color: '#64748B', fontSize: 12 }}>{new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
    </View>
    {meal.food_diary_items.map((item) => {
      const quantity = item.portion_amount === null ? 'Amount unknown' : `${item.portion_amount} ${item.portion_unit}`;
      const nutrients = nutrientRows.map(([key, label, unit]) => {
        const amount = item[key];
        return amount === null ? `${label} unavailable` : `${label} ${Number(amount).toFixed(1)} ${unit}`;
      }).join(' · ');
      return <View key={item.id} style={{ paddingLeft: 8, gap: 3 }}>
        <Text style={{ color: '#334155', fontWeight: '600' }}>{item.item_name} · {quantity}</Text>
        {detailed && <Text style={{ color: '#64748B', fontSize: 12 }}>{nutrients}</Text>}
        {detailed && <Text style={{ color: '#94A3B8', fontSize: 11 }}>Nutrient values are estimates when available.</Text>}
      </View>;
    })}
  </View>;

  return <View style={{ marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }} testID="food-diary-history">
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 16, color: '#334155', fontWeight: '700' }}>Saved on this date</Text><Text style={{ color: '#64748B', fontSize: 12 }}>{prettyDate(date)} · {meals.length} {meals.length === 1 ? 'meal' : 'meals'}</Text></View>
      {signedIn && <TouchableOpacity accessibilityRole="button" onPress={() => setReloadKey((n) => n + 1)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#047857', fontWeight: '600' }}>Refresh</Text></TouchableOpacity>}
    </View>
    {!signedIn ? <TouchableOpacity accessibilityRole="button" onPress={onSignIn}><Text style={{ color: '#64748B' }}>Sign in to see your saved diary meals.</Text></TouchableOpacity>
      : !setupReady ? <Text style={{ color: '#64748B' }}>Diary history will load after the database setup is verified.</Text>
      : loading ? <View accessibilityLabel="Loading saved meals" style={{ gap: 8, paddingVertical: 6 }}>{[0, 1, 2].map((n) => <View key={n} style={{ height: 16, width: n === 2 ? '62%' : '88%', borderRadius: 8, backgroundColor: '#E2E8F0' }} />)}</View>
      : error ? <View><Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text><TouchableOpacity onPress={() => setReloadKey((n) => n + 1)}><Text style={{ color: '#047857', paddingTop: 8 }}>Try again</Text></TouchableOpacity></View>
      : meals.length === 0 ? <Text style={{ color: '#64748B' }}>No saved meals for this date.</Text>
      : <>{meals.slice(0, 3).map((meal) => renderMeal(meal, false))}{meals.length > 3 && <Text style={{ color: '#64748B', fontSize: 12 }}>+ {meals.length - 3} more meals</Text>}</>}
    {meals.length > 0 && <TouchableOpacity accessibilityRole="button" onPress={() => { setHistoryDate(date); setShowAll(true); }} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={{ color: '#047857', fontWeight: '700' }}>View All ({meals.length})</Text></TouchableOpacity>}
    <Modal visible={showAll} animationType="slide" onRequestClose={() => setShowAll(false)}>
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: 50 }}>
        <View style={{ paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><Text style={{ fontSize: 22, color: '#0F172A', fontWeight: '700' }}>Food Diary</Text><Text style={{ color: '#64748B' }}>{prettyDate(historyDate)}</Text></View>
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowAll(false)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#047857', fontWeight: '700' }}>Close</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 }}>
          <TouchableOpacity accessibilityRole="button" onPress={() => setHistoryDate((d) => shiftDate(d, -1))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#047857' }}>‹ Previous day</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => void load(historyDate, true)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#047857' }}>Refresh</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => setHistoryDate((d) => shiftDate(d, 1))} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#047857' }}>Next day ›</Text></TouchableOpacity>
        </View>
        {historyLoading ? <View accessibilityLabel="Loading diary history" style={{ gap: 12, padding: 20 }}>{[0, 1, 2].map((n) => <View key={n} style={{ height: 90, borderRadius: 14, backgroundColor: '#E2E8F0' }} />)}</View> : historyError ? <View style={{ padding: 20 }}><Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{historyError}</Text><TouchableOpacity onPress={() => void load(historyDate, true)}><Text style={{ color: '#047857', paddingTop: 10 }}>Try again</Text></TouchableOpacity></View> : historyMeals.length === 0 ? <Text style={{ color: '#64748B', textAlign: 'center', padding: 28 }}>No saved meals for this date.</Text> : <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>{historyMeals.map((meal) => <View key={meal.id} style={{ backgroundColor: '#FFF', padding: 14, borderRadius: 16, gap: 8 }}>{renderMeal(meal, true)}</View>)}</ScrollView>}
      </View>
    </Modal>
  </View>;
}
