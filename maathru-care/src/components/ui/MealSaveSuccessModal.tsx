import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Easing } from 'react-native';
import { Sparkles, ArrowRight, Plus } from 'lucide-react-native';

interface MealSaveSuccessModalProps {
  visible: boolean;
  mealType: string;
  onViewWellness: () => void;
  onScanMore: () => void;
}

export function MealSaveSuccessModal({
  visible,
  mealType,
  onViewWellness,
  onScanMore,
}: MealSaveSuccessModalProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(50);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', // dark overlay
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
            backgroundColor: '#FAF9F6',
            borderRadius: 28,
            padding: 32,
            width: '100%',
            maxWidth: 360,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 32,
            elevation: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
          }}
        >
          {/* Icon Header */}
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#ECFDF5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 1.5,
              borderColor: '#A7F3D0',
            }}
          >
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <View style={{ position: 'absolute', top: -6, right: -6 }}>
              <Sparkles size={20} color="#059669" />
            </View>
          </View>

          {/* Texts */}
          <Text
            style={{
              fontFamily: 'serif',
              fontSize: 26,
              fontWeight: '600',
              color: '#0F172A',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            Meal Saved!
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: '#64748B',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 32,
              paddingHorizontal: 10,
            }}
          >
            Your <Text style={{ fontWeight: '600', color: '#334155' }}>{mealType.toLowerCase()}</Text> has been saved successfully. Check Wellness to see your nutrition totals.
          </Text>

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: 12 }}>
            <TouchableOpacity
              onPress={onViewWellness}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#047857',
                paddingVertical: 16,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginRight: 8, letterSpacing: 0.3 }}>
                View Wellness
              </Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onScanMore}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#FFFFFF',
                paddingVertical: 16,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} color="#64748B" strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '600', color: '#64748B', letterSpacing: 0.3 }}>
                Scan More Food
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
