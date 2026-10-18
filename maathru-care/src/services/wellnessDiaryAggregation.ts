import type { SavedDiaryItem, SavedDiaryMeal } from './foodDiaryService';

export const DIARY_NUTRIENTS = [
  { key: 'carbs_g', label: 'Carbohydrates', short: 'Carbs', unit: 'g', color: '#D97706' },
  { key: 'sugar_g', label: 'Total sugar', short: 'Sugar', unit: 'g', color: '#DB2777' },
  { key: 'fiber_g', label: 'Fiber', short: 'Fiber', unit: 'g', color: '#059669' },
  { key: 'fat_g', label: 'Fat', short: 'Fat', unit: 'g', color: '#EA580C' },
  { key: 'iron_mg', label: 'Iron', short: 'Iron', unit: 'mg', color: '#DC2626' },
  { key: 'calcium_mg', label: 'Calcium', short: 'Calcium', unit: 'mg', color: '#2563EB' },
] as const;
export type DiaryNutrientKey = (typeof DIARY_NUTRIENTS)[number]['key'];
export type RecordedTotal = { value: number | null; knownItems: number; itemCount: number; partial: boolean };
export type DiaryDay = {
  date: string; meals: SavedDiaryMeal[]; mealCount: number; foodCount: number;
  lastUpdated: string | null; nutrients: Record<DiaryNutrientKey, RecordedTotal>;
};

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseLocalDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error('Invalid diary date');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (localDateString(date) !== iso) throw new Error('Invalid diary date');
  return date;
}
export function shiftLocalDate(iso: string, days: number): string {
  const date = parseLocalDate(iso);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}
export function mondayOf(iso: string): string {
  const weekday = parseLocalDate(iso).getDay();
  return shiftLocalDate(iso, -(weekday === 0 ? 6 : weekday - 1));
}
export function weekDates(monday: string): string[] {
  const start = mondayOf(monday);
  return Array.from({ length: 7 }, (_, index) => shiftLocalDate(start, index));
}
export function recordedNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
export function nutrientTotal(items: readonly SavedDiaryItem[], key: DiaryNutrientKey): RecordedTotal {
  let sum = 0;
  let knownItems = 0;
  for (const item of items) {
    const value = recordedNumber(item[key]);
    if (value !== null) { sum += value; knownItems++; }
  }
  return { value: knownItems ? sum : null, knownItems, itemCount: items.length, partial: knownItems < items.length };
}
export function aggregateDiaryDay(date: string, allMeals: readonly SavedDiaryMeal[]): DiaryDay {
  const meals = allMeals.filter((meal) => meal.logged_date === date);
  const items = meals.flatMap((meal) => meal.food_diary_items ?? []);
  const nutrients = {} as Record<DiaryNutrientKey, RecordedTotal>;
  for (const nutrient of DIARY_NUTRIENTS) nutrients[nutrient.key] = nutrientTotal(items, nutrient.key);
  const lastUpdated = meals.map((meal) => meal.created_at).filter(Boolean).sort().at(-1) ?? null;
  return { date, meals, mealCount: meals.length, foodCount: items.length, lastUpdated, nutrients };
}
export function aggregateDiaryWeek(monday: string, meals: readonly SavedDiaryMeal[]): DiaryDay[] {
  return weekDates(monday).map((date) => aggregateDiaryDay(date, meals));
}
