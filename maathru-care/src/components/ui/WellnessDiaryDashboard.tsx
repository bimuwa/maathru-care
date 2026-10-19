import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { foodDiaryService, type SavedDiaryMeal } from '@/services/foodDiaryService';
import {
  DIARY_NUTRIENTS, aggregateDiaryDay, aggregateDiaryWeek, localDateString, mondayOf,
  parseLocalDate, shiftLocalDate, recordedNumber, isUnverifiedCustomFood, isRejectedCustomFood, diaryReportCsv, type DiaryDay, type DiaryNutrientKey,
} from '@/services/wellnessDiaryAggregation';

type Mode = 'daily' | 'weekly';
const mealOrder = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];
const card = { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', gap: 9 } as const;
const muted = { color: '#64748B', fontSize: 12, lineHeight: 18 } as const;
const title = { color: '#0F172A', fontSize: 17, fontWeight: '700' as const };
const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => parseLocalDate(iso).toLocaleDateString('en-GB', options);
const formatTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
const formatDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not available';
const nutrient = (key: DiaryNutrientKey) => DIARY_NUTRIENTS.find((item) => item.key === key)!;
const showValue = (value: number | null, unit: string) => value === null ? 'Not available' : `${value.toFixed(1)} ${unit}`;

function BarRow({ label, value, maximum, unit, color, note }: { label: string; value: number | null; maximum: number; unit: string; color: string; note?: string }) {
  return <View style={{ gap: 4 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: '#334155', fontSize: 12, fontWeight: '600', flex: 1 }}>{label}</Text>
      <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>{showValue(value, unit)}</Text>
    </View>
    <View style={{ height: 8, borderRadius: 5, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
      {value !== null && value > 0 && <View style={{ width: `${Math.max(2, value / Math.max(maximum, 1) * 100)}%`, height: 8, borderRadius: 5, backgroundColor: color }} />}
    </View>
    {note && <Text style={muted}>{note}</Text>}
  </View>;
}

export function NutrientBars({ day, keys }: { day: DiaryDay; keys: readonly DiaryNutrientKey[] }) {
  const maximum = Math.max(1, ...keys.map((key) => day.nutrients[key].value ?? 0));
  return <View style={{ gap: 12 }}>{keys.map((key) => {
    const definition = nutrient(key);
    const total = day.nutrients[key];
    return <BarRow key={key} label={definition.label} value={total.value} maximum={maximum} unit={definition.unit} color={definition.color}
      note={total.partial ? `Partial coverage · ${total.knownItems} of ${total.itemCount} foods have this value` : undefined} />;
  })}</View>;
}

export function MealList({ meals }: { meals: readonly SavedDiaryMeal[] }) {
  return <View style={{ gap: 10 }}>{[...meals].sort((a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type) || a.created_at.localeCompare(b.created_at)).map((meal) =>
    <View key={meal.id} style={{ padding: 11, borderRadius: 12, backgroundColor: '#F8FAFC', gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color: '#065F46', fontWeight: '700', flex: 1 }}>{meal.meal_type}</Text>
        <Text style={muted}>{formatTime(meal.created_at)}</Text>
      </View>
      {meal.food_diary_items.map((item) => {
        const available = DIARY_NUTRIENTS.filter((entry) => recordedNumber(item[entry.key]) !== null);
        return <View key={item.id} style={{ paddingTop: 5, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 3 }}>
          <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 13 }}>{item.item_name} · {item.portion_amount === null ? 'Amount unavailable' : `${item.portion_amount} ${item.portion_unit ?? ''}`}</Text>
          {item.food_id?.startsWith('custom_') && item.custom_food_verification_status && <Text style={{ color: item.custom_food_verification_status === 'verified' ? '#047857' : item.custom_food_verification_status === 'rejected' ? '#B91C1C' : '#92400E', fontSize: 11, fontWeight: '700' }}>Custom food · {item.custom_food_verification_status === 'verified' ? 'Verified' : item.custom_food_verification_status === 'rejected' ? 'Rejected' : 'Not verified'}</Text>}
          <Text style={muted}>{item.custom_food_verification_status === 'rejected' ? 'Excluded from nutrient totals after doctor rejection' : available.length ? available.map((entry) => `${entry.short} ${showValue(recordedNumber(item[entry.key]), entry.unit)}`).join(' · ') : 'Nutrient estimates unavailable'}</Text>
        </View>;
      })}
    </View>)}</View>;
}

export function WeekChart({ days, selected, onSelect, nutrientKey }: { days: DiaryDay[]; selected: string; onSelect: (date: string) => void; nutrientKey: DiaryNutrientKey }) {
  const values = days.map((day) => day.nutrients[nutrientKey].value);
  const maximum = Math.max(1, ...values.map((value) => value ?? 0));
  const definition = nutrient(nutrientKey);
  return <View style={{ flexDirection: 'row', gap: 3, minHeight: 156 }}>
    {days.map((day) => {
      const value = day.nutrients[nutrientKey].value;
      const hasRecords = day.mealCount > 0;
      return <TouchableOpacity key={day.date} accessibilityRole="button" accessibilityLabel={`${formatDate(day.date)}: ${hasRecords ? showValue(value, definition.unit) : 'No records'}`} onPress={() => onSelect(day.date)}
        style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingVertical: 6, borderRadius: 9, backgroundColor: selected === day.date ? '#ECFDF5' : 'transparent' }}>
        <Text style={{ color: hasRecords ? '#334155' : '#94A3B8', fontSize: 10, fontWeight: '600' }}>{!hasRecords ? '—' : value === null ? '?' : value.toFixed(0)}</Text>
        <View style={{ width: '65%', maxWidth: 22, height: 88, borderRadius: 5, backgroundColor: hasRecords ? '#F1F5F9' : '#F8FAFC', justifyContent: 'flex-end', overflow: 'hidden' }}>
          {value !== null && value > 0 && <View style={{ height: `${Math.max(3, value / maximum * 100)}%`, backgroundColor: definition.color, borderRadius: 5 }} />}
        </View>
        <Text style={{ color: selected === day.date ? '#047857' : '#64748B', fontSize: 10, fontWeight: '700' }}>{formatDate(day.date, { weekday: 'short' })}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 10 }}>{parseLocalDate(day.date).getDate()}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

export function WellnessDiaryDashboard({ mode, onModeChange, initialDate }: { mode: Mode; onModeChange: (mode: Mode) => void; initialDate?: string }) {
  const router = useRouter();
  const today = localDateString(new Date());
  const validInitialDate = (() => { try { return initialDate ? localDateString(parseLocalDate(initialDate)) : today; } catch { return today; } })();
  const [selectedDate, setSelectedDate] = useState(validInitialDate);
  const [weekStart, setWeekStart] = useState(mondayOf(validInitialDate));
  const [selectedWeekDay, setSelectedWeekDay] = useState(validInitialDate);
  const [selectedNutrient, setSelectedNutrient] = useState<DiaryNutrientKey>('carbs_g');
  const [selectedMineral, setSelectedMineral] = useState<DiaryNutrientKey>('iron_mg');
  const [showDetails, setShowDetails] = useState(false);
  const [meals, setMeals] = useState<SavedDiaryMeal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestVersion = useRef(0);
  const queryKey = mode === 'daily' ? selectedDate : weekStart;
  const weeklyMacro = DIARY_NUTRIENTS.slice(0, 4).some((entry) => entry.key === selectedNutrient) ? selectedNutrient : 'carbs_g';

  const exportReport = async (days: DiaryDay[], period: 'daily' | 'weekly') => {
    setExportError('');
    const fileName = `maternal-wellness-${period}-${days[0]?.date ?? today}.csv`;
    const csv = diaryReportCsv(`Maternal Wellness ${period} report`, days);
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: fileName, message: csv });
      }
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : 'Could not export this report.');
    }
  };
  const reportButton = (label: string, onPress: () => void) => <TouchableOpacity accessibilityRole="button" onPress={onPress} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#047857', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{label}</Text></TouchableOpacity>;

  useEffect(() => {
    if (!initialDate) return;
    try {
      const next = localDateString(parseLocalDate(initialDate));
      setSelectedDate(next);
      setWeekStart(mondayOf(next));
      setSelectedWeekDay(next);
    } catch { /* Ignore invalid navigation parameters. */ }
  }, [initialDate]);

  useFocusEffect(useCallback(() => {
    const version = ++requestVersion.current;
    setLoading(true);
    setMeals(null);
    setError('');
    void (async () => {
      const session = await foodDiaryService.getSession();
      if (!session?.user?.id) { if (requestVersion.current === version) { setSignedIn(false); setMeals([]); setLoading(false); } return; }
      if (requestVersion.current === version) setSignedIn(true);
      const result = mode === 'daily' ? await foodDiaryService.getMealsForDate(queryKey)
        : await foodDiaryService.getMealsForRange(queryKey, shiftLocalDate(queryKey, 6));
      if (requestVersion.current === version) { setSignedIn(true); setMeals(result); setLoading(false); }
    })().catch((cause) => {
      if (requestVersion.current === version) { setError(cause instanceof Error ? cause.message : 'Could not load Food Diary data.'); setLoading(false); }
    });
    return () => { requestVersion.current++; };
  }, [mode, queryKey, refresh]));

  const goToScanner = () => router.push({ pathname: '/meal-scan', params: { date: mode === 'daily' ? selectedDate : selectedWeekDay } });
  const goToDiary = () => router.push({ pathname: '/meal-scan', params: { date: mode === 'daily' ? selectedDate : selectedWeekDay, viewDiary: '1' } });
  const frame = (children: React.ReactNode) => <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110, alignItems: 'center' }}><View style={{ width: '100%', maxWidth: 640, gap: 12 }}>{children}</View></ScrollView>;
  const navButton = (label: string, onPress: () => void) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#FFFFFF' }}><Text style={{ color: '#047857', fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
  const navigation = mode === 'daily'
    ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        {navButton('‹', () => setSelectedDate(shiftLocalDate(selectedDate, -1)))}
        <View style={{ alignItems: 'center', flex: 1 }}><Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 15 }}>{formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</Text>{selectedDate !== today && navButton('Today', () => setSelectedDate(localDateString(new Date())))}</View>
        {navButton('›', () => setSelectedDate(shiftLocalDate(selectedDate, 1)))}
      </View>
    : <View style={{ gap: 4 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        {navButton('‹', () => { const next = shiftLocalDate(weekStart, -7); setWeekStart(next); setSelectedWeekDay(next); })}
        <Text style={{ color: '#0F172A', fontWeight: '700', fontSize: 14, textAlign: 'center', flex: 1 }}>{formatDate(weekStart)} – {formatDate(shiftLocalDate(weekStart, 6))}</Text>
        {navButton('›', () => { const next = shiftLocalDate(weekStart, 7); setWeekStart(next); setSelectedWeekDay(next); })}
      </View>{weekStart !== mondayOf(today) && navButton('Current week', () => { const next = mondayOf(localDateString(new Date())); setWeekStart(next); setSelectedWeekDay(localDateString(new Date())); })}</View>;

  if (loading) return frame(<>{navigation}<View style={card}><ActivityIndicator color="#059669" /><Text style={muted}>Loading saved Food Diary records…</Text></View></>);
  if (!signedIn) return frame(<>{navigation}<View style={card}><Text style={title}>Sign in to view Maternal Wellness</Text><Text style={muted}>Your recorded meals are available after Food Diary sign-in.</Text></View></>);
  if (error) return frame(<>{navigation}<View style={card}><Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text>{navButton('Try again', () => setRefresh((value) => value + 1))}</View></>);

  if (mode === 'daily') {
    const day = aggregateDiaryDay(selectedDate, meals ?? []);
    const dayItems = day.meals.flatMap((meal) => meal.food_diary_items);
    const unverifiedCount = dayItems.filter(isUnverifiedCustomFood).length;
    const rejectedCount = dayItems.filter(isRejectedCustomFood).length;
    const contributionMeals = mealOrder.map((type) => ({ type, meals: day.meals.filter((meal) => meal.meal_type === type) }));
    const contributions = contributionMeals.map(({ type, meals: group }) => ({ type, total: aggregateDiaryDay(selectedDate, group).nutrients[selectedNutrient] }));
    const maximum = Math.max(1, ...contributions.map((entry) => entry.total.value ?? 0));
    return frame(<>{navigation}
      {day.mealCount === 0 ? <View style={card}><Text style={title}>No meals recorded for this date</Text><Text style={muted}>There are no Food Diary records for {formatDate(selectedDate)}. This does not describe everything eaten that day.</Text>{navButton('Log a meal', goToScanner)}{reportButton('Download daily report (CSV)', () => void exportReport([day], 'daily'))}{Boolean(exportError) && <Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 12 }}>{exportError}</Text>}</View> : <>
        <View style={card}><Text style={title}>Daily recorded overview</Text><Text style={muted}>{formatDate(selectedDate)} · Last updated {formatTime(day.lastUpdated) ?? 'Not available'}</Text><View style={{ flexDirection: 'row', gap: 8 }}>
          {[['Meals logged', day.mealCount], ['Foods recorded', day.foodCount]].map(([label, value]) => <View key={label} style={{ flex: 1, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12 }}><Text style={{ color: '#047857', fontSize: 20, fontWeight: '700' }}>{value}</Text><Text style={muted}>{label}</Text></View>)}
        </View><Text style={muted}>Nutrients are estimates from recorded foods only. Missing values can make totals partial. Calorie totals are unavailable.</Text>
          {unverifiedCount > 0 && <View accessibilityRole="alert" style={{ padding: 10, backgroundColor: '#FFFBEB', borderRadius: 10 }}><Text style={{ color: '#92400E', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{unverifiedCount} custom food {unverifiedCount === 1 ? 'entry has' : 'entries have'} nutrition data that has not been verified by a doctor. These values are included in recorded totals and the report, and should be treated as unconfirmed.</Text></View>}
          {rejectedCount > 0 && <View accessibilityRole="alert" style={{ padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10 }}><Text style={{ color: '#991B1B', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{rejectedCount} custom food {rejectedCount === 1 ? 'entry was' : 'entries were'} rejected by your doctor. It is excluded from nutrient totals and cannot be added to new meals.</Text></View>}
          {reportButton('Download daily report (CSV)', () => void exportReport([day], 'daily'))}{Boolean(exportError) && <Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 12 }}>{exportError}</Text>}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{DIARY_NUTRIENTS.map((entry) => <View key={entry.key} style={{ flexBasis: '47%', flexGrow: 1, minWidth: 128, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 11, gap: 4 }}><View style={{ width: 20, height: 4, backgroundColor: entry.color, borderRadius: 3 }} /><Text style={muted}>{entry.label}</Text><Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '700' }}>{showValue(day.nutrients[entry.key].value, entry.unit)}</Text>{day.nutrients[entry.key].partial && <Text style={muted}>Partial coverage</Text>}</View>)}</View>
        <View style={card}><Text style={title}>Macronutrient estimates</Text><Text style={muted}>Sugar is part of carbohydrates; bars show separate recorded values in grams.</Text><NutrientBars day={day} keys={['carbs_g', 'sugar_g', 'fiber_g', 'fat_g']} /></View>
        <View style={card}><Text style={title}>Mineral estimates</Text><NutrientBars day={day} keys={['iron_mg', 'calcium_mg']} /></View>
        <View style={card}><Text style={title}>Contribution by meal</Text><Text style={muted}>Recorded estimates for {nutrient(selectedNutrient).label.toLowerCase()} ({nutrient(selectedNutrient).unit})</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{DIARY_NUTRIENTS.map((entry) => <TouchableOpacity key={entry.key} accessibilityRole="button" onPress={() => setSelectedNutrient(entry.key)} style={{ minHeight: 40, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', backgroundColor: selectedNutrient === entry.key ? '#CCFBF1' : '#F1F5F9' }}><Text style={{ color: selectedNutrient === entry.key ? '#047857' : '#475569', fontSize: 12, fontWeight: '600' }}>{entry.short}</Text></TouchableOpacity>)}</View>{contributions.map((entry) => <BarRow key={entry.type} label={entry.type} value={entry.total.value} maximum={maximum} unit={nutrient(selectedNutrient).unit} color={nutrient(selectedNutrient).color} note={entry.total.itemCount === 0 ? 'No records' : entry.total.partial ? 'Partial coverage' : undefined} />)}</View>
        <View style={card}><Text style={title}>Foods Eaten Today</Text><MealList meals={day.meals} />{navButton('View All Meals in Food Diary', goToDiary)}</View>
        <View style={card}><TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(!showDetails)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={title}>Detailed nutrient breakdown {showDetails ? '⌃' : '⌄'}</Text></TouchableOpacity>{showDetails && DIARY_NUTRIENTS.map((entry) => <View key={entry.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 5 }}><Text style={{ color: '#334155', flex: 1 }}>{entry.label}</Text><Text style={{ color: '#0F172A', fontWeight: '600' }}>{showValue(day.nutrients[entry.key].value, entry.unit)}{day.nutrients[entry.key].partial ? ' · partial' : ''}</Text></View>)}</View>
        <Text style={[muted, { paddingHorizontal: 4 }]}>These are estimated recorded amounts, not a measure of total dietary intake or a medical assessment.</Text>
      </>}
    </>);
  }

  const days = aggregateDiaryWeek(weekStart, meals ?? []);
  const selected = days.find((day) => day.date === selectedWeekDay) ?? days[0];
  const loggedDays = days.filter((day) => day.mealCount > 0).length;
  const allMeals = days.flatMap((day) => day.meals);
  const allItems = allMeals.flatMap((meal) => meal.food_diary_items);
  const unverifiedCount = allItems.filter(isUnverifiedCustomFood).length;
  const rejectedCount = allItems.filter(isRejectedCustomFood).length;
  const partial = DIARY_NUTRIENTS.some((entry) => days.some((day) => day.nutrients[entry.key].partial));
  const latest = allMeals.map((meal) => meal.created_at).filter(Boolean).sort().at(-1) ?? null;
  return frame(<>{navigation}
    {allMeals.length === 0 && <View style={card}><Text style={title}>No meals recorded for this week</Text><Text style={muted}>No Food Diary records are available for these dates. This does not describe all food eaten.</Text></View>}
    <View style={card}><Text style={title}>Weekly recorded overview</Text><Text style={muted}>{loggedDays} of 7 days have meal records · {allMeals.length} meals · {allItems.length} foods</Text><Text style={muted}>Last available update: {formatDateTime(latest)}. Days without records are unknown, not measured zero intake.{partial ? ' Some nutrient totals have partial coverage.' : ''}</Text>
      {unverifiedCount > 0 && <View accessibilityRole="alert" style={{ padding: 10, backgroundColor: '#FFFBEB', borderRadius: 10 }}><Text style={{ color: '#92400E', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{unverifiedCount} custom food {unverifiedCount === 1 ? 'entry has' : 'entries have'} nutrition data that has not been verified by a doctor. It is included in this report and should be treated as unconfirmed.</Text></View>}
      {rejectedCount > 0 && <View accessibilityRole="alert" style={{ padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10 }}><Text style={{ color: '#991B1B', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{rejectedCount} custom food {rejectedCount === 1 ? 'entry was' : 'entries were'} rejected by your doctor. It is excluded from nutrient totals and cannot be added to new meals.</Text></View>}
      {reportButton('Download weekly report (CSV)', () => void exportReport(days, 'weekly'))}{Boolean(exportError) && <Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 12 }}>{exportError}</Text>}
    </View>
    <View style={card}><Text style={title}>Seven-day nutrient trend</Text><Text style={muted}>Select a nutrient, then tap a day for its records.</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{DIARY_NUTRIENTS.slice(0, 4).map((entry) => <TouchableOpacity key={entry.key} accessibilityRole="button" onPress={() => setSelectedNutrient(entry.key)} style={{ minHeight: 40, paddingHorizontal: 9, borderRadius: 10, justifyContent: 'center', backgroundColor: weeklyMacro === entry.key ? '#CCFBF1' : '#F1F5F9' }}><Text style={{ color: '#047857', fontSize: 12 }}>{entry.short}</Text></TouchableOpacity>)}</View><WeekChart days={days} selected={selected.date} onSelect={setSelectedWeekDay} nutrientKey={weeklyMacro} /><Text style={muted}>— No records · ? nutrient unavailable · values in grams. Partial days are identified below.</Text></View>
    <View style={card}><Text style={title}>Mineral estimates</Text><View style={{ flexDirection: 'row', gap: 6 }}>{DIARY_NUTRIENTS.slice(4).map((entry) => <TouchableOpacity key={entry.key} accessibilityRole="button" onPress={() => setSelectedMineral(entry.key)} style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, backgroundColor: selectedMineral === entry.key ? '#CCFBF1' : '#F1F5F9' }}><Text style={{ color: '#047857' }}>{entry.short}</Text></TouchableOpacity>)}</View><WeekChart days={days} selected={selected.date} onSelect={setSelectedWeekDay} nutrientKey={selectedMineral} /><Text style={muted}>Values in milligrams. Missing estimates are not plotted as zero.</Text></View>
    <View style={card}><Text style={title}>{formatDate(selected.date, { weekday: 'long', day: 'numeric', month: 'short' })} · day details</Text><Text style={muted}>{selected.mealCount ? `${selected.mealCount} meals · ${selected.foodCount} foods` : 'No meal records for this day'}</Text>{selected.mealCount > 0 && <><NutrientBars day={selected} keys={DIARY_NUTRIENTS.map((entry) => entry.key)} /><MealList meals={selected.meals} /></>}{navButton('View Day', () => { setSelectedDate(selected.date); onModeChange('daily'); })}</View>
    <View style={card}><Text style={title}>Weekly meal breakdown</Text>{days.map((day) => <View key={day.date} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}><Text style={{ color: '#334155', fontWeight: '600' }}>{formatDate(day.date)} · {day.mealCount ? `${day.mealCount} meals, ${day.foodCount} foods` : 'No records'}</Text>{day.mealCount > 0 && <Text style={muted}>{day.meals.map((meal) => meal.meal_type).join(' · ')} · {day.meals.flatMap((meal) => meal.food_diary_items).slice(0, 3).map((item) => item.item_name).join(', ')}{day.foodCount > 3 ? ` +${day.foodCount - 3} more` : ''}{DIARY_NUTRIENTS.some((entry) => day.nutrients[entry.key].partial) ? ' · Partial nutrient coverage' : ''}</Text>}</View>)}</View>
    <View style={card}><Text style={title}>From your records</Text><Text style={muted}>Meals were logged on {loggedDays} of 7 days.{partial ? ' Some nutrient values are unavailable, so recorded totals may be incomplete.' : ''}</Text></View>
  </>);
}
