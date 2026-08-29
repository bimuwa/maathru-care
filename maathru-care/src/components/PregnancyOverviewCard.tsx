import { View, Text } from 'react-native';
import React from 'react';
import { HeartPulse } from 'lucide-react-native';

export default function PregnancyOverviewCard() {
  // Using 60% as the week 24 progress (24 / 40 weeks)
  return (
    <View className="bg-emerald-50 rounded-[24px] p-5 mb-6 shadow-sm border border-emerald-100/50">
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-emerald-900 text-lg font-bold mb-1">Week 24</Text>
          <Text className="text-emerald-700 font-medium text-[15px]">Your baby is growing beautifully</Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
          <HeartPulse size={20} color="#15803D" />
        </View>
      </View>
      
      <View className="mb-4">
        <View className="flex-row justify-between items-end mb-2">
          <Text className="text-emerald-900/70 text-xs font-semibold uppercase tracking-wider">Trimester 2</Text>
          <Text className="text-emerald-900 font-bold text-sm">60%</Text>
        </View>
        <View className="h-2 bg-emerald-200/50 rounded-full overflow-hidden">
          <View className="h-full w-[60%] bg-emerald-500 rounded-full" />
        </View>
      </View>
      
      <View className="bg-white/60 rounded-2xl p-4 flex-row items-center border border-white/40">
        <Text className="text-emerald-900 text-[14px] leading-5 font-medium flex-1">
          "You're entering an important stage of your baby's development. Nutrient absorption is key this week."
        </Text>
      </View>
    </View>
  );
}
