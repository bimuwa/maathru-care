import React from 'react';
import { View, Text } from 'react-native';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';

type NutritionKey = 'carbsG' | 'sugarG' | 'fatG' | 'ironMg' | 'calciumMg' | 'fiberG';

interface NutrientConfig {
  key: NutritionKey;
  label: string;
  unit: string;
  color: string;
  emoji: string;
}

const ALL_NUTRIENTS: NutrientConfig[] = [
  { key: 'carbsG',    label: 'Carbs',   unit: 'g',  color: '#F59E0B', emoji: '🌾' },
  { key: 'sugarG',    label: 'Sugar',   unit: 'g',  color: '#EC4899', emoji: '🍬' },
  { key: 'fatG',      label: 'Fat',     unit: 'g',  color: '#F97316', emoji: '🥑' },
  { key: 'ironMg',    label: 'Iron',    unit: 'mg', color: '#EF4444', emoji: '🩸' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg', color: '#3B82F6', emoji: '🦴' },
  { key: 'fiberG',    label: 'Fiber',   unit: 'g',  color: '#10B981', emoji: '🌿' },
];

interface NutritionTotals {
  carbsG: number;
  sugarG: number;
  fiberG: number;
  fatG: number;
  ironMg: number;
  calciumMg: number;
}

interface NutritionMiniBarProps {
  totals: NutritionTotals;
}

export function NutritionMiniBar({ totals }: NutritionMiniBarProps) {
  const getValue = (key: NutritionKey): number => {
    return totals[key] ?? 0;
  };

  // Only show nutrients that have a value > 0 in the current meal
  const activeNutrients = ALL_NUTRIENTS.filter((n) => getValue(n.key) > 0);
  
  // If no nutrients are > 0, fallback to showing the default core 4
  const nutrientsToDisplay = activeNutrients.length > 0 ? activeNutrients : ALL_NUTRIENTS.filter(n => ['carbsG', 'ironMg', 'calciumMg', 'fiberG'].includes(n.key));

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: '#94A3B8',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        Nutrition Preview
      </Text>

      {nutrientsToDisplay.map((nutrient) => {
        const current = getValue(nutrient.key);
        const target = PREGNANCY_NUTRITION_TARGETS[nutrient.key];
        const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);

        return (
          <View key={nutrient.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Emoji icon */}
            <Text style={{ fontSize: 13, width: 22 }}>{nutrient.emoji}</Text>

            {/* Label */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#64748B',
                width: 46,
              }}
            >
              {nutrient.label}
            </Text>

            {/* Bar */}
            <View
              style={{
                flex: 1,
                height: 6,
                backgroundColor: '#F1F5F9',
                borderRadius: 3,
                overflow: 'hidden',
                marginHorizontal: 8,
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: nutrient.color,
                  borderRadius: 3,
                }}
              />
            </View>

            {/* Value */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: pct > 0 ? nutrient.color : '#CBD5E1',
                width: 42,
                textAlign: 'right',
              }}
            >
              {current.toFixed(0)}/{target}{nutrient.unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

