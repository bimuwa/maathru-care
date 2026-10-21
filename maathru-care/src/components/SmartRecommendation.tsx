import { View, Text } from 'react-native';
import React from 'react';
import { Lightbulb } from 'lucide-react-native';

export default function SmartRecommendation() {
  return (
    <View className="bg-amber-50 rounded-[20px] p-5 mb-8 border border-amber-100 flex-row shadow-sm">
      <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-4">
        <Lightbulb size={20} color="#D97706" />
      </View>
      <View className="flex-1">
        <Text className="text-amber-900 font-semibold text-[15px] mb-1">Today's Recommendation</Text>
        <Text className="text-amber-800 font-bold text-[14px] leading-5 mb-1">Add an iron-rich food to your lunch</Text>
        <Text className="text-amber-700/80 text-[13px] leading-5">Try spinach, lentils, or other iron-rich foods today to support your baby's development.</Text>
      </View>
    </View>
  );
}
