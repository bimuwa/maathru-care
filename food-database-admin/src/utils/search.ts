import type { Food } from '../types';

const aliases: Record<string, string[]> = {
  asmi: ['asm', 'aasi', 'aasmi', 'ආස්මි'],
  barley: ['barl', 'barley grain'],
  chicken: ['chiken', 'chickn', 'hen'],
};
export function normalize(value: unknown): string {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim()
    .replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}
const editDistance = (a: string, b: string) => {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};
function score(food: Food, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const id = String(food.food_id ?? '').toLocaleLowerCase();
  const names = [food.display_name, food.english_name, food.item_name].filter(Boolean).map(normalize);
  if (id === q) return 1000;
  if (names.includes(q)) return 900;
  if (id.startsWith(q)) return 820;
  if (names.some(n => n.split(' ').some(t => t.startsWith(q)))) return 760;
  if (names.some(n => n.includes(q))) return 680;
  const aliasHits = aliases[q] ?? [];
  if (aliasHits.length && (id === q || names.some(n => aliasHits.some(a => n.includes(normalize(a))) || n === normalize(q)))) return 600;
  const tokens = [...id.split(/[^\p{L}\p{N}]+/u), ...names.flatMap(n => n.split(' '))].filter(Boolean);
  const distance = Math.min(...tokens.map(t => editDistance(q, t)));
  return distance <= Math.max(1, Math.floor(q.length / 4)) ? 450 - distance * 50 : 0;
}
export function rankFoods<T extends Food>(foods: T[], query: string): T[] {
  return foods.map((food, i) => ({ food, i, score: score(food, query) })).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i).map(x => x.food);
}
