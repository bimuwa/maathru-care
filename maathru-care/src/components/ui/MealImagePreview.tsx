import React, { useEffect, useRef } from 'react';
import { View, Image, ActivityIndicator, Text, Animated, Easing } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Detection as DetectionType } from '../../services/api/foodDetector';

interface MealImagePreviewProps {
  imageUri: string;
  isAnalyzing: boolean;
  isCompressing?: boolean;
  detections?: DetectionType[];
}

export function MealImagePreview({
  imageUri,
  isAnalyzing,
  isCompressing,
  detections = []
}: MealImagePreviewProps) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing || isCompressing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scanAnim.setValue(0);
    }
  }, [isAnalyzing, isCompressing]);

  const scanTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '98%'],
  });

  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#F8FAFC', borderRadius: 24, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}>
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* Scanning / Loading Overlay */}
      {(isAnalyzing || isCompressing) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.25)', overflow: 'hidden' }}>

          {/* Animated Scan Line */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: '#34D399',
              top: scanTop,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 15,
              elevation: 10,
            }}
          >
            {/* Glowing trail above the line */}
            <View style={{ position: 'absolute', bottom: 3, left: 0, right: 0, height: 80, backgroundColor: 'rgba(52, 211, 153, 0.2)' }} />
          </Animated.View>

          {/* Centered Status Badge */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              paddingHorizontal: 22,
              paddingVertical: 16,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10
            }}>
              <ActivityIndicator size="small" color="#059669" style={{ marginBottom: 8, transform: [{ scale: 1.1 }] }} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: 'serif', color: '#047857', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }}>
                  {isCompressing ? 'Preparing photo...' : 'Scanning meal...'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
