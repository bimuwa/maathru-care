import React from 'react';
import { View, Text } from 'react-native';
import { Utensils } from 'lucide-react-native';

interface DetectionResultCardProps {
  foodName: string;
  confidence: number;
}

export function DetectionResultCard({ foodName, confidence }: DetectionResultCardProps) {
  const percentage = Math.round(confidence * 100);
  
  // Format the food name: replace underscores with spaces and capitalize
  const formattedName = foodName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  return (
    <View className="bg-white rounded-xl p-4 mb-3 flex-row items-center border border-slate-100 shadow-sm">
      {/* Icon */}
      <View className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center mr-4">
        <Utensils size={20} color="#15803D" />
      </View>

      {/* Details */}
      <View className="flex-1">
        <Text className="text-slate-900 font-semibold text-[16px] mb-1">
          {formattedName}
        </Text>
        
        {/* Confidence Indicator */}
        <View className="flex-row items-center">
          <View className="flex-1 h-1.5 bg-slate-100 rounded-full mr-3 overflow-hidden">
            <View 
              className="h-full bg-teal-500 rounded-full" 
              style={{ width: `${percentage}%` }} 
            />
          </View>
          <Text className="text-slate-500 text-xs font-medium w-12 text-right">
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
}
