import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { UtensilsCrossed, X, Sparkles } from 'lucide-react-native';
import { MealItem } from '@/types/meal';
import { NutritionMiniBar } from './NutritionMiniBar';

interface MealPlateCardProps {
  items: MealItem[];
  mealType: string;
  onRemoveItem: (id: string) => void;
}

/** Returns computed nutrition totals across all items */
function computeTotals(items: MealItem[]) {
  return items.reduce(
    (acc, item) => ({
      carbsG: acc.carbsG + item.carbsG * item.servingMultiplier,
      sugarG: acc.sugarG + item.sugarG * item.servingMultiplier,
      fiberG: acc.fiberG + item.fiberG * item.servingMultiplier,
      fatG: acc.fatG + item.fatG * item.servingMultiplier,
      ironMg: acc.ironMg + item.ironMg * item.servingMultiplier,
      calciumMg: acc.calciumMg + item.calciumMg * item.servingMultiplier,
    }),
    { carbsG: 0, sugarG: 0, fiberG: 0, fatG: 0, ironMg: 0, calciumMg: 0 }
  );
}

/** Animated chip for each meal item added */
function MealItemChip({
  item,
  onRemove,
  animDelay,
}: {
  item: MealItem;
  onRemove: () => void;
  animDelay: number;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        delay: animDelay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 320,
        delay: animDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedName = item.name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        borderRadius: 20,
        paddingVertical: 6,
        paddingLeft: 8,
        paddingRight: 6,
        marginRight: 6,
        marginBottom: 6,
        maxWidth: 200,
      }}
    >
      {/* Food thumbnail */}
      {item.imageUri ? (
        <Image
          source={{ uri: item.imageUri }}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            marginRight: 6,
            backgroundColor: '#D1FAE5',
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#D1FAE5',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 6,
          }}
        >
          <Text style={{ fontSize: 11 }}>🍽️</Text>
        </View>
      )}

      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#065F46',
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {formattedName}
      </Text>

      <TouchableOpacity
        onPress={onRemove}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#6EE7B7',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 4,
        }}
        activeOpacity={0.7}
      >
        <X size={10} color="#065F46" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Fan-stacked thumbnail images (max 5 shown) */
function ImageFan({ items }: { items: MealItem[] }) {
  const withImages = items.filter((i) => !!i.imageUri).slice(0, 5);

  if (withImages.length === 0) return null;

  const OVERLAP = 18;
  const SIZE = 48;

  return (
    <View
      style={{
        flexDirection: 'row',
        height: SIZE,
        width: SIZE + (withImages.length - 1) * (SIZE - OVERLAP),
        marginBottom: 12,
      }}
    >
      {withImages.map((item, idx) => (
        <View
          key={item.id}
          style={{
            position: 'absolute',
            left: idx * (SIZE - OVERLAP),
            zIndex: idx,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: 2.5,
            borderColor: '#FFFFFF',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <Image
            source={{ uri: item.imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      ))}
      {items.length > 5 && (
        <View
          style={{
            position: 'absolute',
            left: 5 * (SIZE - OVERLAP),
            zIndex: 6,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: '#059669',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: '#FFFFFF',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
            +{items.length - 5}
          </Text>
        </View>
      )}
    </View>
  );
}

export function MealPlateCard({ items, mealType, onRemoveItem }: MealPlateCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse the card when an item is added
  const prevCountRef = useRef(items.length);
  useEffect(() => {
    if (items.length > prevCountRef.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.015,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  const totals = computeTotals(items);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#A7F3D0',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 5,
        overflow: 'hidden',
      }}
    >
      {/* Card Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 14,
          borderBottomWidth: items.length > 0 ? 1 : 0,
          borderBottomColor: '#F0FDF4',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, marginRight: 10 }}>🍽️</Text>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
              {mealType} Plate
            </Text>
            {items.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
                Scan food items to fill your plate
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Sparkles size={11} color="#059669" />
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginLeft: 4 }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'} added
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Image fan (top-right) */}
        {items.length > 0 && <ImageFan items={items} />}
      </View>

      {/* Empty State */}
      {items.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#F0FDF4',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <UtensilsCrossed size={28} color="#A7F3D0" strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#64748B', textAlign: 'center' }}>
            Your plate is empty
          </Text>
          <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
            Use the camera below to scan your first food item 📷
          </Text>
        </View>
      )}

      {/* Food chips */}
      {items.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {/* Food chip grid — wraps naturally */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {items.map((item) => (
              <MealItemChip
                key={item.id}
                item={item}
                onRemove={() => onRemoveItem(item.id)}
                animDelay={0}
              />
            ))}
          </View>
        </View>
      )}

      {/* Nutrition mini bars */}
      {items.length > 0 && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            marginBottom: 18,
            backgroundColor: '#F8FFFE',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: '#E0FDF4',
          }}
        >
          <NutritionMiniBar totals={totals} />
        </View>
      )}
    </Animated.View>
  );
}
