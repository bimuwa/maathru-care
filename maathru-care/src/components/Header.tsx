import { View, Text, Image } from 'react-native';
import React from 'react';

export default function Header() {
  return (
    <View className="flex-row items-center justify-between mt-2 mb-6">
      <View>
        <Text className="text-3xl font-light text-slate-900 mb-1">Good Morning, Sarah</Text>
        <Text className="text-[15px] text-slate-600 font-medium">Your maternal care companion</Text>
        <View className="flex-row items-center mt-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-[13px] text-slate-400 font-medium tracking-wide">WEEK 24 OF PREGNANCY</Text>
        </View>
      </View>
      <View className="w-12 h-12 rounded-full border-[1.5px] border-emerald-100 overflow-hidden shadow-sm bg-slate-50 items-center justify-center">
        <Image
          source={{ uri: 'https://i.pravatar.cc/150?img=5' }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
    </View>
  );
}
