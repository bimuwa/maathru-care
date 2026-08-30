import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCcw, ShieldAlert, Lock } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// UI Components
import { MealScanHeader } from '@/components/ui/MealScanHeader';
import { MealPlateCard } from '@/components/ui/MealPlateCard';
import { DateStrip } from '@/components/ui/DateStrip';
import { MealTypePicker, getSmartMealDefault } from '@/components/ui/MealTypePicker';
import { ScanActionButtons } from '@/components/ui/ScanActionButtons';
import { DetectionResultCard } from '@/components/ui/DetectionResultCard';
import { MealImagePreview } from '@/components/ui/MealImagePreview';
import { MealSaveSuccessModal } from '@/components/ui/MealSaveSuccessModal';
import { GDMFoodWarningModal, FoodWarning } from '@/components/ui/GDMFoodWarningModal';

// API & Services
import { analyzeMealImage, Detection } from '@/services/api/foodDetector';
import { mealService } from '@/services/mealService';
import { gdmCacheService } from '@/services/gdmCacheService';
import { ScanState, MealItem } from '@/types/meal';
import { ACTIVE_USER_ID } from '@/constants/userConfig';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';
import { GDMRiskResponse } from '@/types/gdm';

export default function DetectScreen() {
  const router = useRouter();

  // ── GDM Lock State ──────────────────────────────────────
  const [hasGdmRisk, setHasGdmRisk] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const checkRisk = async () => {
        const riskCat = await gdmCacheService.getRiskCategory(ACTIVE_USER_ID);
        if (isActive) {
          setHasGdmRisk(!!riskCat);
        }
      };
      checkRisk();
      return () => { isActive = false; };
    }, [])
  );

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── GDM Warning Modal state ─────────────────────────────
  const [showGdmWarning, setShowGdmWarning] = useState(false);
  const [gdmWarnings, setGdmWarnings] = useState<FoodWarning[]>([]);
  const [gdmRiskCategory, setGdmRiskCategory] = useState<GDMRiskResponse['riskCategory'] | null>(null);
  const [pendingMealItems, setPendingMealItems] = useState<MealItem[]>([]);
  const [pendingFoodNames, setPendingFoodNames] = useState<string[]>([]);

  // ── Save button animation ───────────────────────────────────
  const saveBtnScale = useRef(new Animated.Value(1)).current;
  const saveBtnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mealItems.length > 0 && scanState === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(saveBtnPulse, { toValue: 1.025, duration: 1200, useNativeDriver: true }),
          Animated.timing(saveBtnPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      saveBtnPulse.setValue(1);
      saveBtnPulse.stopAnimation();
    }
  }, [mealItems.length, scanState]);

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

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setMealItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, servingMultiplier: newQuantity } : item))
    );
  };

  // Commit pending items to the plate (called after warning modal dismissal)
  const commitPendingItems = (items: MealItem[]) => {
    setMealItems((prev) => {
      const nextItems = [...prev];
      for (const fetched of items) {
        const existingIndex = nextItems.findIndex((i) => i.foodId === fetched.foodId);
        if (existingIndex >= 0) {
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            servingMultiplier: nextItems[existingIndex].servingMultiplier + fetched.servingMultiplier,
          };
        } else {
          nextItems.push(fetched);
        }
      }
      return nextItems;
    });
    resetScanWorkspace();
  };

  const handleAddSelectedToMeal = async () => {
    if (selectedDetectionIds.length === 0) return;

    setIsLookingUp(true);

    // Group selected detections by food_id to count them
    const quantityMap: Record<string, { count: number; confidence: number }> = {};

    for (const id of selectedDetectionIds) {
      const index = parseInt(id.split('-').pop() || '0', 10);
      const detection = currentDetections[index];
      if (detection) {
        if (!quantityMap[detection.food_id]) {
          quantityMap[detection.food_id] = { count: 0, confidence: detection.confidence };
        }
        quantityMap[detection.food_id].count += 1;
        quantityMap[detection.food_id].confidence = Math.max(
          quantityMap[detection.food_id].confidence,
          detection.confidence
        );
      }
    }

    const fetchedItems: MealItem[] = [];

    for (const [foodId, data] of Object.entries(quantityMap)) {
      const nutritionData = await mealService.getNutritionForFood(foodId);
      if (nutritionData) {
        fetchedItems.push({
          id: Math.random().toString(36).substring(7),
          foodId: nutritionData.food_id,
          name: nutritionData.display_name,
          confidence: data.confidence,
          imageUri: imageUri || undefined,
          servingMultiplier: data.count,
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
          `Nutrition data for "${foodId}" is not in our database yet.`
        );
      }
    }

    setIsLookingUp(false);

    if (fetchedItems.length === 0) return;

    // ── GDM & Nutrition Warning Check ─────────────────────────────────
    try {
      const [riskCat, todayTotals] = await Promise.all([
        gdmCacheService.getRiskCategory(ACTIVE_USER_ID),
        mealService.getTodayTotals(ACTIVE_USER_ID),
      ]);

      // Totals from the new food (all items combined)
      const newSugar  = fetchedItems.reduce((s, i) => s + i.sugarG  * i.servingMultiplier, 0);
      const newCarbs  = fetchedItems.reduce((s, i) => s + i.carbsG  * i.servingMultiplier, 0);
      const newFat    = fetchedItems.reduce((s, i) => s + i.fatG    * i.servingMultiplier, 0);

      const warnings: FoodWarning[] = [];
      const sugarLimit = riskCat === 'High Risk' ? 20 : PREGNANCY_NUTRITION_TARGETS.sugarG;

      // Risk specific warnings
      if (riskCat === 'High Risk') {
        if (newSugar > 8)
          warnings.push({ severity: 'high', message: `🍬 Sugar: Adds ${newSugar.toFixed(1)}g (Today's total: ${(todayTotals.sugar + newSugar).toFixed(1)}g). High Risk GDM should keep per-meal sugar very low.` });
        if (newCarbs > 50)
          warnings.push({ severity: 'high', message: `🍞 Carbs: Adds ${newCarbs.toFixed(1)}g (Today's total: ${(todayTotals.carbs + newCarbs).toFixed(1)}g). This is high for a single meal.` });
      } else if (riskCat === 'Moderate Risk') {
        if (newSugar > 12)
          warnings.push({ severity: 'medium', message: `🍬 Sugar: Adds ${newSugar.toFixed(1)}g (Today's total: ${(todayTotals.sugar + newSugar).toFixed(1)}g). Consider smaller portions.` });
      } else if (!riskCat) {
        // Unknown risk: flag if it's generally high
        if (newSugar > 10)
          warnings.push({ severity: 'medium', message: `🍬 Sugar: This adds ${newSugar.toFixed(1)}g. (Total will be ${(todayTotals.sugar + newSugar).toFixed(1)}g). Is this safe for you?` });
        if (newCarbs > 60)
          warnings.push({ severity: 'medium', message: `🍞 Carbs: This adds ${newCarbs.toFixed(1)}g. (Total will be ${(todayTotals.carbs + newCarbs).toFixed(1)}g).` });
      }

      // Daily totals warnings
      if (todayTotals.sugar + newSugar > sugarLimit) {
        if (!warnings.some(w => w.message.includes('Sugar Limit'))) {
          warnings.push({ severity: riskCat === 'High Risk' ? 'high' : 'medium', message: `⚠️ Daily Sugar Limit: Total will be ${(todayTotals.sugar + newSugar).toFixed(1)}g, exceeding your ${sugarLimit}g limit.` });
        }
      }

      if (todayTotals.carbs + newCarbs > 200) {
        if (!warnings.some(w => w.message.includes('Carbs'))) {
          warnings.push({ severity: 'medium', message: `🍞 Carbs: Total will reach ${(todayTotals.carbs + newCarbs).toFixed(1)}g today. Consider a lighter option.` });
        }
      }

      if (newFat > 20) {
        warnings.push({ severity: 'info', message: `🥑 Fat: This food adds ${newFat.toFixed(1)}g of fat. Choose lean options where possible.` });
      }

      if (warnings.length > 0) {
        // Show warning modal
        setPendingMealItems(fetchedItems);
        setPendingFoodNames(fetchedItems.map((i) => i.name.replace(/_/g, ' ')));
        setGdmWarnings(warnings);
        setGdmRiskCategory(riskCat);
        setShowGdmWarning(true);
        return;
      }
    } catch {
      // If warning check fails, proceed without warning
    }

    // No warnings — add directly
    commitPendingItems(fetchedItems);
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
      
      // Show custom elegant modal instead of generic OS alert
      setShowSuccessModal(true);

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

  // ════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF9F6' }}>
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
            paddingTop: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#F5F5F4',
          }}
        >
          <Text
            style={{
              fontFamily: 'serif',
              fontSize: 16,
              fontWeight: '600',
              color: '#57534E',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            Select Date
          </Text>
          <DateStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </View>

        {/* ── Step 2: Meal Type ────────────────────────────── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: 18,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F5F5F4',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'serif',
              fontSize: 16,
              fontWeight: '600',
              color: '#57534E',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            What meal is this?
          </Text>
          <MealTypePicker selected={mealType} onSelect={setMealType} />
        </View>

        {/* ── Plate Card ───────────────────────────────────── */}
        <MealPlateCard
          items={mealItems}
          mealType={mealType}
          onRemoveItem={handleRemoveMealItem}
          onUpdateQuantity={handleUpdateQuantity}
        />

        {/* ── Divider before scan ───────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            <Text style={{ fontFamily: 'serif', fontSize: 14, color: '#64748B', marginHorizontal: 14, fontWeight: '600', letterSpacing: 0.5 }}>
              Scan Food
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
            borderTopColor: '#F5F5F4',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Animated.View style={{ transform: [{ scale: saveBtnScale }, { scale: saveBtnPulse }] }}>
            <TouchableOpacity
              onPress={handleFinishAndSave}
              disabled={isSaving}
              activeOpacity={0.88}
              style={{
                borderRadius: 30, // more rounded, pill-shape
                paddingVertical: 16,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexDirection: 'row',
                backgroundColor: isSaving ? '#10B981' : '#047857', // classic elegant green
                shadowColor: '#064E3B',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isSaving ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 12 }} />
                ) : (
                  <CheckCircle2 size={22} color="#A7F3D0" style={{ marginRight: 12 }} />
                )}
                <Text style={{ fontFamily: 'serif', fontSize: 18, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 }}>
                  {isSaving
                    ? 'Saving your meal...'
                    : `Save ${mealType} Plate`}
                </Text>
              </View>

              {!isSaving && (
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ── Success Modal ──────────────────────────────────────── */}
      <MealSaveSuccessModal
        visible={showSuccessModal}
        mealType={mealType}
        onViewWellness={() => {
          setShowSuccessModal(false);
          setMealItems([]);
          resetScanWorkspace();
          router.push('/wellness');
        }}
        onScanMore={() => {
          setShowSuccessModal(false);
          setMealItems([]);
          resetScanWorkspace();
        }}
      />

      {/* ── GDM Food Warning Modal ─────────────────────────────── */}
      <GDMFoodWarningModal
        visible={showGdmWarning}
        riskCategory={gdmRiskCategory}
        foodNames={pendingFoodNames}
        warnings={gdmWarnings}
        onAddAnyway={() => {
          setShowGdmWarning(false);
          commitPendingItems(pendingMealItems);
        }}
        onSkip={() => {
          setShowGdmWarning(false);
          setPendingMealItems([]);
          setPendingFoodNames([]);
          setGdmWarnings([]);
        }}
        onCheckRisk={() => {
          setShowGdmWarning(false);
          setPendingMealItems([]);
          setPendingFoodNames([]);
          setGdmWarnings([]);
          router.push('/wellness?tab=gdm');
        }}
      />

      {/* ── GDM Lock Modal (Blocks interaction if GDM is unchecked) ── */}
      <Modal visible={hasGdmRisk === false} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Lock size={40} color="#047857" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 12 }}>
              Scanner Locked
            </Text>
            <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
              To provide you with safe and personalized nutritional insights, we need to assess your Gestational Diabetes (GDM) risk first.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#047857', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
              onPress={() => router.push('/wellness?tab=gdm')}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginRight: 8 }}>Check GDM Risk Now</Text>
              <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
