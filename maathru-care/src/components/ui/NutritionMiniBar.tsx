import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { NutrientValues, NutrientKey } from '@/services/nutritionCalculator';

const NUTRIENTS: { key: NutrientKey; label: string; unit: string; color: string; emoji: string }[] = [
  { key: 'carbsG', label: 'Carbs', unit: 'g', color: '#F59E0B', emoji: '🌾' },
  { key: 'sugarG', label: 'Sugar', unit: 'g', color: '#EC4899', emoji: '🍬' },
  { key: 'fiberG', label: 'Fiber', unit: 'g', color: '#10B981', emoji: '🌿' },
  { key: 'fatG', label: 'Fat', unit: 'g', color: '#F97316', emoji: '🥑' },
  { key: 'ironMg', label: 'Iron', unit: 'mg', color: '#EF4444', emoji: '🩸' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg', color: '#3B82F6', emoji: '🦴' },
];

export function NutritionMiniBar({ totals }: { totals: NutrientValues }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A' }}>Estimated nutrition</Text>
      <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 19 }}>මෙහි පෙන්වන පෝෂණ අගයන් ඇස්තමේන්තු පමණි. ආහාර ප්‍රමාණය, අමුද්‍රව්‍ය සහ පිසින ආකාරය අනුව සැබෑ අගයන් වෙනස් විය හැක.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showInfo }} onPress={() => setShowInfo(!showInfo)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#047857', fontSize: 12 }}>{showInfo ? 'Hide estimate details −' : 'ⓘ About this estimate'}</Text></TouchableOpacity>
      {showInfo && <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 19 }}>AI identifies foods; it does not verify portion size. Counts and servings are estimates. Only documented matching units are calculated. These values are not measured clinical intake.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {NUTRIENTS.map((nutrient) => {
        const value = totals[nutrient.key];
        return (
          <View key={nutrient.key} style={{ flexBasis: '48%', flexGrow: 1, minWidth: 112, minHeight: 56, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#F8FAFC', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>{nutrient.emoji} {nutrient.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: value === null ? '#64748B' : nutrient.color, marginTop: 2 }}>
              {value === null ? 'Unavailable' : `${value.toFixed(1)} ${nutrient.unit}`}
            </Text>
          </View>
        );
      })}
      </View>
    </View>
  );
}
