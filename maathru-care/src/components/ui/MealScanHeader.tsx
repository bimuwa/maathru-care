import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MealScanHeaderProps {
  onBack?: () => void;
  sessionName?: string;
  itemCount?: number;
}

export function MealScanHeader({
  onBack,
  sessionName = 'Lunch',
  itemCount = 0,
}: MealScanHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#FFFFFF' }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#F0FDF4',
          marginTop: Platform.OS === 'android' ? 8 : 0,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#334155" strokeWidth={2} />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: '#0F172A',
              letterSpacing: -0.2,
            }}
          >
            Meal Scanner
          </Text>
          {itemCount > 0 ? (
            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 1 }}>
              {sessionName} · {itemCount} {itemCount === 1 ? 'item' : 'items'} on plate
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
              {sessionName} session
            </Text>
          )}
        </View>

        {/* AI Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F0FDF4',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}
        >
          <Sparkles size={12} color="#059669" />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#047857',
              marginLeft: 4,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            AI
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
