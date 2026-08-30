import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Mic, Type, AlertCircle, CheckCircle2, ChevronRight, UtensilsCrossed } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';

// UI Components
import { MealScanHeader } from '@/components/ui/MealScanHeader';
import { MealInputCard } from '@/components/ui/MealInputCard';
import { MealImagePreview } from '@/components/ui/MealImagePreview';
import { DetectionResultCard } from '@/components/ui/DetectionResultCard';
import { MealPlateItem } from '@/components/ui/MealPlateItem';

// API & Services
import { analyzeMealImage, Detection } from '@/services/api/foodDetector';
import { mealService } from '@/services/mealService';
import { ScanState, MealItem } from '@/types/meal';
import { ACTIVE_USER_ID } from '@/constants/userConfig';

export default function DetectScreen() {
  const router = useRouter();
  
  // Overall Meal Session State
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [mealType, setMealType] = useState<string>('Lunch'); // Example default
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Active Scan State
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    })();
  }, []);

  const resetScanWorkspace = () => {
    setScanState('idle');
    setImageUri(null);
    setCurrentDetections([]);
    setSelectedDetectionIds([]);
    setErrorMsg(null);
  };

  const handleBack = () => {
    if (mealItems.length > 0) {
      Alert.alert(
        'Leave meal session?',
        "Your scanned foods haven't been saved yet.",
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setScanState('compressing');
    setErrorMsg(null);

    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(manipulatedImage.uri);
      setScanState('analyzing');

      const result = await analyzeMealImage(manipulatedImage.uri);

      if (result.success && result.count > 0 && result.detections.length > 0) {
        setCurrentDetections(result.detections);
        
        // Select only the highest confidence one by default, or all > 0.5
        const defaultSelected = result.detections
          .filter(d => d.confidence > 0.5)
          .map((d, i) => `${d.food_id}-${i}`);
        
        setSelectedDetectionIds(defaultSelected.length > 0 ? defaultSelected : [result.detections[0].food_id + '-0']);
        setScanState('review');
      } else if (result.success && result.count === 0) {
        setScanState('no_detection');
      } else {
        setErrorMsg(result.error || 'Failed to analyze image');
        setScanState('error');
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred during processing.');
      setScanState('error');
    }
  };

  const handleCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1, 
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

  const toggleDetection = (id: string) => {
    setSelectedDetectionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddSelectedToMeal = async () => {
    if (selectedDetectionIds.length === 0) return;
    
    setIsLookingUp(true);
    const newMealItems: MealItem[] = [];
    
    for (const id of selectedDetectionIds) {
      const index = parseInt(id.split('-').pop() || '0', 10);
      const detection = currentDetections[index];
      
      if (detection) {
        // Query Supabase for nutrition info
        const nutritionData = await mealService.getNutritionForFood(detection.food_id);
        
        if (nutritionData) {
          newMealItems.push({
            id: Math.random().toString(36).substring(7),
            foodId: nutritionData.food_id,
            name: nutritionData.display_name,
            confidence: detection.confidence,
            imageUri: imageUri || undefined,
            servingMultiplier: 1.0,
            carbsG: nutritionData.carbs_g || 0,
            sugarG: nutritionData.sugar_g || 0,
            fiberG: nutritionData.fiber_g || 0,
            fatG: nutritionData.fat_g || 0,
            ironMg: nutritionData.iron_mg || 0,
            calciumMg: nutritionData.calcium_mg || 0,
            timestamp: Date.now(),
          });
        } else {
          Alert.alert(
            'Missing Nutrition Info',
            `Nutrition data for ${detection.food_id} is unavailable.`
          );
        }
      }
    }
    
    setIsLookingUp(false);
    
    if (newMealItems.length > 0) {
      setMealItems(prev => [...prev, ...newMealItems]);
      resetScanWorkspace();
    }
  };

  const handleRemoveMealItem = (idToRemove: string) => {
    setMealItems(prev => prev.filter(item => item.id !== idToRemove));
  };

  const handleFinishAndSave = async () => {
    if (mealItems.length === 0) return;
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await mealService.saveMealSession(
        ACTIVE_USER_ID,
        mealType,
        selectedDate,
        mealItems
      );
      
      Alert.alert('Meal Saved', 'Your meal has been successfully logged.', [
        {
          text: 'View Dashboard',
          onPress: () => {
             // Reset state
             setMealItems([]);
             resetScanWorkspace();
             router.push('/wellness');
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error Saving Meal', error.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Rendering Sections ---

  const renderMealPlate = () => {
    if (mealItems.length === 0) {
      return (
        <View className="bg-white mx-4 mt-4 p-6 rounded-2xl border border-slate-100 shadow-sm items-center">
          <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3">
            <UtensilsCrossed size={32} color="#94A3B8" />
          </View>
          <Text className="text-lg font-bold text-slate-800 mb-1">
            Your plate is empty
          </Text>
          <Text className="text-slate-500 text-center text-sm">
            Scan a food item to start building your meal.
          </Text>
        </View>
      );
    }

    return (
      <View className="px-4 mt-6 mb-2">
        <View className="flex-row justify-between items-end mb-3">
          <Text className="text-lg font-bold text-slate-900">{mealType} Tray</Text>
          <Text className="text-emerald-700 font-medium text-sm">{mealItems.length} {mealItems.length === 1 ? 'item' : 'items'}</Text>
        </View>
        
        {/* Simple Meal Type Selector for demo (expand later) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
           {['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'].map((type) => (
             <TouchableOpacity 
                key={type} 
                onPress={() => setMealType(type)}
                className={`mr-2 px-4 py-2 rounded-full border ${mealType === type ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-slate-200'}`}
             >
                <Text className={`${mealType === type ? 'text-emerald-800 font-bold' : 'text-slate-600'}`}>{type}</Text>
             </TouchableOpacity>
           ))}
        </ScrollView>
        
        {mealItems.map(item => (
          <MealPlateItem 
            key={item.id}
            name={item.name}
            confidence={item.confidence}
            onRemove={() => handleRemoveMealItem(item.id)}
          />
        ))}
        
        {/* Footer actions when there are items */}
        {scanState === 'idle' && (
          <View className="mt-4">
            <TouchableOpacity 
              onPress={handleFinishAndSave}
              disabled={isSaving}
              className={`w-full py-4 rounded-xl items-center shadow-sm flex-row justify-center ${isSaving ? 'bg-emerald-400' : 'bg-emerald-600 active:bg-emerald-700'}`}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              ) : null}
              <Text className="text-white font-semibold text-[16px] mr-2">
                {isSaving ? 'Saving your meal...' : 'Finish & Save Meal Plate'}
              </Text>
              {!isSaving && <ChevronRight size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderScanWorkspace = () => {
    if (scanState === 'idle') {
      return (
        <View className="px-4 pt-8 pb-10">
          <Text className="text-xl font-bold text-slate-900 mb-2">
            {mealItems.length === 0 ? "Add food to your meal" : "Scan another food"}
          </Text>
          <Text className="text-[15px] text-slate-500 mb-6">
            Take a photo or choose a meal image and let AI identify the food items.
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
            title="Pick from Gallery"
            subtitle="Choose an existing meal photo"
            icon={ImageIcon}
            onPress={handleGallery}
          />
          
          <MealInputCard
            title="Voice Log"
            subtitle="Describe your meal by voice"
            icon={Mic}
            badge="Coming Soon"
            onPress={() => Alert.alert('Coming Soon', 'Voice logging is coming soon.')}
            disabled={true}
          />
          
          <MealInputCard
            title="Text Description"
            subtitle="Describe what you ate"
            icon={Type}
            badge="Coming Soon"
            onPress={() => Alert.alert('Coming Soon', 'Text logging is coming soon.')}
            disabled={true}
          />
        </View>
      );
    }

    return (
      <View className="px-4 pt-6 pb-20">
        <Text className="text-xl font-bold text-slate-900 mb-4">
          Scan Workspace
        </Text>
        
        <MealImagePreview 
          imageUri={imageUri!} 
          isAnalyzing={scanState === 'analyzing'} 
          isCompressing={scanState === 'compressing'}
        />

        {scanState === 'review' && (
          <View className="mt-6">
            <View className="flex-row items-center mb-2">
              <CheckCircle2 size={20} color="#0D9488" className="mr-2" />
              <Text className="text-lg font-bold text-slate-900">
                AI Suggested Matches
              </Text>
            </View>
            <Text className="text-[15px] text-slate-600 mb-5">
              Please check that these foods are correct before adding them to your meal.
            </Text>

            {currentDetections.map((detection, index) => {
              const uniqueId = `${detection.food_id}-${index}`;
              const isSelected = selectedDetectionIds.includes(uniqueId);
              
              return (
                <DetectionResultCard 
                  key={uniqueId}
                  foodName={detection.food_id}
                  confidence={detection.confidence}
                  isSelected={isSelected}
                  onToggle={() => toggleDetection(uniqueId)}
                />
              );
            })}

            <View className="mt-6 mb-4">
              <TouchableOpacity 
                onPress={handleAddSelectedToMeal}
                disabled={selectedDetectionIds.length === 0 || isLookingUp}
                className={`w-full py-4 rounded-xl items-center flex-row justify-center shadow-sm mb-3 ${selectedDetectionIds.length > 0 ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-slate-200'}`}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                ) : null}
                <Text className={`font-semibold text-[16px] ${selectedDetectionIds.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                  {isLookingUp ? 'Fetching Nutrition...' : '+ Add Selected to Meal Plate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={resetScanWorkspace}
                className="bg-white border border-slate-200 w-full py-4 rounded-xl items-center active:bg-slate-50"
              >
                <Text className="text-slate-700 font-semibold text-[16px]">
                  Discard & Retake
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {scanState === 'no_detection' && (
          <View className="items-center mt-6 p-6 bg-white rounded-2xl border border-slate-100">
            <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4">
              <AlertCircle size={32} color="#94A3B8" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2 text-center">
              No food detected
            </Text>
            <Text className="text-[15px] text-slate-500 mb-6 text-center">
              We couldn't clearly identify any food in this image. Try taking another photo with better lighting.
            </Text>
            
            <TouchableOpacity 
              onPress={resetScanWorkspace}
              className="bg-emerald-600 w-full py-3.5 rounded-xl items-center shadow-sm active:bg-emerald-700"
            >
              <Text className="text-white font-semibold text-[16px]">
                Retake Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {scanState === 'error' && (
          <View className="items-center mt-6 p-6 bg-white rounded-2xl border border-red-100">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <AlertCircle size={32} color="#EF4444" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2 text-center">
              Analysis Failed
            </Text>
            <Text className="text-[15px] text-slate-500 mb-6 text-center">
              {errorMsg || "We couldn't analyze this meal right now."}
            </Text>
            
            <TouchableOpacity 
              onPress={() => processImage(imageUri!)}
              className="bg-emerald-600 w-full py-3.5 rounded-xl items-center shadow-sm active:bg-emerald-700 mb-3"
            >
              <Text className="text-white font-semibold text-[16px]">
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={resetScanWorkspace}
              className="bg-white border border-slate-200 w-full py-3.5 rounded-xl items-center active:bg-slate-50"
            >
              <Text className="text-slate-700 font-semibold text-[16px]">
                Retake Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(scanState === 'compressing' || scanState === 'analyzing') && (
          <View className="items-center mt-8">
            <Text className="text-lg font-bold text-slate-800 mb-1">
              Analyzing your meal...
            </Text>
            <Text className="text-slate-500 text-center mb-6">
              Identifying food items and preparing your nutrition insights.
            </Text>
             <TouchableOpacity 
              onPress={resetScanWorkspace}
              className="bg-white border border-slate-200 px-8 py-3 rounded-xl items-center active:bg-slate-50"
            >
              <Text className="text-slate-700 font-medium text-[15px]">
                Cancel & Retake
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <MealScanHeader onBack={handleBack} sessionName={mealType} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderMealPlate()}
        
        {mealItems.length > 0 && scanState === 'idle' && (
          <View className="h-px bg-slate-200 mx-4 mt-6 mb-2" />
        )}
        
        {renderScanWorkspace()}
      </ScrollView>
    </View>
  );
}
