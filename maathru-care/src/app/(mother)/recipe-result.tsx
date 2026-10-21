import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChefHat } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RECIPE_INGREDIENTS, createRecipeGenerationRequest } from '../../constants/recipeIngredients';

export default function RecipeResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selected?: string }>();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';
  const colors = dark
    ? { bg: '#111A14', white: '#1A261D', text: '#F2F7F3', muted: '#B3C2B7', line: '#2B3A30', green: '#86D39A', pale: '#243D2B' }
    : { bg: '#F7FAF7', white: '#FFFFFF', text: '#17231C', muted: '#64746A', line: '#E4EBE5', green: '#15803D', pale: '#EAF5EC' };
  const request = useMemo(() => createRecipeGenerationRequest(parseIds(params.selected)), [params.selected]);
  const ingredients = request.selectedIngredientIds.map((id) => RECIPE_INGREDIENTS.find((item) => item.id === id)).filter((item): item is (typeof RECIPE_INGREDIENTS)[number] => Boolean(item));
  const edit = () => router.push({ pathname: '/(mother)/recipe-generator', params: { selected: JSON.stringify(request.selectedIngredientIds) } });
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 16) + 8, paddingHorizontal: 20 }}>
    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={21} color={colors.text} /></TouchableOpacity>
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 50, paddingBottom: 30 }}>
      <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }}><ChefHat size={36} color={colors.green} /></View>
      <Text style={{ color: colors.text, fontSize: 23, fontWeight: '700', textAlign: 'center', marginTop: 24 }}>Your ingredients are ready</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }}>Recipe recommendations are coming soon.</Text>
      <View style={{ alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 28 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>Selected ingredients ({ingredients.length})</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ingredients.map((item) => <View key={item.id} style={{ backgroundColor: colors.pale, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8, maxWidth: '100%' }}><Text numberOfLines={1} style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>{item.nameEn}</Text></View>)}</View>
      </View>
      <TouchableOpacity onPress={edit} accessibilityRole="button" accessibilityLabel="Edit ingredients" style={{ minHeight: 50, alignSelf: 'stretch', borderRadius: 15, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginTop: 18 }}><Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Edit Ingredients</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}

function parseIds(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  try { const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
}
