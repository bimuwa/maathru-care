import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Camera, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AiNutritionCard() {
  return (
    <View className="mb-6 rounded-[28px] overflow-hidden shadow-sm">
      <LinearGradient
        colors={['#0D9488', '#15803D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-6 relative"
      >
        {/* Decorative background shapes */}
        <View className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <View className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl" />

        <View className="flex-row items-center mb-3">
          <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center border border-white/20">
            <Sparkles size={14} color="#ffffff" />
            <Text className="text-white text-xs font-semibold ml-1.5 tracking-wide uppercase">AI Powered</Text>
          </View>
        </View>

        <Text className="text-white text-[22px] font-bold mb-2">Dietary Analysis</Text>
        <Text className="text-emerald-50 text-[15px] font-medium leading-6 mb-6 opacity-90 pr-4">
          Get instant nutritional insights from your meals using your camera.
        </Text>

        <TouchableOpacity 
          className="bg-white rounded-[16px] flex-row justify-center items-center py-4 px-6 shadow-sm active:opacity-90"
        >
          <Camera size={20} color="#15803D" />
          <Text className="text-emerald-700 font-bold text-base ml-2">Detect My Meal</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}
