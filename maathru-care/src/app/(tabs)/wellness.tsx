import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartPulse } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function WellnessScreen() {
  const router = useRouter();
  
  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
      <View className="w-20 h-20 bg-emerald-50 rounded-full items-center justify-center mb-6">
        <HeartPulse size={40} color="#15803D" />
      </View>
      <Text className="text-slate-900 text-2xl font-bold mb-2">Wellness</Text>
      <Text className="text-slate-500 text-center text-base mb-8 px-4">
        Wellness features are coming soon.
      </Text>
      
      <TouchableOpacity 
        onPress={() => router.push('/')}
        className="bg-emerald-600 px-8 py-3.5 rounded-full flex-row items-center active:opacity-90 shadow-sm"
      >
        <Text className="text-white font-semibold text-[15px]">Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
