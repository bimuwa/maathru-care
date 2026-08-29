import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MealScanHeaderProps {
  onBack?: () => void;
  sessionName?: string;
}

export function MealScanHeader({ onBack, sessionName = "Lunch Session" }: MealScanHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100" style={{ marginTop: Platform.OS === 'android' ? 30 : 0 }}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center -ml-2 rounded-full active:bg-slate-50"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* Title & Session */}
        <View className="flex-1 items-center mr-2">
          <Text className="text-lg font-bold text-slate-900">
            Maternal Meal Scanner
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Clock size={10} color="#64748B" className="mr-1" />
            <Text className="text-slate-500 text-xs font-medium">
              {sessionName}
            </Text>
          </View>
        </View>

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
