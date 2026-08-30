import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Camera, Image as ImageIcon, Plus, ScanLine } from 'lucide-react-native';

interface ScanActionButtonsProps {
  onCamera: () => void;
  onGallery: () => void;
  hasItems: boolean;
}

function PulseButton({
  children,
  onPress,
  delay = 0,
}: {
  children: React.ReactNode;
  onPress: () => void;
  delay?: number;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ScanActionButtons({ onCamera, onGallery, hasItems }: ScanActionButtonsProps) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Section title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        {hasItems ? (
          <Plus size={22} color="#059669" style={{ marginRight: 8 }} />
        ) : (
          <ScanLine size={22} color="#334155" style={{ marginRight: 8 }} />
        )}
        <Text
          style={{
            fontFamily: 'serif',
            fontSize: 20,
            fontWeight: '600',
            color: '#334155',
          }}
        >
          {hasItems ? 'Scan another food' : 'Scan your meal'}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          color: '#64748B',
          marginBottom: 20,
          lineHeight: 20,
        }}
      >
        {hasItems
          ? 'Add more items to your plate'
          : 'Take a photo or pick from gallery — AI will identify the food for you'}
      </Text>

      {/* Camera Button — Primary */}
      <PulseButton onPress={onCamera}>
        <View
          style={{
            borderRadius: 20,
            padding: 20,
            marginBottom: 12,
            backgroundColor: '#059669',
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          {/* Icon circle */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Camera size={26} color="#FFFFFF" strokeWidth={1.8} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              <Text
                style={{ fontFamily: 'serif', fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}
              >
                Scan with Camera
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 }}>
                  BEST
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              Tap to take a fresh photo of your food
            </Text>
          </View>

          {/* Arrow */}
          <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>→</Text>
        </View>
      </PulseButton>

      {/* Gallery Button — Secondary */}
      <TouchableOpacity
        onPress={onGallery}
        activeOpacity={0.8}
        style={{
          borderRadius: 20,
          padding: 20,
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Icon circle */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#EFF6FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <ImageIcon size={24} color="#3B82F6" strokeWidth={1.8} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'serif', fontSize: 18, fontWeight: '600', color: '#1E293B', marginBottom: 3 }}>
            Pick from Gallery
          </Text>
          <Text style={{ fontSize: 13, color: '#94A3B8' }}>
            Choose an existing photo from your phone
          </Text>
        </View>

        <Text style={{ fontSize: 20, color: '#CBD5E1' }}>→</Text>
      </TouchableOpacity>
    </View>
  );
}
