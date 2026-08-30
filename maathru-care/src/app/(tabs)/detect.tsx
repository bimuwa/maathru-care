import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';

// UI Components
import { MealScanHeader } from '@/components/ui/MealScanHeader';
import { MealPlateCard } from '@/components/ui/MealPlateCard';
import { DateStrip } from '@/components/ui/DateStrip';
import { MealTypePicker, getSmartMealDefault } from '@/components/ui/MealTypePicker';
import { ScanActionButtons } from '@/components/ui/ScanActionButtons';
import { DetectionResultCard } from '@/components/ui/DetectionResultCard';
import { MealImagePreview } from '@/components/ui/MealImagePreview';

// API & Services
import { analyzeMealImage, Detection } from '@/services/api/foodDetector';
import { mealService } from '@/services/mealService';
import { ScanState, MealItem } from '@/types/meal';
import { ACTIVE_USER_ID } from '@/constants/userConfig';

export default function DetectScreen() {
  const router = useRouter();

  // ── Meal session state ──────────────────────────────────────
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [mealType, setMealType] = useState<string>(getSmartMealDefault());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Active scan state ───────────────────────────────────────
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [selectedDetectionIds, setSelectedDetectionIds] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Loading states ──────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // ── Save button animation ───────────────────────────────────
  const saveBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
            onPress: () => router.back(),
          },
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

        // Auto-select detections above 50% confidence
        const defaultSelected = result.detections
          .filter((d) => d.confidence > 0.5)
          .map((d, i) => `${d.food_id}-${i}`);

        setSelectedDetectionIds(
          defaultSelected.length > 0
            ? defaultSelected
            : [`${result.detections[0].food_id}-0`]
        );
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
    } catch {
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
    } catch {
      Alert.alert('Gallery Error', 'Could not open the photo gallery.');
    }
  };

  const toggleDetection = (id: string) => {
    setSelectedDetectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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
            `Nutrition data for "${detection.food_id}" is not in our database yet.`
          );
        }
      }
    }

    setIsLookingUp(false);

    if (newMealItems.length > 0) {
      setMealItems((prev) => [...prev, ...newMealItems]);
      resetScanWorkspace();
    }
  };

  const handleRemoveMealItem = (idToRemove: string) => {
    setMealItems((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleFinishAndSave = async () => {
    if (mealItems.length === 0) return;
    if (isSaving) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(saveBtnScale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(saveBtnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setIsSaving(true);
    try {
      await mealService.saveMealSession(ACTIVE_USER_ID, mealType, selectedDate, mealItems);

      Alert.alert(
        '🎉 Meal Saved!',
        `Your ${mealType.toLowerCase()} has been saved successfully. Check Wellness to see your nutrition totals.`,
        [
          {
            text: 'View Wellness',
            onPress: () => {
              setMealItems([]);
              resetScanWorkspace();
              router.push('/wellness');
            },
          },
          {
            text: 'Scan More',
            onPress: () => {
              setMealItems([]);
              resetScanWorkspace();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error Saving Meal', error.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render: Scan workspace ──────────────────────────────────

  const renderScanWorkspace = () => {
    if (scanState === 'idle') {
      return (
        <View style={{ paddingBottom: 120, paddingTop: 8 }}>
          <ScanActionButtons
            onCamera={handleCamera}
            onGallery={handleGallery}
            hasItems={mealItems.length > 0}
          />
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Image preview */}
        <MealImagePreview
          imageUri={imageUri!}
          isAnalyzing={scanState === 'analyzing'}
          isCompressing={scanState === 'compressing'}
        />

        {/* Review state */}
        {scanState === 'review' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <CheckCircle2 size={20} color="#059669" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 }}>
                AI Detected
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 20 }}>
              Tap to select which foods to add to your plate. You can pick multiple.
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
                  imageUri={imageUri}
                />
              );
            })}

            {/* Action buttons */}
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleAddSelectedToMeal}
                disabled={selectedDetectionIds.length === 0 || isLookingUp}
                activeOpacity={0.85}
                style={{
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  marginBottom: 10,
                  backgroundColor:
                    selectedDetectionIds.length > 0 && !isLookingUp ? '#059669' : '#E2E8F0',
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: selectedDetectionIds.length > 0 ? 0.3 : 0,
                  shadowRadius: 10,
                  elevation: selectedDetectionIds.length > 0 ? 5 : 0,
                }}
              >
                {isLookingUp ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                ) : null}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color:
                      selectedDetectionIds.length > 0 && !isLookingUp ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  {isLookingUp ? 'Fetching nutrition data...' : '🍽️  Add to Plate'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={resetScanWorkspace}
                activeOpacity={0.7}
                style={{
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>
                  Retake / Discard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No detection state */}
        {scanState === 'no_detection' && (
          <View
            style={{
              alignItems: 'center',
              padding: 28,
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#F1F5F9',
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🤔</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#0F172A',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              No food detected
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#64748B',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              We couldn't find any food in that photo. Try taking another photo in brighter
              lighting, with the food filling the frame.
            </Text>
            <TouchableOpacity
              onPress={resetScanWorkspace}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#059669',
                paddingHorizontal: 28,
                paddingVertical: 13,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {scanState === 'error' && (
          <View
            style={{
              alignItems: 'center',
              padding: 28,
              backgroundColor: '#FFF5F5',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#FED7D7',
            }}
          >
            <AlertCircle size={44} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1A202C',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Analysis Failed
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#718096',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              {errorMsg || "We couldn't analyze your meal right now. Please try again."}
            </Text>

            <TouchableOpacity
              onPress={() => processImage(imageUri!)}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#059669',
                paddingHorizontal: 28,
                paddingVertical: 13,
                borderRadius: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <RefreshCcw size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetScanWorkspace}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 28,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ color: '#64748B', fontWeight: '600', fontSize: 15 }}>
                Retake Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading / analyzing state */}
        {(scanState === 'compressing' || scanState === 'analyzing') && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
              {scanState === 'compressing' ? 'Preparing your photo...' : '🔍 Identifying food...'}
            </Text>
            <Text
              style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 20 }}
            >
              Our AI is looking up nutritional information for your meal.
            </Text>
            <TouchableOpacity
              onPress={resetScanWorkspace}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      {/* Header */}
      <MealScanHeader
        onBack={handleBack}
        sessionName={mealType}
        itemCount={mealItems.length}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* ── Step 1: Date Strip ──────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#F0FDF4',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#94A3B8',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginBottom: 10,
            }}
          >
            Step 1 — Select Date
          </Text>
          <DateStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </View>

        {/* ── Step 2: Meal Type ────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: 14,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F0FDF4',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#94A3B8',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginBottom: 10,
            }}
          >
            Step 2 — What meal is this?
          </Text>
          <MealTypePicker selected={mealType} onSelect={setMealType} />
        </View>

        {/* ── Plate Card ───────────────────────────────────── */}
        <MealPlateCard
          items={mealItems}
          mealType={mealType}
          onRemoveItem={handleRemoveMealItem}
        />

        {/* ── Divider before scan ───────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            <Text style={{ fontSize: 12, color: '#94A3B8', marginHorizontal: 12, fontWeight: '600' }}>
              SCAN FOOD
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
          </View>
        </View>

        {/* ── Step 3: Scan Workspace ─────────────────────── */}
        {renderScanWorkspace()}
      </ScrollView>

      {/* ── Sticky Save Button (only when items exist & idle) ── */}
      {mealItems.length > 0 && scanState === 'idle' && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingVertical: 14,
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0FDF4',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Animated.View style={{ transform: [{ scale: saveBtnScale }] }}>
            <TouchableOpacity
              onPress={handleFinishAndSave}
              disabled={isSaving}
              activeOpacity={0.88}
              style={{
                borderRadius: 18,
                paddingVertical: 17,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                backgroundColor: isSaving ? '#A7F3D0' : '#059669',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.4,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Text style={{ fontSize: 18, marginRight: 10 }}>✅</Text>
              )}
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
                {isSaving
                  ? 'Saving your meal...'
                  : `Confirm & Save ${mealType}`}
              </Text>
              {!isSaving && (
                <ChevronRight size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
