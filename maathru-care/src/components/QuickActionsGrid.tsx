import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Activity, ScanLine, HeartPulse, MessageCircleHeart, Users2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function QuickActionsGrid() {
  const router = useRouter();

  return (
    <View className="mb-8">
      <Text className="text-slate-900 font-semibold text-[19px] mb-4">Explore Maathru Care</Text>
      
      <View className="flex-row flex-wrap justify-between">
        {/* Maternal Care — routes to the GDM risk & nutrition dashboard */}
        <ActionItem 
          icon={<Activity size={24} color="#059669" />} 
          title="Maternal Care" 
          description="Nutrition & GDM risk"
          onPress={() => router.push('/(tabs)/wellness')}
        />
        {/* Meal Scan — routes to the AI food detection screen */}
        <ActionItem 
          icon={<ScanLine size={24} color="#15803D" />} 
          title="Meal Scan" 
          description="Scan & log your meals"
          onPress={() => router.push('/(tabs)/detect')}
        />
        {/* Wellness — reserved for teammate's daily symptoms feature */}
        <ActionItem 
          icon={<HeartPulse size={24} color="#0D9488" />} 
          title="Wellness" 
          description="Exercises & mindfulness"
        />
        <ActionItem 
          icon={<MessageCircleHeart size={24} color="#0284C7" />} 
          title="Talk to Expert" 
          description="24/7 medical support"
        />
      </View>
    </View>
  );
}

function ActionItem({ 
  icon, 
  title, 
  description, 
  onPress 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity 
      className="w-[48%] bg-white p-4 rounded-[20px] mb-4 border border-slate-100 shadow-sm items-center active:bg-slate-50"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="w-12 h-12 rounded-[14px] bg-slate-50 items-center justify-center mb-3 border border-slate-100/50">
        {icon}
      </View>
      <Text className="text-slate-900 font-semibold text-[15px] mb-1">{title}</Text>
      <Text className="text-slate-500 text-[11px] font-medium text-center leading-4">{description}</Text>
    </TouchableOpacity>
  );
}
