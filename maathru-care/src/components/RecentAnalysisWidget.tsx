import { View, Text } from 'react-native';
import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react-native';

export default function RecentAnalysisWidget() {
  return (
    <View className="bg-white rounded-[22px] p-5 mb-8 border border-slate-100 shadow-sm">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-slate-900 font-semibold text-[17px]">Recent Analysis</Text>
        <ChevronRight size={20} color="#94A3B8" />
      </View>
      
      <View className="flex-row items-start mb-4">
        <View className="w-12 h-12 bg-emerald-50 rounded-[14px] items-center justify-center mr-3 border border-emerald-100/50">
          <Text className="text-[20px]">🥗</Text>
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-[15px] mb-0.5">Rice & Vegetable Curry</Text>
          <View className="flex-row items-center">
            <CheckCircle2 size={14} color="#15803D" />
            <Text className="text-emerald-700 text-[13px] font-medium ml-1">Good nutritional balance</Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
        <NutrientItem label="Protein" value="12g" />
        <View className="w-[1px] h-full bg-slate-200 mx-2" />
        <NutrientItem label="Iron" value="3mg" />
        <View className="w-[1px] h-full bg-slate-200 mx-2" />
        <NutrientItem label="Folate" value="45mcg" />
        <View className="w-[1px] h-full bg-slate-200 mx-2" />
        <NutrientItem label="Cals" value="320" />
      </View>
    </View>
  );
}

function NutrientItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center px-1">
      <Text className="text-slate-900 font-bold text-[14px] mb-0.5">{value}</Text>
      <Text className="text-slate-500 text-[11px] font-medium">{label}</Text>
    </View>
  );
}
