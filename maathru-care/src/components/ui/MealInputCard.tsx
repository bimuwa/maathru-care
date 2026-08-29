import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface MealInputCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  badge?: string;
  isPrimary?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function MealInputCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  isPrimary = false,
  onPress,
  disabled = false,
}: MealInputCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      className={`
        w-full flex-row items-center p-4 mb-3 rounded-2xl border
        ${isPrimary 
          ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
          : 'bg-white border-slate-200'
        }
        ${disabled ? 'opacity-60' : 'opacity-100'}
      `}
    >
      {/* Icon Container */}
      <View 
        className={`
          w-14 h-14 rounded-full items-center justify-center mr-4
          ${isPrimary ? 'bg-emerald-600' : 'bg-slate-100'}
        `}
      >
        <Icon 
          size={26} 
          color={isPrimary ? '#FFFFFF' : '#475569'} 
        />
      </View>

      {/* Text Content */}
      <View className="flex-1 justify-center">
        <View className="flex-row items-center">
          <Text 
            className={`
              text-[17px] font-bold mb-1
              ${isPrimary ? 'text-emerald-900' : 'text-slate-800'}
            `}
          >
            {title}
          </Text>
          {badge && (
            <View className={`ml-2 px-2 py-0.5 rounded-md ${isPrimary ? 'bg-emerald-200' : 'bg-slate-200'}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wider ${isPrimary ? 'text-emerald-800' : 'text-slate-600'}`}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text 
          className={`
            text-sm
            ${isPrimary ? 'text-emerald-700' : 'text-slate-500'}
          `}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
