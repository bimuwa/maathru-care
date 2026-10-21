import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INGREDIENT_CATEGORIES, RECIPE_INGREDIENTS, canGenerateRecipes, filterIngredients, removeIngredientSelection, toggleIngredientSelection } from '../../constants/recipeIngredients';
import type { Ingredient, IngredientCategory } from '../../types/recipeGenerator';

const LIGHT_PALETTE = { green: '#15803D', text: '#17231C', muted: '#64746A', bg: '#F7FAF7', line: '#E4EBE5', white: '#FFFFFF', pale: '#EAF5EC' };
const DARK_PALETTE = { green: '#86D39A', text: '#F2F7F3', muted: '#B3C2B7', bg: '#111A14', line: '#2B3A30', white: '#1A261D', pale: '#243D2B' };
type Palette = { [Key in keyof typeof LIGHT_PALETTE]: string };

function parseIds(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string'))] : [];
  } catch { return []; }
}

export default function RecipeGeneratorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selected?: string }>();
  const insets = useSafeAreaInsets();
  const palette = useColorScheme() === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const [selectedIds, setSelectedIds] = useState<string[]>(() => parseIds(params.selected));
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IngredientCategory | null>(null);
  const selected = useMemo(() => selectedIds.map((id) => RECIPE_INGREDIENTS.find((item) => item.id === id)).filter((item): item is Ingredient => Boolean(item)), [selectedIds]);
  const visibleIngredients = useMemo(() => filterIngredients(query, activeCategory), [query, activeCategory]);

  const toggle = (id: string) => setSelectedIds((current) => toggleIngredientSelection(current, id));
  const openNextStep = () => {
    if (selectedIds.length === 0) return;
    router.push({ pathname: '/(mother)/recipe-result', params: { selected: JSON.stringify(selectedIds) } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18 }}>
          <View style={{ paddingTop: Math.max(insets.top, 16) + 8, paddingHorizontal: 20, paddingBottom: 18, backgroundColor: palette.white }}>
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <ArrowLeft size={21} color={palette.text} />
            </TouchableOpacity>
            <Text style={{ color: palette.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.5 }}>What's in My Kitchen?</Text>
            <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 21, marginTop: 6 }}>Select the ingredients you have at home.</Text>
            <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Choose as many as you like. You can change your list anytime.</Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ height: 50, borderWidth: 1, borderColor: palette.line, borderRadius: 15, backgroundColor: palette.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
              <Search size={19} color={palette.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search ingredients..." placeholderTextColor="#8A978E" accessibilityLabel="Search ingredients" returnKeyType="search" style={{ flex: 1, minWidth: 0, paddingVertical: 10, marginLeft: 10, color: palette.text, fontSize: 14 }} />
              {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} style={{ padding: 5 }}><X size={18} color={palette.muted} /></TouchableOpacity>}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              <TouchableOpacity onPress={() => setActiveCategory(null)} style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: activeCategory === null ? palette.green : palette.white, borderWidth: 1, borderColor: activeCategory === null ? palette.green : palette.line }}><Text style={{ fontSize: 12, fontWeight: '600', color: activeCategory === null ? palette.white : palette.muted }}>All</Text></TouchableOpacity>
              {INGREDIENT_CATEGORIES.map((category) => <TouchableOpacity key={category.id} onPress={() => setActiveCategory(activeCategory === category.id ? null : category.id)} style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: activeCategory === category.id ? palette.green : palette.white, borderWidth: 1, borderColor: activeCategory === category.id ? palette.green : palette.line }}><Text style={{ fontSize: 12, fontWeight: '600', color: activeCategory === category.id ? palette.white : palette.muted }}>{category.label}</Text></TouchableOpacity>)}
            </ScrollView>

            <View style={{ marginTop: 20 }}>
              {query.trim() || activeCategory ? (
                <>
                  <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>{query.trim() ? 'Search results' : INGREDIENT_CATEGORIES.find((item) => item.id === activeCategory)?.label}</Text>
                  {visibleIngredients.length ? visibleIngredients.map((item) => <IngredientRow key={item.id} ingredient={item} checked={selectedIds.includes(item.id)} onPress={() => toggle(item.id)} palette={palette} />) : <View style={{ paddingVertical: 26, alignItems: 'center' }}><Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>No ingredients found</Text><Text style={{ color: palette.muted, fontSize: 13, marginTop: 5, textAlign: 'center' }}>Try another name in English or Sinhala.</Text></View>}
                </>
              ) : INGREDIENT_CATEGORIES.map((category) => {
                const items = RECIPE_INGREDIENTS.filter((item) => item.category === category.id);
                return <View key={category.id} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}><Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{category.label}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{items.length}</Text></View>
                  {items.map((item) => <IngredientRow key={item.id} ingredient={item} checked={selectedIds.includes(item.id)} onPress={() => toggle(item.id)} palette={palette} />)}
                </View>;
              })}
            </View>

            <View style={{ backgroundColor: palette.white, borderRadius: 17, borderWidth: 1, borderColor: palette.line, padding: 15, marginTop: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: selected.length ? 12 : 0 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>Your Ingredients ({selected.length})</Text>
                {selected.length > 0 && <TouchableOpacity onPress={() => setSelectedIds([])} accessibilityRole="button" accessibilityLabel="Clear all selected ingredients" hitSlop={8}><Text style={{ color: palette.green, fontSize: 12, fontWeight: '600' }}>Clear all</Text></TouchableOpacity>}
              </View>
              {selected.length === 0 ? <Text style={{ color: palette.muted, fontSize: 13 }}>Your selected ingredients will appear here.</Text> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{selected.map((item) => <View key={item.id} style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: palette.pale, borderRadius: 18, paddingLeft: 11, paddingRight: 5, paddingVertical: 5 }}><Text numberOfLines={1} style={{ color: palette.green, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{item.nameEn}</Text><TouchableOpacity onPress={() => setSelectedIds((current) => removeIngredientSelection(current, item.id))} accessibilityRole="button" accessibilityLabel={`Remove ${item.nameEn}`} hitSlop={5} style={{ padding: 5 }}><X size={14} color={palette.green} /></TouchableOpacity></View>)}</View>}
            </View>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: palette.white, borderTopWidth: 1, borderTopColor: palette.line }}>
          <TouchableOpacity onPress={openNextStep} disabled={!canGenerateRecipes(selectedIds)} accessibilityRole="button" accessibilityState={{ disabled: !canGenerateRecipes(selectedIds) }} accessibilityLabel={`Generate recipes, ${selected.length} ingredients selected`} activeOpacity={0.85} style={{ minHeight: 52, borderRadius: 15, backgroundColor: canGenerateRecipes(selectedIds) ? palette.green : '#B7C6BA', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Text style={{ color: palette.white, fontSize: 15, fontWeight: '700' }}>Generate Recipes</Text><Text style={{ color: '#E6F3E8', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>· {selected.length} selected</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function IngredientRow({ ingredient, checked, onPress, palette }: { ingredient: Ingredient; checked: boolean; onPress: () => void; palette: Palette }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${ingredient.nameEn}${ingredient.nameSi ? `, ${ingredient.nameSi}` : ''}`} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 8, paddingHorizontal: 3 }}>
    <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{ingredient.nameEn}</Text>{ingredient.nameSi ? <Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{ingredient.nameSi}</Text> : null}</View>
    <View style={{ width: 25, height: 25, borderRadius: 8, borderWidth: 1.5, borderColor: checked ? palette.green : '#B7C4B9', backgroundColor: checked ? palette.green : palette.white, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>{checked && <Check size={16} color="#fff" strokeWidth={3} />}</View>
  </TouchableOpacity>;
}
