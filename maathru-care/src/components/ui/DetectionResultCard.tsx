import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';

interface DetectionResultCardProps {
  foodName: string;
  confidence: number;
  isSelected?: boolean;
  onToggle?: () => void;
  imageUri?: string | null;
  foodIdOptions?: string[];
  onCorrectFood?: (foodId: string) => void;
  onOpenCorrection?: () => void;
}

export function DetectionResultCard({
  foodName,
  confidence,
  isSelected = true,
  onToggle,
  imageUri,
  foodIdOptions = [],
  onCorrectFood,
  onOpenCorrection,
}: DetectionResultCardProps) {
  const percentage = Math.round(confidence * 100);

  // Format food name: replace underscores with spaces and capitalize
  const formattedName = foodName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const confidenceColor =
    percentage >= 80 ? '#059669' : percentage >= 60 ? '#F59E0B' : '#EF4444';
  const confidenceLabel =
    percentage >= 80 ? 'High Match' : percentage >= 60 ? 'Good Match' : 'Low Match';

  return (
    <View style={{ marginBottom: 12 }}>
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`Select ${formattedName}`}
      activeOpacity={0.82}
      style={{
        borderRadius: 18,
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
        borderWidth: 2,
        borderColor: isSelected ? '#6EE7B7' : '#E2E8F0',
        shadowColor: isSelected ? '#059669' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isSelected ? 0.12 : 0.04,
        shadowRadius: 8,
        elevation: isSelected ? 4 : 1,
      }}
    >
      {/* Food thumbnail */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          overflow: 'hidden',
          marginRight: 10,
          backgroundColor: '#D1FAE5',
        }}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 28 }}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: isSelected ? '#065F46' : '#334155',
            marginBottom: 4,
            lineHeight: 23,
            flexShrink: 1,
          }}
        >
          {formattedName}
        </Text>

        {/* Confidence badge + bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View
            style={{
              backgroundColor: isSelected ? '#D1FAE5' : '#F1F5F9',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isSelected ? confidenceColor : '#94A3B8',
                letterSpacing: 0.3,
              }}
            >
              {percentage}% · {confidenceLabel}
            </Text>
          </View>
        </View>

        <View
          style={{
            height: 4,
            backgroundColor: '#E2E8F0',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: isSelected ? confidenceColor : '#CBD5E1',
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Checkbox */}
      <View style={{ marginLeft: 12 }}>
        {isSelected ? (
          <CheckCircle2 size={26} color="#059669" />
        ) : (
          <Circle size={26} color="#CBD5E1" />
        )}
      </View>
    </TouchableOpacity>
    {onOpenCorrection ? <TouchableOpacity accessibilityRole="button" onPress={onOpenCorrection} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 9, marginTop: 5, borderRadius: 14, backgroundColor: '#F0FDF4' }}>
      <Text style={{ color: '#047857', fontSize: 12, fontWeight: '600' }}>Search to correct this food</Text>
    </TouchableOpacity> : null}
    {foodIdOptions.length > 1 && onCorrectFood ? (
      <View style={{ paddingHorizontal: 4, paddingTop: 4 }}>
        <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 6 }}>Wrong food? Choose a correction:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {foodIdOptions.map((foodId) => (
            <TouchableOpacity accessibilityRole="button" key={foodId} onPress={() => onCorrectFood(foodId)} style={{ minHeight: 44, justifyContent: 'center', backgroundColor: foodId === foodName ? '#D1FAE5' : '#FFFFFF', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9 }}>
              <Text style={{ color: '#047857', fontSize: 12, fontWeight: '600' }}>{foodId.replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ) : null}
    </View>
  );
}
