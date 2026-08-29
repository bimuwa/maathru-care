import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
      <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-6 border border-slate-200">
        <User size={40} color="#475569" />
      </View>
      <Text className="text-slate-900 text-2xl font-bold mb-2">Profile</Text>
      <Text className="text-slate-500 text-center text-base mb-8 px-4">
        Manage your personal information and preferences.
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
