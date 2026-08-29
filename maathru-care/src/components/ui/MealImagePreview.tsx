import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Detection } from '@/services/api/foodDetector'; // Will use path alias if available, else relative

// Using relative path for robustness
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
  
  return (
    <View className="w-full aspect-square bg-slate-100 rounded-3xl overflow-hidden relative mb-6 shadow-sm border border-slate-200">
      <Image 
        source={{ uri: imageUri }} 
        className="w-full h-full"
        resizeMode="cover"
      />
      
      {/* Scanning / Loading Overlay */}
      {(isAnalyzing || isCompressing) && (
        <View className="absolute inset-0 bg-emerald-900/30 items-center justify-center">
          <View className="bg-white/90 p-4 rounded-2xl items-center justify-center shadow-lg">
            <ActivityIndicator size="large" color="#15803D" className="mb-2" />
            <View className="flex-row items-center">
              <Sparkles size={14} color="#0D9488" className="mr-1.5" />
              <Text className="text-emerald-900 font-semibold text-sm">
                {isCompressing ? 'Preparing photo...' : 'Analyzing meal...'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Optional: We could draw bounding boxes here using absolute positioning if the API provides accurate coords,
          but the prompt advises to prioritize clean UI over inaccurate boxes. For now, we omit the overlay boxes
          unless guaranteed accurate, to keep the maternal UI trustworthy. */}
    </View>
  );
}

// Added Text import since we use it above
import { Text } from 'react-native';
