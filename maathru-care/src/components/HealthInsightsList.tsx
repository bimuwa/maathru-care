import { View, Text } from 'react-native';
import React from 'react';
import { CalendarDays, Droplet, Target } from 'lucide-react-native';

export default function HealthInsightsList() {
  return (
    <View className="mb-8">
      <Text className="text-slate-900 font-semibold text-[19px] mb-4">Your Health Today</Text>
      
      <View className="flex-row justify-between">
        {/* Card 1 - Nutrient Goal */}
        <View className="bg-white p-4 rounded-[20px] border border-slate-100 flex-1 mr-3 shadow-sm">
          <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <Target size={16} color="#15803D" />
          </View>
          <Text className="text-slate-600 font-medium text-[13px] mb-1">Folic Acid</Text>
          <Text className="text-slate-900 font-bold text-lg mb-2">60%</Text>
          <View className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
            <View className="h-full w-[60%] bg-emerald-500 rounded-full" />
          </View>
          <Text className="text-slate-400 text-[11px] font-medium">Daily goal</Text>
        </View>

        {/* Card 2 - Hydration */}
        <View className="bg-white p-4 rounded-[20px] border border-slate-100 flex-1 mr-3 shadow-sm">
          <View className="w-8 h-8 rounded-full bg-teal-50 items-center justify-center mb-3">
            <Droplet size={16} color="#0D9488" />
          </View>
          <Text className="text-slate-600 font-medium text-[13px] mb-1">Hydration</Text>
          <Text className="text-slate-900 font-bold text-lg mb-2">5 <Text className="text-slate-400 text-sm font-medium">/ 8</Text></Text>
          <View className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
            <View className="h-full w-[62%] bg-teal-500 rounded-full" />
          </View>
          <Text className="text-slate-400 text-[11px] font-medium">Glasses</Text>
        </View>

        {/* Card 3 - Next Check-up */}
        <View className="bg-white p-4 rounded-[20px] border border-slate-100 flex-1 shadow-sm">
          <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center mb-3">
            <CalendarDays size={16} color="#F43F5E" />
          </View>
          <Text className="text-slate-600 font-medium text-[13px] mb-1">Check-up</Text>
          <Text className="text-slate-900 font-bold text-[15px] leading-5 mb-1">Sep 12</Text>
          <Text className="text-slate-500 font-medium text-[13px] mb-1">10:30 AM</Text>
        </View>
      </View>
    </View>
  );
}
