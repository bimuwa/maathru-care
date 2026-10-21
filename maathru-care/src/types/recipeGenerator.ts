export type IngredientCategory =
  | 'vegetables' | 'leafy-greens' | 'fruits' | 'grains-rice'
  | 'lentils-legumes' | 'fish-meat-eggs' | 'dairy' | 'spices-herbs' | 'other';

export type Ingredient = {
  id: string;
  nameEn: string;
  nameSi?: string;
  category: IngredientCategory;
  searchAliases: string[];
};

export type RecipeGenerationRequest = { selectedIngredientIds: string[] };
