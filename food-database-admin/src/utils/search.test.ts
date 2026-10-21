import { describe, expect, it } from 'vitest';
import { normalize, rankFoods } from './search';

const foods = [
  { food_id: 'barley', display_name: 'Barley', english_name: 'Barley' },
  { food_id: 'asmi', display_name: 'Asmi (ආස්මි)', english_name: 'Asmi' },
  { food_id: 'chicken', display_name: 'Chicken', english_name: 'Chicken' },
];
describe('food search ranking', () => {
  it('normalizes Unicode and punctuation without removing Sinhala characters', () => {
    expect(normalize('  ASMI — ආස්මි! ')).toBe('asmi ආස්මි');
  });
  it('ranks an exact food id ahead of name matches', () => {
    expect(rankFoods(foods, 'asmi')[0].food_id).toBe('asmi');
  });
  it('finds partial IDs, beginning-of-word matches and spelling errors', () => {
    expect(rankFoods(foods, 'asm').map(f => f.food_id)).toContain('asmi');
    expect(rankFoods(foods, 'barl')[0].food_id).toBe('barley');
    expect(rankFoods(foods, 'chiken')[0].food_id).toBe('chicken');
  });
  it('matches Sinhala text in the display name', () => {
    expect(rankFoods(foods, 'ආස්').map(f => f.food_id)).toContain('asmi');
  });
  it('does not return unrelated foods for an empty query', () => {
    expect(rankFoods(foods, '  ')).toEqual([]);
  });
});
