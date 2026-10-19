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

export function isUnverifiedCustomFood(item: SavedDiaryItem): boolean {
  return Boolean(item.food_id?.startsWith('custom_') && (item.custom_food_verification_status === 'unverified' || item.custom_food_verification_status === null));
}

export function isRejectedCustomFood(item: SavedDiaryItem): boolean {
  return Boolean(item.food_id?.startsWith('custom_') && item.custom_food_verification_status === 'rejected');
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function diaryReportCsv(title: string, days: readonly DiaryDay[]): string {
  const rows: unknown[][] = [[title], ['Date', 'Meal', 'Food', 'Amount', 'Nutrient values (consumed estimate)', 'Custom food status', 'Per-serving custom nutrition']];
  for (const day of days) {
    if (!day.meals.length) { rows.push([day.date, '', 'No meal records', '', '', '', '']); continue; }
    for (const meal of day.meals) {
      if (!meal.food_diary_items.length) { rows.push([day.date, meal.meal_type, 'No food items', '', '', '', '']); continue; }
      for (const item of meal.food_diary_items) {
        const values = DIARY_NUTRIENTS.map(({ key, short, unit }) => {
          const value = recordedNumber(item[key]);
          return value === null ? null : `${short}: ${value} ${unit}`;
        }).filter(Boolean).join('; ');
        const status = item.food_id?.startsWith('custom_')
          ? (item.custom_food_verification_status === 'verified' ? 'Verified' : item.custom_food_verification_status === 'rejected' ? 'Rejected / excluded from totals' : 'Not verified')
          : 'Standard food';
        const snapshot = item.custom_food_nutrition_snapshot;
        const perServing = snapshot ? DIARY_NUTRIENTS.map(({ key, short, unit }) => {
          const value = recordedNumber(snapshot[key]);
          return value === null ? null : `${short}: ${value} ${unit}`;
        }).filter(Boolean).concat(
          snapshot.gi_index === null ? [] : [`GI: ${snapshot.gi_index}`],
          Object.entries(snapshot.other_nutrients ?? {}).flatMap(([key, raw]) => {
            const value = recordedNumber(raw);
            return value === null ? [] : [`${key}: ${value}`];
          }),
        ).join('; ') : '';
        rows.push([day.date, meal.meal_type, item.item_name, item.portion_amount === null ? 'Amount unavailable' : `${item.portion_amount} ${item.portion_unit ?? ''}`.trim(), isRejectedCustomFood(item) ? 'Excluded from totals after doctor rejection' : values || 'Nutrient estimates unavailable', status, perServing]);
      }
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

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
  const eligibleItems = items.filter((item) => !(item.food_id?.startsWith('custom_') && item.custom_food_verification_status === 'rejected'));
  for (const item of eligibleItems) {
    const value = recordedNumber(item[key]);
    if (value !== null) { sum += value; knownItems++; }
  }
  return { value: knownItems ? sum : null, knownItems, itemCount: eligibleItems.length, partial: knownItems < eligibleItems.length };
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
