import { nutritionApi } from '@/services/nutritionApi';

export type MaternalFoodSearchRow = Record<string, unknown> & {
  id?: number;
  food_id: string;
  display_name: string;
  english_name?: string | null;
  scientific_name?: string | null;
};

const searchFields = ['display_name', 'english_name', 'scientific_name', 'food_id'] as const;
const resultColumns = [
  'food_id', 'display_name', 'english_name', 'scientific_name', 'category', 'serving_unit',
  'ref_mask_area', 'carbs_g', 'sugar_g', 'fiber_g', 'fat_g', 'iron_mg', 'calcium_mg',
  'gi_index', 'is_contraindicated',
].join(',');

export function normalizeFoodSearchText(value: string): string {
  return value.normalize('NFKC').trim().replace(/[_-]+/gu, ' ').replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function escapeFilterTerm(value: string): string {
  // Keep user text inside a quoted PostgREST value and make LIKE wildcards literal.
  return value.replace(/[\\"%_]/gu, '\\$&').replace(/([(),])/gu, '\\$1');
}

export function buildMaternalFoodSearchFilter(query: string): string {
  const normalized = normalizeFoodSearchText(query);
  if (!normalized) return '';
  const terms = [...new Set([normalized, ...normalized.split(' ').filter(Boolean)])].slice(0, 5);
  return terms.flatMap((term) => {
    const clauses = searchFields.map((field) => `${field}.ilike."%${escapeFilterTerm(term)}%"`);
    const foodIdTerm = term.replace(/\s+/gu, '_');
    if (foodIdTerm !== term) clauses.push(`food_id.ilike."%${escapeFilterTerm(foodIdTerm)}%"`);
    return clauses;
  }).join(',');
}

function fieldValues(food: MaternalFoodSearchRow): string[] {
  return [food.food_id, food.display_name, food.english_name, food.scientific_name]
    .map((value) => typeof value === 'string' ? normalizeFoodSearchText(value.replace(/[_-]+/gu, ' ')) : '')
    .filter(Boolean);
}

export function rankMaternalFoodResults(
  rows: readonly MaternalFoodSearchRow[],
  query: string,
  limit = 20,
): MaternalFoodSearchRow[] {
  const normalizedQuery = normalizeFoodSearchText(query);
  if (!normalizedQuery) return [];
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  const score = (food: MaternalFoodSearchRow) => {
    const values = fieldValues(food);
    const exact = values.findIndex((value) => value === normalizedQuery);
    if (exact >= 0) return exact === 0 ? 0 : exact;
    const prefix = values.findIndex((value) => value.startsWith(normalizedQuery));
    if (prefix >= 0) return 10 + prefix;
    const boundary = values.findIndex((value) => {
      const index = value.indexOf(normalizedQuery);
      return index > 0 && /[\s/.-]/u.test(value[index - 1]);
    });
    if (boundary >= 0) return 20 + boundary;
    const substring = values.findIndex((value) => value.includes(normalizedQuery));
    if (substring >= 0) return 30 + substring;
    const matchedTokens = queryTokens.filter((token) => values.some((value) => value.includes(token)));
    if (matchedTokens.length === queryTokens.length) return 40 - matchedTokens.length;
    return 60 - matchedTokens.length;
  };

  const unique = new Map<string, MaternalFoodSearchRow>();
  for (const row of rows) {
    const id = typeof row.food_id === 'string' ? row.food_id.trim() : '';
    if (id && !unique.has(id)) unique.set(id, row);
  }
  return [...unique.values()]
    .map((food) => ({ food, score: score(food) }))
    .sort((a, b) => a.score - b.score || a.food.display_name.localeCompare(b.food.display_name))
    .slice(0, Math.max(1, limit))
    .map(({ food }) => food);
}

export type CombinedFoodSearchResult = {
  food_id: string; display_name: string; resultSource: 'catalog' | 'custom';
  english_name?: unknown; scientific_name?: unknown; sinhala_name?: unknown; category?: unknown;
};

/** Rank the already-filtered global and owner-scoped result sets together. */
export function rankCombinedFoodResults<T extends CombinedFoodSearchResult>(rows: readonly T[], query: string, limit = 20): T[] {
  const needle = normalizeFoodSearchText(query);
  if (!needle) return [];
  const fields = (row: T) => [row.display_name, row.english_name, row.scientific_name, row.sinhala_name, row.food_id, row.category]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizeFoodSearchText(value));
  const rank = (row: T) => {
    const values = fields(row);
    const exact = values.findIndex((value) => value === needle);
    if (exact >= 0) return exact;
    const prefix = values.findIndex((value) => value.startsWith(needle));
    if (prefix >= 0) return 10 + prefix;
    const contains = values.findIndex((value) => value.includes(needle));
    return contains >= 0 ? 20 + contains : 30;
  };
  const unique = new Map<string, T>();
  for (const row of rows) if (row.food_id && !unique.has(row.food_id.toLocaleLowerCase())) unique.set(row.food_id.toLocaleLowerCase(), row);
  return [...unique.values()].sort((a, b) => rank(a) - rank(b)
    || (a.resultSource === b.resultSource ? 0 : a.resultSource === 'catalog' ? -1 : 1)
    || a.display_name.localeCompare(b.display_name)).slice(0, Math.max(1, limit));
}

export const foodSearchService = {
  async searchMaternalFoods(query: string): Promise<MaternalFoodSearchRow[]> {
    const normalized = normalizeFoodSearchText(query);
    if (!normalized) return [];
    const params = new URLSearchParams({ q: normalized, limit: '20' });
    return nutritionApi.request<MaternalFoodSearchRow[]>(`/foods/search?${params.toString()}`);
  },
};
