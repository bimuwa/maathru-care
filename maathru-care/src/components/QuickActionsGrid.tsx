import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Utensils, HeartPulse, MessageCircleHeart, Users2 } from 'lucide-react-native';

export default function QuickActionsGrid() {
  return (
    <View className="mb-8">
      <Text className="text-slate-900 font-semibold text-[19px] mb-4">Explore Maathru Care</Text>
      
      <View className="flex-row flex-wrap justify-between">
        <ActionItem 
          icon={<Utensils size={24} color="#15803D" />} 
          title="Meal Plans" 
          description="Customized for you"
        />
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
        <ActionItem 
          icon={<Users2 size={24} color="#9333EA" />} 
          title="Community" 
          description="Connect with mothers"
        />
      </View>
    </View>
  );
}

function ActionItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <TouchableOpacity className="w-[48%] bg-white p-4 rounded-[20px] mb-4 border border-slate-100 shadow-sm items-center active:bg-slate-50">
      <View className="w-12 h-12 rounded-[14px] bg-slate-50 items-center justify-center mb-3 border border-slate-100/50">
        {icon}
      </View>
      <Text className="text-slate-900 font-semibold text-[15px] mb-1">{title}</Text>
      <Text className="text-slate-500 text-[11px] font-medium text-center leading-4">{description}</Text>
    </TouchableOpacity>
  );
}
