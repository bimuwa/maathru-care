export interface NutrientDefinition {
  key: string;
  label: string;
  unit: string;
  aliases: readonly string[];
  /** Existing diary fields supported by its current snapshot and calculator. */
  diaryField?: 'carbs_g' | 'sugar_g' | 'fiber_g' | 'fat_g' | 'iron_mg' | 'calcium_mg';
}

export const NUTRIENT_DEFINITIONS: readonly NutrientDefinition[] = [
  { key: 'energy_kcal', label: 'Calories / Energy', unit: 'kcal', aliases: ['calories', 'calorie', 'energy', 'kcal'] },
  { key: 'protein_g', label: 'Protein', unit: 'g', aliases: ['protein', 'proteins'] },
  { key: 'carbs_g', label: 'Total Carbohydrate', unit: 'g', aliases: ['carbs', 'carbohydrate', 'carbohydrates', 'total carbs'], diaryField: 'carbs_g' },
  { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', aliases: ['fiber', 'fibre', 'dietary fiber', 'dietary fibre'], diaryField: 'fiber_g' },
  { key: 'sugar_g', label: 'Total Sugar', unit: 'g', aliases: ['sugar', 'sugars', 'total sugar', 'total sugars'], diaryField: 'sugar_g' },
  { key: 'added_sugar_g', label: 'Added Sugar', unit: 'g', aliases: ['added sugar', 'added sugars'] },
  { key: 'fat_g', label: 'Total Fat', unit: 'g', aliases: ['fat', 'fats', 'total fat'], diaryField: 'fat_g' },
  { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g', aliases: ['saturated fat', 'sat fat'] },
  { key: 'monounsaturated_fat_g', label: 'Monounsaturated Fat', unit: 'g', aliases: ['monounsaturated', 'monounsaturated fat', 'mufa'] },
  { key: 'polyunsaturated_fat_g', label: 'Polyunsaturated Fat', unit: 'g', aliases: ['polyunsaturated', 'polyunsaturated fat', 'pufa'] },
  { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g', aliases: ['trans fat'] },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', aliases: ['cholesterol'] },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', aliases: ['sodium', 'salt'] },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', aliases: ['potassium'] },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', aliases: ['calcium', 'ca'], diaryField: 'calcium_mg' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', aliases: ['iron', 'fe'], diaryField: 'iron_mg' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', aliases: ['magnesium', 'mg'] },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', aliases: ['phosphorus', 'phosphate'] },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', aliases: ['zinc'] },
  { key: 'copper_mg', label: 'Copper', unit: 'mg', aliases: ['copper'] },
  { key: 'manganese_mg', label: 'Manganese', unit: 'mg', aliases: ['manganese'] },
  { key: 'selenium_ug', label: 'Selenium', unit: 'µg', aliases: ['selenium', 'microgram selenium'] },
  { key: 'vitamin_a_ug_rae', label: 'Vitamin A', unit: 'µg RAE', aliases: ['vitamin a', 'vit a', 'retinol'] },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', aliases: ['vitamin c', 'vit c', 'ascorbic acid'] },
  { key: 'vitamin_d_ug', label: 'Vitamin D', unit: 'µg', aliases: ['vitamin d', 'vit d', 'd2', 'd3'] },
  { key: 'vitamin_e_mg', label: 'Vitamin E', unit: 'mg', aliases: ['vitamin e', 'vit e'] },
  { key: 'vitamin_k_ug', label: 'Vitamin K', unit: 'µg', aliases: ['vitamin k', 'vit k'] },
  { key: 'vitamin_b1_mg', label: 'Vitamin B1 (Thiamine)', unit: 'mg', aliases: ['vitamin b1', 'vit b1', 'b1', 'thiamine'] },
  { key: 'vitamin_b2_mg', label: 'Vitamin B2 (Riboflavin)', unit: 'mg', aliases: ['vitamin b2', 'vit b2', 'b2', 'riboflavin'] },
  { key: 'vitamin_b3_mg', label: 'Vitamin B3 (Niacin)', unit: 'mg', aliases: ['vitamin b3', 'vit b3', 'b3', 'niacin'] },
  { key: 'vitamin_b5_mg', label: 'Vitamin B5 (Pantothenic Acid)', unit: 'mg', aliases: ['vitamin b5', 'vit b5', 'b5', 'pantothenic acid'] },
  { key: 'vitamin_b6_mg', label: 'Vitamin B6', unit: 'mg', aliases: ['vitamin b6', 'vit b6', 'b6'] },
  { key: 'vitamin_b7_ug', label: 'Vitamin B7 (Biotin)', unit: 'µg', aliases: ['vitamin b7', 'vit b7', 'b7', 'biotin'] },
  { key: 'vitamin_b9_ug_dfe', label: 'Vitamin B9 (Folate)', unit: 'µg DFE', aliases: ['vitamin b9', 'vit b9', 'b9', 'folate', 'folic acid'] },
  { key: 'vitamin_b12_ug', label: 'Vitamin B12', unit: 'µg', aliases: ['vitamin b12', 'vit b12', 'b12', 'cobalamin'] },
  { key: 'water_g', label: 'Water', unit: 'g', aliases: ['water', 'moisture'] },
  { key: 'caffeine_mg', label: 'Caffeine', unit: 'mg', aliases: ['caffeine'] },
] as const;

export function getNutrientDefinition(key: string): NutrientDefinition | undefined {
  return NUTRIENT_DEFINITIONS.find((definition) => definition.key === key);
}

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();

export function searchNutrients(query: string, selectedKeys: readonly string[] = []): NutrientDefinition[] {
  const needle = normalize(query);
  if (!needle) return [];
  const selected = new Set(selectedKeys);
  return NUTRIENT_DEFINITIONS.map((definition, index) => {
    if (selected.has(definition.key)) return null;
    const candidates = [definition.label, definition.key.replace(/_/g, ' '), ...definition.aliases].map(normalize);
    const rank = candidates.reduce((best, candidate) => {
      const score = candidate === needle ? 0 : candidate.startsWith(needle) ? 1 : candidate.split(/\s+/).some((word) => word.startsWith(needle)) ? 2 : candidate.includes(needle) ? 3 : Infinity;
      return Math.min(best, score);
    }, Infinity);
    return Number.isFinite(rank) ? { definition, index, rank } : null;
  }).filter((item): item is { definition: NutrientDefinition; index: number; rank: number } => item !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ definition }) => definition);
}

export function validateNutrientValues(values: Record<string, unknown>): string | null {
  const allowed = new Set(NUTRIENT_DEFINITIONS.map(({ key }) => key));
  for (const [key, value] of Object.entries(values)) {
    if (!allowed.has(key)) return 'Remove an unsupported nutrition value and try again.';
    if (value === null || value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) return `Enter a valid number for ${NUTRIENT_DEFINITIONS.find((item) => item.key === key)?.label ?? key}.`;
    if (value < 0) return `${NUTRIENT_DEFINITIONS.find((item) => item.key === key)?.label ?? 'Nutrition values'} must be zero or greater.`;
  }
  return null;
}
