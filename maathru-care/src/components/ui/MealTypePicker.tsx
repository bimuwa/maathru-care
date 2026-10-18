import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface MealType {
  id: string;
  label: string;
  emoji: string;
  hours: [number, number]; // [start, end] hours for smart default
}

const MEAL_TYPES: MealType[] = [
  { id: 'Breakfast',      label: 'Breakfast',      emoji: '🌅', hours: [5, 10] },
  { id: 'Morning Snack',  label: 'Morn. Snack',    emoji: '☕', hours: [10, 12] },
  { id: 'Lunch',          label: 'Lunch',           emoji: '☀️', hours: [12, 15] },
  { id: 'Evening Snack',  label: 'Eve. Snack',      emoji: '🍪', hours: [15, 18] },
  { id: 'Dinner',         label: 'Dinner',          emoji: '🌙', hours: [18, 23] },
];

export function getSmartMealDefault(): string {
  const hour = new Date().getHours();
  const match = MEAL_TYPES.find(m => hour >= m.hours[0] && hour < m.hours[1]);
  return match?.id ?? 'Lunch';
}

interface MealTypePickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function MealTypePicker({ selected, onSelect }: MealTypePickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
    >
      {MEAL_TYPES.map((meal) => {
        const isSelected = selected === meal.id;

        return (
          <TouchableOpacity
            key={meal.id}
            onPress={() => onSelect(meal.id)}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 24,
              backgroundColor: isSelected ? '#059669' : '#F8FAFC',
              borderWidth: isSelected ? 0 : 1.5,
              borderColor: isSelected ? 'transparent' : '#E2E8F0',
              shadowColor: isSelected ? '#059669' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isSelected ? 0.25 : 0,
              shadowRadius: 8,
              elevation: isSelected ? 4 : 0,
            }}
          >
            <Text style={{ fontSize: 16, marginRight: 6 }}>{meal.emoji}</Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: isSelected ? '700' : '500',
                color: isSelected ? '#FFFFFF' : '#64748B',
                letterSpacing: 0.1,
              }}
            >
              {meal.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
