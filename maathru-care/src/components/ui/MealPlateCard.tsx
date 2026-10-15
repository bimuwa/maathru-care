import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, UtensilsCrossed, X } from 'lucide-react-native';
import { MealItem } from '@/types/meal';
import { NutritionMiniBar } from './NutritionMiniBar';
import { InlineQuantityEditor } from './InlineQuantityEditor';
import { summarizeEstimatedMeal, type NutrientValues, type PortionUnit } from '@/services/nutritionCalculator';

interface MealPlateCardProps {
  items: MealItem[];
  mealType: string;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number | null, unit: PortionUnit) => void;
  onEditFood?: (id: string) => void;
  onRetryReference?: (id: string) => void;
}
export const QUANTITY_LABELS = {
  ai_count_suggested: 'AI suggested · adjust if needed', standard_serving_assumed: 'Serving estimate · adjust if needed',
  user_adjusted: 'Adjusted by you', user_confirmed: 'Confirmed by you', quantity_unknown: 'Choose your amount', legacy_unconfirmed: 'Previous estimate',
};
function nutrientText(nutrients: NutrientValues) {
  const entries = [['carbsG', 'Carbs', 'g'], ['sugarG', 'Sugar', 'g'], ['fiberG', 'Fiber', 'g'], ['fatG', 'Fat', 'g'], ['ironMg', 'Iron', 'mg'], ['calciumMg', 'Calcium', 'mg']] as const;
  return entries.map(([key, label, unit]) => `${label} ${nutrients[key] === null ? 'unavailable' : `${nutrients[key].toFixed(1)} ${unit}`}`).join(' · ');
}
export function MealPlateCard({ items, mealType, onRemoveItem, onUpdateQuantity, onEditFood, onRetryReference }: MealPlateCardProps) {
  const summary = summarizeEstimatedMeal(items);
  return <View style={styles.card} testID="meal-plate">
    <View style={{ gap: 4, marginBottom: 12 }}><Text style={styles.title}>{mealType} Plate</Text><Text style={styles.subtitle}>{items.length === 0 ? 'Ready for your meal' : `${items.length} ${items.length === 1 ? 'food' : 'foods'} added`}</Text></View>
    {items.length === 0 ? <View style={styles.header}><UtensilsCrossed size={32} color="#94A3B8" /><View style={styles.description}><Text style={styles.name}>Your plate is empty</Text><Text style={styles.subtitle}>Scan a photo or search below. Review the estimates and adjust anything incorrect.</Text></View></View> : <>
      {items.map((item) => {
        const name = item.name.replace(/_/g, ' ');
        const status = item.quantity?.provenance ?? (item.portion?.confirmedByUser ? 'user_confirmed' : 'quantity_unknown');
        return <View key={item.id} style={styles.item}>
          <View style={styles.header}>
            {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumbnail} /> : <UtensilsCrossed size={26} color="#059669" />}
            <View style={styles.description}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.quantityStatus}>{QUANTITY_LABELS[status]}</Text>
            </View>
            {item.confidence !== null && <View style={styles.aiBadge} accessibilityLabel="Food identified by AI">
              <Sparkles size={12} color="#047857" /><Text style={styles.aiBadgeText}>AI match</Text>
            </View>}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={() => onRemoveItem(item.id)} style={styles.remove}><X size={20} color="#64748B" /></TouchableOpacity>
          </View>
          {item.referenceStatus === 'loading' ? <Text style={styles.subtitle}>Checking nutrition…</Text> : <>
            <InlineQuantityEditor
              item={item}
              onChange={(amount, unit) => onUpdateQuantity(item.id, amount, unit)}
              onClear={() => onUpdateQuantity(item.id, null, item.portion?.unit as PortionUnit || item.nutritionRecord?.referenceBasis?.unit || 'piece')}
            />
            {item.calculatedNutrients && items.length > 1 && <Text style={styles.nutrients}>This food · {item.portion?.amount} {item.portion?.unit}: {nutrientText(item.calculatedNutrients)}</Text>}
            {!item.nutritionRecord && item.referenceStatus === 'error' && <Text style={styles.unavailable}>Nutrition couldn’t load.</Text>}
          </>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {onEditFood && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit food for ${name}`} onPress={() => onEditFood(item.id)} style={styles.edit}><Text style={styles.editText}>Edit food</Text></TouchableOpacity>}
            {item.referenceStatus === 'error' && onRetryReference && <TouchableOpacity accessibilityRole="button" onPress={() => onRetryReference(item.id)} style={styles.edit}><Text style={styles.editText}>Retry nutrition</Text></TouchableOpacity>}
          </View>
        </View>;
      })}
      <View style={styles.nutrition}>
        {summary.quantifiedCount === 0 ? <Text style={styles.choosePrompt}>Choose an amount to see estimated nutrition.</Text> : <>
          {summary.unquantifiedCount > 0 && <Text style={styles.summaryNote}>Estimate includes {summary.quantifiedCount} of {items.length} foods. Add amounts for the others to include them.</Text>}
          {summary.unquantifiedCount === 0 && summary.missingNutrients.length > 0 && <Text style={styles.summaryNote}>Some nutrition values aren’t available.</Text>}
          <NutritionMiniBar totals={summary.nutrients} />
        </>}
      </View>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  title: { fontFamily: 'serif', fontSize: 22, fontWeight: '600', color: '#334155' }, subtitle: { fontSize: 12, color: '#64748B', lineHeight: 19 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 9 }, description: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#065F46', flexShrink: 1 }, item: { borderTopWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, gap: 8 },
  thumbnail: { width: 40, height: 40, borderRadius: 10 }, remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  aiBadgeText: { color: '#047857', fontSize: 10, fontWeight: '700' },
  quantityStatus: { color: '#64748B', fontSize: 11, lineHeight: 16 },
  unavailable: { color: '#92400E', fontSize: 12, lineHeight: 18 }, nutrients: { color: '#334155', fontSize: 12, lineHeight: 19 },
  choosePrompt: { color: '#475569', fontSize: 13, lineHeight: 19 }, summaryNote: { color: '#64748B', fontSize: 12, lineHeight: 18 },
  edit: { minHeight: 44, padding: 10, justifyContent: 'center' }, editText: { color: '#047857', fontWeight: '600', fontSize: 13 },
  nutrition: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderColor: '#E2E8F0', gap: 10 },
});
