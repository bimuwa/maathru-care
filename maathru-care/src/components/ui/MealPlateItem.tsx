import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';

interface MealPlateItemProps {
  name: string;
  confidence: number;
  onRemove: () => void;
}

export function MealPlateItem({ name, confidence, onRemove }: MealPlateItemProps) {
  const percentage = Math.round(confidence * 100);
  
  // Format the food name: replace underscores with spaces and capitalize
  const formattedName = name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  return (
    <View className="bg-white rounded-xl p-4 mb-2 flex-row items-center border border-emerald-100 shadow-sm">
      <View className="w-8 h-8 bg-emerald-50 rounded-full items-center justify-center mr-3">
        <CheckCircle2 size={16} color="#15803D" />
      </View>
      
      <View className="flex-1">
        <Text className="text-slate-900 font-semibold text-[15px]">
          {formattedName}
        </Text>
        <Text className="text-emerald-700 text-xs font-medium mt-0.5">
          {percentage}% AI match
        </Text>
      </View>

      <TouchableOpacity 
        onPress={onRemove}
        className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 active:bg-slate-100 ml-2"
        accessibilityLabel="Remove item"
      >
        <X size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}
