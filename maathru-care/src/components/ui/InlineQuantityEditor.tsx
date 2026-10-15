import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { MealItem } from '@/types/meal';
import type { PortionUnit } from '@/services/nutritionCalculator';

export function InlineQuantityEditor({ item, onChange, onClear }: { item: MealItem; onChange: (amount: number, unit: PortionUnit) => void; onClear?: () => void }) {
  const [text, setText] = useState(item.portion ? String(item.portion.amount) : '');
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(item.portion ? String(item.portion.amount) : ''); setInvalid(false); }, [item.id, item.foodId]);
  useEffect(() => {
    // Keep valid external updates in sync, but preserve the user's invalid text
    // after clearing an amount so its validation message remains visible.
    if (item.portion) { setText(String(item.portion.amount)); setInvalid(false); }
  }, [item.portion?.amount]);
  const basis = item.nutritionRecord?.referenceBasis;
  if (!basis || !Number.isFinite(basis.amount) || basis.amount <= 0) return <Text style={styles.note}>Use Edit food to choose a supported nutrition reference.</Text>;
  const update = (value: string) => {
    setText(value);
    const normalized = value.trim().replace(',', '.');
    const amount = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
    const valid = Number.isFinite(amount) && amount > 0;
    setInvalid(!valid);
    if (valid) onChange(amount, basis.unit);
    else onClear?.();
  };
  const choose = (amount: number) => { setText(String(amount)); setInvalid(false); onChange(amount, basis.unit); };
  const presets = basis.unit === 'cup'
    ? [{ amount: 0.5, label: '½ cup' }, { amount: 1, label: '1 cup' }, { amount: 1.5, label: '1½ cups' }]
    : basis.unit === 'g' ? [{ amount: 50, label: '50 g' }, { amount: 100, label: '100 g' }, { amount: 150, label: '150 g' }] : [];
  return <View style={{ gap: 6 }}>
    <Text style={styles.prompt}>{basis.unit === 'piece' ? 'How many did you eat?' : 'How much did you eat?'}</Text>
    <View style={styles.row}>
      {basis.unit === 'piece' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Decrease pieces for ${item.name}`} disabled={!item.portion || item.portion.amount <= 1} onPress={() => choose(item.portion!.amount - 1)} style={[styles.button, (!item.portion || item.portion.amount <= 1) && styles.buttonDisabled]}><Text style={styles.action}>−</Text></TouchableOpacity>}
      <TextInput accessibilityLabel={`Amount for ${item.name}`} value={text} onChangeText={update} keyboardType="decimal-pad" placeholder={basis.unit === 'piece' ? '0' : 'Enter amount'} selectTextOnFocus style={styles.input} />
      <Text style={styles.note}>{basis.unit === 'piece' ? Number(text) === 1 ? 'piece' : 'pieces' : basis.unit === 'cup' ? 'cups' : 'grams'}</Text>
      {basis.unit === 'piece' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Increase pieces for ${item.name}`} onPress={() => choose((item.portion?.amount ?? 0) + 1)} style={styles.button}><Text style={styles.action}>+</Text></TouchableOpacity>}
    </View>
    {presets.length > 0 && <View style={styles.row}>{presets.map(({ amount, label }) => <TouchableOpacity key={amount} accessibilityRole="button" accessibilityLabel={`Set ${item.name} to ${label}`} onPress={() => choose(amount)} style={styles.preset}><Text style={styles.presetText}>{label}</Text></TouchableOpacity>)}</View>}
    {invalid && <Text accessibilityRole="alert" style={styles.error}>Enter an amount greater than zero.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  prompt: { color: '#334155', fontSize: 13, fontWeight: '600' },
  button: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#F1F5F9' },
  action: { fontSize: 24, color: '#047857', fontWeight: '700' },
  input: { minWidth: 62, maxWidth: 128, flexGrow: 1, minHeight: 48, textAlign: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 10, color: '#0F172A', fontSize: 18, fontWeight: '700' },
  preset: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  presetText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  note: { color: '#475569', fontSize: 12, lineHeight: 18 }, error: { color: '#B91C1C', fontSize: 12, lineHeight: 18 },
});
