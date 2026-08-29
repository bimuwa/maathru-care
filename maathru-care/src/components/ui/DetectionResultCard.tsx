import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Utensils, CheckCircle2, Circle } from 'lucide-react-native';

interface DetectionResultCardProps {
  foodName: string;
  confidence: number;
  isSelected?: boolean;
  onToggle?: () => void;
}

export function DetectionResultCard({ foodName, confidence, isSelected = true, onToggle }: DetectionResultCardProps) {
  const percentage = Math.round(confidence * 100);
  
  // Format the food name: replace underscores with spaces and capitalize
  const formattedName = foodName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  return (
    <TouchableOpacity 
      onPress={onToggle}
      activeOpacity={0.8}
      className={`rounded-xl p-4 mb-3 flex-row items-center border shadow-sm ${
        isSelected 
          ? 'bg-emerald-50 border-emerald-200' 
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Checkbox / Icon */}
      <View className="mr-3">
        {isSelected ? (
          <CheckCircle2 size={24} color="#15803D" />
        ) : (
          <Circle size={24} color="#94A3B8" />
        )}
      </View>

      {/* Details */}
      <View className="flex-1">
        <Text className={`font-semibold text-[16px] mb-1 ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
          {formattedName}
        </Text>
        
        {/* Confidence Indicator */}
        <View className="flex-row items-center">
          <View className="flex-1 h-1.5 bg-slate-200 rounded-full mr-3 overflow-hidden">
            <View 
              className={`h-full rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-400'}`} 
              style={{ width: `${percentage}%` }} 
            />
          </View>
          <Text className={`text-xs font-medium w-12 text-right ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
            {percentage}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
