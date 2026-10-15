import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, Plus, Check } from 'lucide-react-native';
import type { FoodNutritionRecord, PortionUnit } from '@/services/nutritionCalculator';
import { calculateConfirmedPortion } from '@/services/nutritionCalculator';

interface QuantityEditModalProps {
  visible: boolean;
  food: FoodNutritionRecord | null;
  foodName: string;
  initialAmount: number | null;
  initialUnit: PortionUnit | null;
  onSave: (amount: number, unit: PortionUnit) => void;
  onCancel: () => void;
}

const stepFor = (unit: PortionUnit) => unit === 'g' ? 50 : unit === 'piece' ? 1 : 0.5;
const formatAmount = (amount: number) => Number.isInteger(amount) ? `${amount}` : `${amount}`;

export function QuantityEditModal({ visible, food, foodName, initialAmount, initialUnit, onSave, onCancel }: QuantityEditModalProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [webViewportHeight, setWebViewportHeight] = useState<number | null>(null);
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const resize = () => setWebViewportHeight(viewport.height);
    resize();
    viewport.addEventListener('resize', resize);
    return () => viewport.removeEventListener('resize', resize);
  }, [visible]);
  const basis = food?.referenceBasis ?? null;
  const unit = basis?.unit ?? null;
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setQty(initialAmount !== null && initialUnit === unit ? formatAmount(initialAmount) : '');
      setError('');
    }
  }, [visible, initialAmount, initialUnit, unit]);

  const suggestions = useMemo(() => {
    if (!basis || !unit) return [];
    if (unit === 'g') return [50, 100, 150, 200];
    if (unit === 'cup') return [0.5, 1, 1.5, 2];
    return [1, 2, 3, 4];
  }, [basis, unit]);

  const changeBy = (delta: number) => {
    if (!unit) return;
    const current = Number(qty.trim().replace(',', '.'));
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    setQty(next === 0 ? '' : formatAmount(next));
    setError('');
  };

  const submit = () => {
    if (!food || !unit) {
      setError('A recognized serving basis is not available for this food.');
      return;
    }
    const normalized = qty.trim().replace(',', '.');
    const amount = Number(normalized);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a portion greater than zero.');
      return;
    }
    // Keep all support/reference/unit rules in the existing calculator.
    const calculation = calculateConfirmedPortion(food, { amount, unit, confirmedByUser: true });
    if (!calculation.ok) {
      setError('This portion cannot be calculated from the food reference.');
      return;
    }
    onSave(amount, unit);
  };

  const unitLabel = unit === 'g' ? 'grams' : unit === 'piece' ? 'pieces' : unit === 'cup' ? 'cups' : '';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'} style={{ flex: 1, maxHeight: Platform.OS === 'web' ? webViewportHeight ?? height : undefined, backgroundColor: 'rgba(15, 23, 42, 0.48)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={{ backgroundColor: '#FAF9F6', borderRadius: 22, padding: 18, width: '100%', maxWidth: 420, maxHeight: '100%', flexShrink: 1, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ alignItems: 'center', paddingBottom: 4 }}>
            <Text style={{ fontFamily: 'serif', fontSize: 22, fontWeight: '600', color: '#0F172A', marginBottom: 6, textAlign: 'center' }}>Confirm Portion</Text>
            <Text style={{ fontSize: 15, color: '#475569', textAlign: 'center', marginBottom: 12 }}>{foodName}</Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18 }}>
              {basis ? `Nutrition reference: ${basis.sourceText}` : 'Nutrition is unavailable because this food has no recognized reference serving.'}
            </Text>

            {unit ? (
              <>
                <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity accessibilityLabel="Decrease portion" onPress={() => changeBy(-stepFor(unit))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <Minus size={22} color="#059669" />
                  </TouchableOpacity>
                  <TextInput
                    value={qty}
                    onChangeText={(value) => { setQty(value); setError(''); }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Portion in ${unitLabel}`}
                    placeholder="Enter amount"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, paddingVertical: 8, fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#334155', borderBottomWidth: 1.5, borderColor: '#A7F3D0' }}
                  />
                  <TouchableOpacity accessibilityLabel="Increase portion" onPress={() => changeBy(stepFor(unit))} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <Plus size={22} color="#059669" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 10 }}>{unitLabel}</Text>
                <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginBottom: 12 }}>
                  {unit === 'g' ? 'Weigh the amount you ate, for example 100 g.' : unit === 'cup' ? 'Measure the amount you ate, for example 0.5 cup or 1 cup.' : 'Enter the pieces you ate, for example 1 piece or 2 pieces.'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity accessibilityRole="button" key={suggestion} onPress={() => { setQty(formatAmount(suggestion)); setError(''); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, backgroundColor: qty === formatAmount(suggestion) ? '#D1FAE5' : '#FFFFFF', borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Text style={{ color: '#047857', fontWeight: '600' }}>{suggestion} {unit === 'g' ? 'g' : unit === 'cup' ? (suggestion === 0.5 ? 'cup' : 'cups') : (suggestion === 1 ? 'piece' : 'pieces')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {error ? <Text accessibilityRole="alert" style={{ color: '#B91C1C', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</Text> : null}
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginBottom: 18 }}>Choose what you ate. The detection does not set your portion.</Text>
            <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
              <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={{ flex: 1, minHeight: 48, backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !food || !unit }} disabled={!food || !unit} onPress={submit} style={{ flex: 1, minHeight: 48, backgroundColor: food && unit ? '#047857' : '#94A3B8', paddingVertical: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
