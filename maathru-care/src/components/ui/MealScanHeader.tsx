import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function MealScanHeader() {
  const router = useRouter();

  return (
    <SafeAreaView className="bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100" style={{ marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-slate-50"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Title */}
        <Text className="text-lg font-bold text-slate-900">
          Maternal Meal Scanner
        </Text>

        {/* AI Badge */}
        <View className="flex-row items-center bg-teal-50 px-2 py-1.5 rounded-full border border-teal-100">
          <Sparkles size={12} color="#0D9488" className="mr-1" />
          <Text className="text-teal-700 text-[10px] font-semibold uppercase tracking-wider">
            AI Powered
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
