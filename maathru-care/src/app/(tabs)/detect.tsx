import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Mic, Type, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';

// UI Components
import { MealScanHeader } from '@/components/ui/MealScanHeader';
import { MealInputCard } from '@/components/ui/MealInputCard';
import { MealImagePreview } from '@/components/ui/MealImagePreview';
import { DetectionResultCard } from '@/components/ui/DetectionResultCard';

// API
import { analyzeMealImage, Detection } from '@/services/api/foodDetector';

type ScanState = 'IDLE' | 'COMPRESSING' | 'ANALYZING' | 'RESULT' | 'ERROR' | 'NO_DETECTION';

export default function DetectScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>('IDLE');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted') {
          // We can handle permission gracefully in the UI if needed
        }
      }
    })();
  }, []);

  const resetState = () => {
    setState('IDLE');
    setImageUri(null);
    setDetections([]);
    setErrorMsg(null);
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setState('COMPRESSING');

    try {
      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 640 } }], // Resize to 640px width
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // 70% quality JPEG
      );

      setImageUri(manipulatedImage.uri);
      setState('ANALYZING');

      // Send to API
      const result = await analyzeMealImage(manipulatedImage.uri);

      if (result.success && result.count > 0 && result.detections.length > 0) {
        setDetections(result.detections);
        setState('RESULT');
      } else if (result.success && result.count === 0) {
        setState('NO_DETECTION');
      } else {
        setErrorMsg(result.error || 'Failed to analyze image');
        setState('ERROR');
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred during processing.');
      setState('ERROR');
    }
  };

  const handleCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1, // We compress it manually later to have finer control
      });

      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Camera Error', 'Could not open the camera.');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Gallery Error', 'Could not open the photo gallery.');
    }
  };

  const handlePlaceholder = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} is coming soon.`);
  };

  const handleLogMeal = () => {
    // Navigate back to home or a dedicated nutrition logging screen
    router.push('/');
  };

  const renderIdleState = () => (
    <View className="px-5 pt-6 pb-20">
      <Text className="text-2xl font-bold text-slate-900 mb-2">
        What did you eat today?
      </Text>
      <Text className="text-base text-slate-500 mb-8">
        Take a photo or choose a meal image to discover its nutritional insights.
      </Text>

      <MealInputCard
        title="Scan with Camera"
        subtitle="Take a photo of your meal"
        icon={Camera}
        badge="Recommended"
        isPrimary={true}
        onPress={handleCamera}
      />
      
      <MealInputCard
        title="Upload from Gallery"
        subtitle="Choose an existing meal photo"
        icon={ImageIcon}
        onPress={handleGallery}
      />
      
      <MealInputCard
        title="Voice Log"
        subtitle="Describe your meal by voice"
        icon={Mic}
        badge="Coming Soon"
        onPress={() => handlePlaceholder('Voice meal logging')}
        disabled={true}
      />
      
      <MealInputCard
        title="Text Description"
        subtitle="Describe what you ate"
        icon={Type}
        badge="Coming Soon"
        onPress={() => handlePlaceholder('Text meal logging')}
        disabled={true}
      />
    </View>
  );

  const renderAnalysisContent = () => (
    <View className="px-5 pt-4 pb-20">
      <MealImagePreview 
        imageUri={imageUri!} 
        isAnalyzing={state === 'ANALYZING'} 
        isCompressing={state === 'COMPRESSING'}
      />

      {state === 'RESULT' && (
        <View>
          <View className="flex-row items-center mb-4">
            <CheckCircle2 size={24} color="#15803D" className="mr-2" />
            <Text className="text-xl font-bold text-emerald-900">
              {detections.length} food items detected
            </Text>
          </View>
          <Text className="text-sm text-slate-600 mb-5">
            Your meal was successfully identified and is ready for nutritional assessment.
          </Text>

          {detections.map((detection, index) => (
            <DetectionResultCard 
              key={`${detection.food_id}-${index}`}
              foodName={detection.food_id}
              confidence={detection.confidence}
            />
          ))}

          <View className="mt-6 mb-4">
            <TouchableOpacity 
              onPress={handleLogMeal}
              className="bg-emerald-600 w-full py-4 rounded-2xl items-center shadow-sm active:opacity-90 mb-3"
            >
              <Text className="text-white font-semibold text-[16px]">
                Confirm & Log Meal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={resetState}
              className="bg-white border border-slate-200 w-full py-4 rounded-2xl items-center active:bg-slate-50"
            >
              <Text className="text-slate-700 font-medium text-[16px]">
                Retake / Scan Another
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {state === 'NO_DETECTION' && (
        <View className="items-center mt-4">
          <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
            <AlertCircle size={32} color="#94A3B8" />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
            We couldn't clearly identify your meal
          </Text>
          <Text className="text-base text-slate-500 mb-8 text-center px-4">
            Try taking another photo with better lighting and make sure the food is clearly visible.
          </Text>
          
          <TouchableOpacity 
            onPress={resetState}
            className="bg-emerald-600 w-full py-4 rounded-2xl items-center shadow-sm active:opacity-90"
          >
            <Text className="text-white font-semibold text-[16px]">
              Retake Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'ERROR' && (
        <View className="items-center mt-4">
          <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
            <AlertCircle size={32} color="#EF4444" />
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
            Something went wrong
          </Text>
          <Text className="text-base text-slate-500 mb-8 text-center px-4">
            {errorMsg}
          </Text>
          
          <TouchableOpacity 
            onPress={() => processImage(imageUri!)}
            className="bg-emerald-600 w-full py-4 rounded-2xl items-center shadow-sm active:opacity-90 mb-3"
          >
            <Text className="text-white font-semibold text-[16px]">
              Try Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={resetState}
            className="bg-white border border-slate-200 w-full py-4 rounded-2xl items-center active:bg-slate-50"
          >
            <Text className="text-slate-700 font-medium text-[16px]">
              Retake Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {(state === 'COMPRESSING' || state === 'ANALYZING') && (
        <View className="items-center mt-8">
           <TouchableOpacity 
            onPress={resetState}
            className="bg-white border border-slate-200 px-8 py-3 rounded-xl items-center active:bg-slate-50"
          >
            <Text className="text-slate-700 font-medium text-[15px]">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <MealScanHeader />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {state === 'IDLE' ? renderIdleState() : renderAnalysisContent()}
      </ScrollView>
    </View>
  );
}
