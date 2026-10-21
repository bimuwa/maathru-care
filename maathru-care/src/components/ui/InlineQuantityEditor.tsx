import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { MealItem } from '@/types/meal';
import type { PortionUnit } from '@/services/nutritionCalculator';

export function InlineQuantityEditor({ item, onChange, onClear }: { item: MealItem; onChange: (amount: number, unit: PortionUnit) => void; onClear?: (unit: PortionUnit | null) => void }) {
  const basis = item.nutritionRecord?.referenceBasis;
  const [text, setText] = useState(item.portion ? String(item.portion.amount) : '');
  const [invalid, setInvalid] = useState(false);
  // A unit choice is local only until a valid amount is entered. The actual
  // quantity always lives in item.portion, shared with save and preview.
  const [selectedUnit, setSelectedUnit] = useState<PortionUnit | null>(item.portion?.unit as PortionUnit ?? basis?.unit ?? null);
  const unit = basis?.unit ?? selectedUnit;

  useEffect(() => {
    setText(item.portion ? String(item.portion.amount) : '');
    setInvalid(false);
    setSelectedUnit(item.portion?.unit as PortionUnit ?? basis?.unit ?? null);
  }, [item.id, item.foodId, basis?.amount, basis?.unit]);
  useEffect(() => {
    if (item.portion) { setText(String(item.portion.amount)); setInvalid(false); }
  }, [item.portion?.amount, item.portion?.unit]);

  const update = (value: string) => {
    setText(value);
    const normalized = value.trim().replace(',', '.');
    const amount = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
    const valid = Number.isFinite(amount) && (unit === 'piece' ? amount >= 0 && Number.isInteger(amount) : amount > 0);
    setInvalid(!valid);
    if (valid && unit) onChange(amount, unit);
    else onClear?.(unit);
  };
  const choose = (amount: number) => {
    if (!unit) return;
    setText(String(amount));
    setInvalid(false);
    onChange(amount, unit);
  };
  const presets = unit === 'cup'
    ? [{ amount: 0.5, label: '½ cup' }, { amount: 1, label: '1 cup' }, { amount: 1.5, label: '1½ cups' }]
    : unit === 'g' ? [{ amount: 50, label: '50 g' }, { amount: 100, label: '100 g' }, { amount: 150, label: '150 g' }] : [];

  return <View style={styles.editor}>
    <Text style={styles.prompt}>Quantity</Text>
    {unit && <Text style={styles.note}>{unit === 'piece' ? 'How many did you eat?' : 'How much did you eat?'}</Text>}
    {!unit && <View style={styles.row}>{(['piece', 'g', 'cup'] as const).map((choice) =>
      <TouchableOpacity key={choice} accessibilityRole="button" accessibilityLabel={`Measure ${item.name} in ${choice}`} onPress={() => setSelectedUnit(choice)} style={styles.preset}>
        <Text style={styles.presetText}>{choice === 'piece' ? 'Pieces' : choice === 'g' ? 'Grams' : 'Cups'}</Text>
      </TouchableOpacity>)}</View>}
    <View style={styles.row}>
      {unit === 'piece' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Decrease pieces for ${item.name}`} disabled={!item.portion || item.portion.amount <= 0} onPress={() => choose(item.portion!.amount - 1)} style={[styles.button, (!item.portion || item.portion.amount <= 0) && styles.buttonDisabled]}><Text style={styles.action}>−</Text></TouchableOpacity>}
      <TextInput accessibilityLabel={`Amount for ${item.name}`} editable={!!unit} value={text} onChangeText={update} keyboardType="decimal-pad" placeholder={unit ? 'Enter amount' : 'Select a unit'} selectTextOnFocus style={styles.input} />
      {unit && <Text style={styles.note}>{unit === 'piece' ? Number(text) <= 1 ? 'piece' : 'pieces' : unit === 'cup' ? 'cups' : 'grams'}</Text>}
      {unit === 'piece' && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Increase pieces for ${item.name}`} onPress={() => choose((item.portion?.amount ?? 0) + 1)} style={styles.button}><Text style={styles.action}>+</Text></TouchableOpacity>}
    </View>
    {item.portion?.amount === 0 && <Text style={styles.note}>Tap + to select your portion.</Text>}
    {presets.length > 0 && <View style={styles.row}>{presets.map(({ amount, label }) => <TouchableOpacity key={amount} accessibilityRole="button" accessibilityLabel={`Set ${item.name} to ${label}`} onPress={() => choose(amount)} style={styles.preset}><Text style={styles.presetText}>{label}</Text></TouchableOpacity>)}</View>}
    {!basis && item.referenceStatus !== 'loading' && <Text style={styles.note}>Nutrition reference required. Nutrient estimates are unavailable until you choose a supported reference.</Text>}
    {invalid && <Text accessibilityRole="alert" style={styles.error}>Enter a valid {unit === 'piece' ? 'whole piece count of zero or more' : 'amount greater than zero'}.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  editor: { gap: 6, minWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  prompt: { color: '#334155', fontSize: 13, fontWeight: '700' },
  button: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#F1F5F9' },
  action: { fontSize: 24, color: '#047857', fontWeight: '700' },
  input: { minWidth: 62, maxWidth: 128, flexGrow: 1, minHeight: 48, textAlign: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 10, color: '#0F172A', fontSize: 18, fontWeight: '700' },
  preset: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  presetText: { color: '#334155', fontSize: 13, fontWeight: '600' },
  note: { color: '#475569', fontSize: 12, lineHeight: 18 }, error: { color: '#B91C1C', fontSize: 12, lineHeight: 18 },
});
