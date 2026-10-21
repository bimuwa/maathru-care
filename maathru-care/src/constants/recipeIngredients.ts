import type { Ingredient, IngredientCategory } from '../types/recipeGenerator';

export const INGREDIENT_CATEGORIES: { id: IngredientCategory; label: string }[] = [
  { id: 'vegetables', label: 'Vegetables' }, { id: 'leafy-greens', label: 'Leafy Greens' }, { id: 'fruits', label: 'Fruits' },
  { id: 'grains-rice', label: 'Grains & Rice' }, { id: 'lentils-legumes', label: 'Lentils & Legumes' },
  { id: 'fish-meat-eggs', label: 'Fish, Meat & Eggs' }, { id: 'dairy', label: 'Dairy' },
  { id: 'spices-herbs', label: 'Spices & Herbs' }, { id: 'other', label: 'Other Cooking Ingredients' },
];

// UI IDs are intentionally independent from any future recipe dataset IDs.
export const RECIPE_INGREDIENTS: Ingredient[] = [
  { id: 'veg-carrot', nameEn: 'Carrot', nameSi: 'කැරට්', category: 'vegetables', searchAliases: ['carrot', 'කැරට්'] },
  { id: 'veg-beans', nameEn: 'Green Beans', nameSi: 'බෝංචි', category: 'vegetables', searchAliases: ['beans', 'green beans', 'බෝංචි'] },
  { id: 'veg-pumpkin', nameEn: 'Pumpkin', nameSi: 'වට්ටක්කා', category: 'vegetables', searchAliases: ['pumpkin', 'වට්ටක්කා'] },
  { id: 'veg-tomato', nameEn: 'Tomato', nameSi: 'තක්කාලි', category: 'vegetables', searchAliases: ['tomato', 'තක්කாளி'] },
  { id: 'veg-onion', nameEn: 'Onion', nameSi: 'ලූනු', category: 'vegetables', searchAliases: ['onion', 'ලූනු'] },
  { id: 'veg-garlic', nameEn: 'Garlic', nameSi: 'සුදු ලූනු', category: 'vegetables', searchAliases: ['garlic', 'සුදු ලූනු'] },
  { id: 'veg-potato', nameEn: 'Potato', nameSi: 'අර්තාපල්', category: 'vegetables', searchAliases: ['potato', 'අර්තාපල්'] },
  { id: 'veg-sweet-potato', nameEn: 'Sweet Potato', nameSi: 'බතල', category: 'vegetables', searchAliases: ['sweet potato', 'බතල'] },
  { id: 'veg-eggplant', nameEn: 'Eggplant', nameSi: 'වම්බටු', category: 'vegetables', searchAliases: ['eggplant', 'brinjal', 'වම්බටු'] },
  { id: 'green-gotukola', nameEn: 'Gotukola', nameSi: 'ගොටුකොළ', category: 'leafy-greens', searchAliases: ['gotukola', 'centella', 'ගොටුකොළ'] },
  { id: 'green-mukunuwenna', nameEn: 'Mukunuwenna', nameSi: 'මුකුණුවැන්න', category: 'leafy-greens', searchAliases: ['mukunuwenna', 'මුකුණුවැන්න'] },
  { id: 'green-spinach', nameEn: 'Spinach', nameSi: 'නිවිති', category: 'leafy-greens', searchAliases: ['spinach', 'නිවිති'] },
  { id: 'fruit-banana', nameEn: 'Banana', nameSi: 'කෙසෙල්', category: 'fruits', searchAliases: ['banana', 'කෙසෙල්'] },
  { id: 'fruit-papaya', nameEn: 'Papaya', nameSi: 'පැපොල්', category: 'fruits', searchAliases: ['papaya', 'පැපොල්'] },
  { id: 'fruit-mango', nameEn: 'Mango', nameSi: 'අඹ', category: 'fruits', searchAliases: ['mango', 'අඹ'] },
  { id: 'grain-red-rice', nameEn: 'Red Rice', nameSi: 'රතු හාල්', category: 'grains-rice', searchAliases: ['red rice', 'රතු හාල්'] },
  { id: 'grain-white-rice', nameEn: 'White Rice', nameSi: 'සුදු හාල්', category: 'grains-rice', searchAliases: ['white rice', 'සුදු හාල්'] },
  { id: 'grain-oats', nameEn: 'Oats', nameSi: 'ඕට්ස්', category: 'grains-rice', searchAliases: ['oats', 'ඕට්ස්'] },
  { id: 'legume-dhal', nameEn: 'Dhal', nameSi: 'පරිප්පු', category: 'lentils-legumes', searchAliases: ['dhal', 'dal', 'lentils', 'පරිප්පු'] },
  { id: 'legume-chickpeas', nameEn: 'Chickpeas', nameSi: 'කඩල', category: 'lentils-legumes', searchAliases: ['chickpeas', 'කඩල'] },
  { id: 'protein-eggs', nameEn: 'Eggs', nameSi: 'බිත්තර', category: 'fish-meat-eggs', searchAliases: ['egg', 'eggs', 'බිත්තර'] },
  { id: 'protein-fish', nameEn: 'Fish', nameSi: 'මාළු', category: 'fish-meat-eggs', searchAliases: ['fish', 'මාළු'] },
  { id: 'protein-chicken', nameEn: 'Chicken', nameSi: 'කුකුළු මස්', category: 'fish-meat-eggs', searchAliases: ['chicken', 'කුකුළු මස්'] },
  { id: 'dairy-milk', nameEn: 'Fresh Milk', nameSi: 'කිරි', category: 'dairy', searchAliases: ['milk', 'fresh milk', 'කිරි'] },
  { id: 'dairy-curd', nameEn: 'Curd', nameSi: 'මුදවපු කිරි', category: 'dairy', searchAliases: ['curd', 'yoghurt', 'මුදවපු කිරි'] },
  { id: 'spice-ginger', nameEn: 'Ginger', nameSi: 'ඉඟුරු', category: 'spices-herbs', searchAliases: ['ginger', 'ඉඟුරු'] },
  { id: 'spice-curry-leaves', nameEn: 'Curry Leaves', nameSi: 'කරපිංචා', category: 'spices-herbs', searchAliases: ['curry leaves', 'කරපිංචා'] },
  { id: 'spice-turmeric', nameEn: 'Turmeric', nameSi: 'කහ', category: 'spices-herbs', searchAliases: ['turmeric', 'කහ'] },
  { id: 'spice-cumin', nameEn: 'Cumin', nameSi: 'දුරු', category: 'spices-herbs', searchAliases: ['cumin', 'සුදුරු', 'දුරු'] },
  { id: 'spice-chilli', nameEn: 'Green Chilli', nameSi: 'අමු මිරිස්', category: 'spices-herbs', searchAliases: ['green chilli', 'chili', 'අමු මිරිස්'] },
  { id: 'other-coconut-milk', nameEn: 'Coconut Milk', nameSi: 'පොල් කිරි', category: 'other', searchAliases: ['coconut milk', 'පොල් කිරි'] },
  { id: 'other-coconut', nameEn: 'Coconut', nameSi: 'පොල්', category: 'other', searchAliases: ['coconut', 'පොල්'] },
  { id: 'other-oil', nameEn: 'Coconut Oil', nameSi: 'පොල් තෙල්', category: 'other', searchAliases: ['oil', 'coconut oil', 'පොල් තෙල්'] },
];

export function filterIngredients(query: string, category: IngredientCategory | null = null): Ingredient[] {
  const normalized = query.trim().toLocaleLowerCase();
  return RECIPE_INGREDIENTS.filter((ingredient) => {
    if (category && ingredient.category !== category) return false;
    if (!normalized) return true;
    return [ingredient.nameEn, ingredient.nameSi ?? '', ...ingredient.searchAliases].some((term) => term.toLocaleLowerCase().includes(normalized));
  });
}

// Future recommendation services should map these UI IDs at this boundary.
export function createRecipeGenerationRequest(selectedIngredientIds: string[]) {
  return { selectedIngredientIds: [...new Set(selectedIngredientIds)] };
}
export function toggleIngredientSelection(selectedIds: string[], id: string) {
  return selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id];
}
export function removeIngredientSelection(selectedIds: string[], id: string) { return selectedIds.filter((selectedId) => selectedId !== id); }
export function canGenerateRecipes(selectedIds: string[]) { return selectedIds.length > 0; }
