import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCcw, ShieldAlert, Lock, Search, Utensils, ArrowLeft, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// UI Components
import { MealScanHeader } from '@/components/ui/MealScanHeader';
import { MealPlateCard } from '@/components/ui/MealPlateCard';
import { DateStrip } from '@/components/ui/DateStrip';
import { MealTypePicker, getSmartMealDefault } from '@/components/ui/MealTypePicker';
import { ScanActionButtons } from '@/components/ui/ScanActionButtons';
import { MealImagePreview } from '@/components/ui/MealImagePreview';
import { MealSaveSuccessModal } from '@/components/ui/MealSaveSuccessModal';
import { FoodDiaryAuthModal } from '@/components/ui/FoodDiaryAuthModal';
import { FoodDiaryHistory } from '@/components/ui/FoodDiaryHistory';

// API & Services
import { supabase } from '@/lib/supabase';
import { analyzeMealImage } from '@/services/api/foodDetector';
import { useAuth } from '@/context/AuthContext';
import { foodDiaryService, newDiaryRequestId } from '@/services/foodDiaryService';
import { mealService } from '@/services/mealService';
import { gdmCacheService } from '@/services/gdmCacheService';
import { ScanState, MealItem } from '@/types/meal';
import {
  mapFoodNutritionRecord,
  type PortionUnit,
} from '@/services/nutritionCalculator';
import { adjustEstimatedQuantity, createEstimatedPreviewItem, groupDetectionEvidence, type RawFoodDetection } from '@/services/foodQuantitySuggestions';

export default function DetectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scanRequestId = useRef(0);
  const referenceVersions = useRef(new Map<string, number>());
  const mounted = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  const plateTop = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; scanRequestId.current += 1; }; }, []);
  const { user } = useAuth();
  const userId = user?.id || '';

  // ── GDM Lock State ──────────────────────────────────────
  const [hasGdmRisk, setHasGdmRisk] = useState<boolean | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [dismissGdmLock, setDismissGdmLock] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      let isActive = true;
      const checkRisk = async () => {
        const riskCat = await gdmCacheService.getRiskCategory(userId);
        if (isActive) {
          setHasGdmRisk(!!riskCat);
        }
      };
      checkRisk();
      return () => {
        isActive = false;
        setIsFocused(false);
      };
    }, [userId])
  );

  const { date, viewDiary } = useLocalSearchParams<{ date?: string; viewDiary?: string }>();

  // ── Meal session state ──────────────────────────────────────
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const hasSelectedPortion = mealItems.some((item) => item.portion && Number.isFinite(item.portion.amount) && item.portion.amount > 0);
  const previousPlateCount = useRef(0);
  useEffect(() => {
    if (mealItems.length > previousPlateCount.current) {
      scrollRef.current?.scrollTo({ y: plateTop.current, animated: true });
    }
    previousPlateCount.current = mealItems.length;
  }, [mealItems.length]);
  const [mealType, setMealType] = useState<string>(getSmartMealDefault());

  const initialDate = React.useMemo(() => {
    if (!date) return new Date();
    const [y, m, d] = date.split('-');
    if (y && m && d) return new Date(Number(y), Number(m) - 1, Number(d));
    return new Date();
  }, [date]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  // A dashboard deep link can reach an already mounted scanner route.
  useEffect(() => {
    if (date) setSelectedDate(initialDate);
  }, [date, initialDate]);

  // ── Active scan state ───────────────────────────────────────
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(4 / 3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Loading states ──────────────────────────────────────────
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [diarySession, setDiarySession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [isDiaryReady, setIsDiaryReady] = useState(false);
  const [isCheckingDiarySetup, setIsCheckingDiarySetup] = useState(false);
  const [showDiaryAuth, setShowDiaryAuth] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [savedMealsRefresh, setSavedMealsRefresh] = useState(0);
  const saveRequest = useRef<{ id: string; signature: string } | null>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void foodDiaryService.getSession().then((session) => { if (active) setDiarySession(session); }).catch((error) => {
      console.warn('[FoodDiary] Could not restore diary session:', error);
    });
    const { data: { subscription } } = foodDiaryService.onAuthStateChange((session) => {
      if (active) setDiarySession(session);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!diarySession?.user?.id) { setIsDiaryReady(false); setIsCheckingDiarySetup(false); return; }
    setIsCheckingDiarySetup(true);
    void foodDiaryService.checkReady().then((ready) => { if (active) setIsDiaryReady(ready); })
      .catch(() => { if (active) setIsDiaryReady(false); })
      .finally(() => { if (active) setIsCheckingDiarySetup(false); });
    return () => { active = false; };
  }, [diarySession?.user?.id]);

  const handleSaveMeal = async () => {
    const selectedItems = mealItems.filter((item) => item.portion && Number.isFinite(item.portion.amount) && item.portion.amount > 0);
    if (saveInFlight.current || isSavingMeal || selectedItems.length === 0) return;
    if (!diarySession?.user?.id) { setShowDiaryAuth(true); return; }
    if (!isDiaryReady) { Alert.alert('Diary setup incomplete', 'Food Diary saving is enabled after the database migration is applied and verified.'); return; }
    const localDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const signature = JSON.stringify({
      date: localDate,
      mealType,
      items: selectedItems.map((item) => ({
        id: item.id,
        foodId: item.nutritionRecord?.foodId ?? null,
        name: item.name,
        portion: item.portion,
        nutrients: item.calculatedNutrients,
        provenance: item.quantity?.provenance ?? null,
      })),
    });
    if (!saveRequest.current || saveRequest.current.signature !== signature) {
      saveRequest.current = { id: newDiaryRequestId(), signature };
    }
    const requestId = saveRequest.current.id;
    saveInFlight.current = true;
    setIsSavingMeal(true);
    try {
      const savedMealId = await foodDiaryService.saveMeal(requestId, localDate, mealType, selectedItems);
      if (!savedMealId) throw new Error('The database did not confirm the saved meal.');
      saveRequest.current = null;
      setSavedMealsRefresh((current) => current + 1);
      setMealItems([]);
      resetScanWorkspace();
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert('Meal not saved', error instanceof Error ? error.message : 'Could not save this meal. Check your connection and try again.');
    } finally {
      saveInFlight.current = false;
      setIsSavingMeal(false);
    }
  };

  // ── GDM Warning Modal state ─────────────────────────────


  // ── Manual Search State ─────────────────────────────────────
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [correctionCandidateId, setCorrectionCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Ignore stale responses when the query changes or the correction modal closes.
  useEffect(() => {
    setSearchError(null);
    if (!isSearchModalVisible || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let active = true;
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('maternal_foods').select('*')
          .ilike('display_name', `%${searchQuery.trim()}%`).limit(20);
        if (!active) return;
        if (error) throw error;
        setSearchResults(data ?? []);
      } catch (error) {
        if (!active) return;
        console.error('Food correction search failed:', error);
        setSearchResults([]);
        setSearchError('Food search is unavailable. Check your connection and try another search.');
      } finally {
        if (active) setIsSearching(false);
      }
    }, 500);
    return () => { active = false; clearTimeout(delayDebounceFn); };
  }, [searchQuery, isSearchModalVisible]);

  const handleSelectManualFood = (food: any) => {
    const record = mapFoodNutritionRecord(food);
    const id = correctionCandidateId ?? `${food.food_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    referenceVersions.current.set(id, (referenceVersions.current.get(id) ?? 0) + 1);
    const existing = mealItems.find((item) => item.id === id);
    let next: MealItem = { ...createEstimatedPreviewItem(id, record, record.foodId, null), timestamp: Date.now(), referenceStatus: 'loaded', rawDetections: [] };
    if (existing?.portion && record.referenceBasis?.unit === existing.portion.unit) {
      const recalculated = adjustEstimatedQuantity(next, existing.portion.amount, record.referenceBasis.unit);
      if (recalculated.ok) next = {
        ...recalculated.item,
        timestamp: existing.timestamp,
        imageUri: existing.imageUri,
        quantity: {
          ...recalculated.item.quantity!,
          provenance: existing.quantity?.provenance ?? 'user_adjusted',
          initialSuggestion: existing.quantity?.initialSuggestion ?? recalculated.item.quantity?.initialSuggestion ?? null,
          reason: 'Your selected amount was kept; estimates now use the selected food reference.',
        },
      };
    }
    setMealItems((previous) => correctionCandidateId !== null
      ? previous.map((item) => item.id === id ? { ...next, timestamp: item.timestamp, imageUri: item.imageUri } : item)
      : [...previous, next]);
    setCorrectionCandidateId(null);
    setIsSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);

  };

  // Check native camera/gallery permissions with visible failure handling.
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    })().catch((error) => {
      console.error('Scanner permission request failed:', error);
      Alert.alert('Camera permissions', 'Camera or photo permissions could not be checked. Please try the camera or gallery again.');
    });
  }, []);

  const resetScanWorkspace = () => {
    scanRequestId.current += 1;
    setScanState('idle');
    setImageUri(null);
    setImageAspectRatio(4 / 3);
    setCorrectionCandidateId(null);
    setErrorMsg(null);
    setIsLookingUp(false);
    setIsSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    referenceVersions.current.clear();
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

  // Item-scoped versions prevent a delayed lookup from replacing a correction or retry.
  const loadNutritionForItem = async (item: MealItem, allDetections: readonly RawFoodDetection[] = item.scanDetections ?? item.rawDetections ?? []) => {
    const version = (referenceVersions.current.get(item.id) ?? 0) + 1;
    referenceVersions.current.set(item.id, version);
    setMealItems((previous) => previous.map((current) => current.id === item.id ? { ...current, referenceStatus: 'loading' } : current));
    try {
      const food = await mealService.getNutritionForFood(item.foodId);
      if (!mounted.current || referenceVersions.current.get(item.id) !== version) return;
      const estimated = createEstimatedPreviewItem(item.id, food, item.foodId, item.confidence, item.rawDetections, allDetections);
      setMealItems((previous) => previous.map((current) => {
        if (current.id !== item.id || current.foodId !== item.foodId) return current;
        let resolved = estimated;
        if (current.portion && (current.portion.amount === 0 || current.quantity?.provenance === 'user_adjusted') &&
          (!food?.referenceBasis || food.referenceBasis.unit === current.portion.unit)) {
          const retained = adjustEstimatedQuantity(estimated, current.portion.amount, current.portion.unit as PortionUnit);
          if (retained.ok) resolved = retained.item;
        }
        return { ...current, ...resolved, referenceStatus: food ? 'loaded' : 'unmapped' };
      }));
      return { ...item, ...estimated, referenceStatus: food ? 'loaded' as const : 'unmapped' as const };
    } catch (error) {
      if (!mounted.current || referenceVersions.current.get(item.id) !== version) return;
      console.error('Meal preview nutrition lookup failed:', error);
      setMealItems((previous) => previous.map((current) => current.id === item.id ? { ...current, referenceStatus: 'error' } : current));
    }
  };

  const processImage = async (uri: string) => {
    const requestId = ++scanRequestId.current;
    setImageUri(uri);
    setScanState('compressing');
    setErrorMsg(null);

    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (requestId !== scanRequestId.current) return;
      setImageAspectRatio(manipulatedImage.width / manipulatedImage.height);
      setImageUri(manipulatedImage.uri);
      setScanState('analyzing');

      const result = await analyzeMealImage(manipulatedImage.uri);
      if (requestId !== scanRequestId.current) return;

      if (result.success && result.count > 0 && result.detections.length > 0) {
        const groups = groupDetectionEvidence(result.detections);
        const items: MealItem[] = groups.map((group, index) => ({
          ...createEstimatedPreviewItem(`scan-${requestId}-${index}-${Date.now()}`, null, group.foodId, group.confidence),
          rawDetections: group.detections, scanDetections: result.detections, imageUri: manipulatedImage.uri, timestamp: Date.now(), referenceStatus: 'loading',
        }));
        setMealItems((previous) => [...previous, ...items]);
        setScanState('review');
        setIsLookingUp(true);
        const resolved = await Promise.all(items.map((item) => loadNutritionForItem(item, result.detections)));
        if (requestId === scanRequestId.current) {
          setIsLookingUp(false);
          const estimatedItems = resolved.flatMap((item) => item?.calculatedNutrients ? [item] : []);

        }
      } else if (result.success && result.count === 0) {
        setScanState('no_detection');
      } else {
        setErrorMsg(result.error || 'Failed to analyze image');
        setScanState('error');
      }
    } catch (error) {
      if (requestId !== scanRequestId.current) return;
      console.error('Meal photo processing failed:', error);
      setErrorMsg('The photo could not be processed. Please choose another photo.');
      setScanState('error');
    }
  };

  const handleCamera = async () => {
    try {
      // Lower quality to prevent Android from killing the app due to memory constraints
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.6,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('The camera could not be opened. Try the gallery or check camera permissions.');
      Alert.alert('Camera Error', 'Could not open the camera.');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('The photo gallery could not be opened. Please try again.');
      Alert.alert('Gallery Error', 'Could not open the photo gallery.');
    }
  };

  const handleUpdateQuantity = (id: string, newQuantity: number | null, unit: PortionUnit) => {
    const current = mealItems.find((item) => item.id === id);
    if (!current) return;
    if (newQuantity === null) {
      setMealItems((prev) => prev.map((item) => item.id === id ? {
        ...item,
        portion: null,
        calculatedNutrients: null,
        quantity: {
          provenance: 'quantity_unknown',
          initialSuggestion: item.quantity?.initialSuggestion ?? null,
          reason: 'Choose an amount to see an estimate.',
          calculationVersion: item.quantity?.calculationVersion ?? 'reference-scaling-v2',
        },
      } : item));
      return;
    }
    const result = adjustEstimatedQuantity(current, newQuantity, unit);
    if (!result.ok) {
      Alert.alert('Amount unavailable', result.reason === 'invalid_amount' ? 'Enter a portion greater than zero.' : 'This amount is not supported by the food reference serving.');
      return;
    }
    const updated = { ...result.item, timestamp: current.timestamp };
    setMealItems((prev) => prev.map((item) => item.id === id ? updated : item));
  };

  const handleRemoveMealItem = (idToRemove: string) => {
    referenceVersions.current.delete(idToRemove);
    setMealItems((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleOpenFoodCorrection = (candidateId: string) => {
    setCorrectionCandidateId(candidateId);
    setSearchQuery('');
    setIsSearchModalVisible(true);
  };

  const renderScanWorkspace = () => {
    if (scanState === 'idle') {
      return (
        <View style={{ paddingBottom: 12, paddingTop: 8 }}>
          {errorMsg && <Text accessibilityRole="alert" style={{ marginHorizontal: 16, marginBottom: 12, color: '#B91C1C', lineHeight: 20 }}>{errorMsg}</Text>}
          <ScanActionButtons
            onCamera={handleCamera}
            onGallery={handleGallery}
            onSearch={() => setIsSearchModalVisible(true)}
            hasItems={mealItems.length > 0}
          />
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {/* Image preview */}
        <MealImagePreview
          imageUri={imageUri!}
          aspectRatio={imageAspectRatio}
          isAnalyzing={scanState === 'analyzing'}
          isCompressing={scanState === 'compressing'}
        />

        {scanState === 'review' && <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#047857' }}>Foods added to your preview</Text>
          <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 20 }}>{isLookingUp ? 'Loading food references?' : 'Review estimates above. Adjust amounts inline, Edit a food label, or remove anything incorrect.'}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={isLookingUp} onPress={resetScanWorkspace} style={{ minHeight: 44, borderRadius: 12, backgroundColor: '#ECFDF5', padding: 12, justifyContent: 'center' }}><Text style={{ color: '#047857', fontWeight: '600' }}>Scan another photo / Search</Text></TouchableOpacity>
        </View>}

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
              Food estimates will appear automatically. Adjust any incorrect labels or quantities.
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
    <KeyboardAvoidingView style={{ flex: 1, minHeight: 0 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
    <View style={{ flex: 1, minHeight: 0, backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <MealScanHeader
        onBack={handleBack}
        sessionName={mealType}
        itemCount={mealItems.length}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, minHeight: 0 }}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 32 + Math.max(insets.bottom, 8) }}
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
        <View onLayout={(event) => { plateTop.current = event.nativeEvent.layout.y; }}>
          <MealPlateCard
            items={mealItems}
            mealType={mealType}
            onRemoveItem={handleRemoveMealItem}
            onUpdateQuantity={handleUpdateQuantity}
            onEditFood={handleOpenFoodCorrection}
            onRetryReference={(id) => {
              const item = mealItems.find((food) => food.id === id);
              if (item) void loadNutritionForItem(item).then((updated) => {  });
            }}
          />
        </View>

        <FoodDiaryHistory
          date={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
          openAllOnMount={viewDiary === '1'}
          refreshKey={savedMealsRefresh}
          signedIn={!!diarySession?.user?.id}
          setupReady={isDiaryReady}
          onSignIn={() => setShowDiaryAuth(true)}
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

      {mealItems.length > 0 && <View testID="meal-save-footer" style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
        <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 17, textAlign: 'center', marginBottom: 8 }}>{diarySession?.user?.email ? (isDiaryReady ? `Food Diary · ${diarySession.user.email}` : 'Diary database setup must be applied and verified before saving.') : 'Sign in to your separate Food Diary account to save securely.'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: isSavingMeal || !hasSelectedPortion || (!!diarySession?.user?.id && (!isDiaryReady || isCheckingDiarySetup)) }} accessibilityLabel={isSavingMeal ? 'Saving meal' : 'Save Meal'} disabled={isSavingMeal || !hasSelectedPortion || (!!diarySession?.user?.id && (!isDiaryReady || isCheckingDiarySetup))} onPress={() => void handleSaveMeal()} style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: isSavingMeal || !hasSelectedPortion || (!!diarySession?.user?.id && (!isDiaryReady || isCheckingDiarySetup)) ? '#CBD5E1' : '#047857', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          {(isSavingMeal || isCheckingDiarySetup) && <ActivityIndicator color="#FFFFFF" />}
          <Text style={{ color: isSavingMeal || !hasSelectedPortion || (!!diarySession?.user?.id && (!isDiaryReady || isCheckingDiarySetup)) ? '#475569' : '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{isSavingMeal ? 'Saving…' : isCheckingDiarySetup ? 'Checking setup…' : 'Save Meal'}</Text>
        </TouchableOpacity>
      </View>}

      <FoodDiaryAuthModal visible={showDiaryAuth} onClose={() => setShowDiaryAuth(false)} />

      <MealSaveSuccessModal
        visible={showSuccessModal}
        mealType={mealType}
        onViewWellness={() => { setShowSuccessModal(false); router.push('/gdm-care'); }}
        onScanMore={() => {
          setShowSuccessModal(false);
          resetScanWorkspace();
        }}
      />

      <Modal
        visible={isFocused && !dismissGdmLock && hasGdmRisk === false}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDismissGdmLock(true)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', padding: 32, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, position: 'relative' }}>
            <TouchableOpacity
              onPress={() => setDismissGdmLock(true)}
              style={{ position: 'absolute', top: 16, right: 16, padding: 8, borderRadius: 20, backgroundColor: '#F1F5F9' }}
              activeOpacity={0.7}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>

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
              onPress={() => {
                setDismissGdmLock(true);
                router.push('/(mother)/gdm-care?tab=gdm');
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginRight: 8 }}>Check GDM Risk Now</Text>
              <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Search Food Modal ────────────────────────────────────────────── */}
      <Modal visible={isSearchModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setIsSearchModalVisible(false); setCorrectionCandidateId(null); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <TouchableOpacity onPress={() => { setIsSearchModalVisible(false); setCorrectionCandidateId(null); }} style={{ padding: 8, marginRight: 8, backgroundColor: '#F1F5F9', borderRadius: 20 }}>
              <ArrowLeft size={24} color="#334155" />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12 }}>
              <Search size={20} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search maternal foods..."
                placeholderTextColor="#94A3B8"
                autoFocus
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 16, color: '#0F172A' }}
              />
            </View>
          </View>

          {/* Results */}
          {isSearching ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 15 }}>Searching database...</Text>
            </View>
          ) : searchError ? (
            <View style={{ padding: 24 }}><Text accessibilityRole="alert" style={{ color: '#B91C1C', lineHeight: 21 }}>{searchError}</Text></View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              keyExtractor={(item) => item.food_id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectManualFood(item)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Utensils size={24} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                      {item.display_name}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>
                      {item.carbs_g}g Carbs • {item.sugar_g}g Sugar
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            />
          ) : searchQuery.trim().length > 1 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8 }}>
                No foods found
              </Text>
              <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center' }}>
                We couldn't find any foods matching "{searchQuery}". Try a different term.
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
              <Utensils size={48} color="#E2E8F0" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, color: '#94A3B8', textAlign: 'center' }}>
                Search our database for healthy maternal foods to add to your plate.
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </View>
    </KeyboardAvoidingView>
  );
}
