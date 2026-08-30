import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Minus, Plus, Check } from 'lucide-react-native';

interface QuantityEditModalProps {
  visible: boolean;
  foodName: string;
  initialQuantity: number;
  onSave: (newQuantity: number) => void;
  onCancel: () => void;
}

export function QuantityEditModal({
  visible,
  foodName,
  initialQuantity,
  onSave,
  onCancel,
}: QuantityEditModalProps) {
  const [qty, setQty] = useState(initialQuantity);

  useEffect(() => {
    if (visible) {
      setQty(initialQuantity);
    }
  }, [visible, initialQuantity]);

  const handleMinus = () => {
    if (qty > 1) setQty(qty - 1);
  };

  const handlePlus = () => {
    setQty(qty + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: '#FAF9F6',
            borderRadius: 28,
            padding: 32,
            width: '100%',
            maxWidth: 340,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 32,
            elevation: 20,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'serif',
              fontSize: 22,
              fontWeight: '600',
              color: '#0F172A',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Edit Quantity
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: '#64748B',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            How many <Text style={{ fontWeight: '600', color: '#334155' }}>{foodName}</Text>s did you have?
          </Text>

          {/* Stepper */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
            <TouchableOpacity
              onPress={handleMinus}
              disabled={qty <= 1}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: qty <= 1 ? '#F1F5F9' : '#ECFDF5',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: qty <= 1 ? '#E2E8F0' : '#A7F3D0',
              }}
            >
              <Minus size={24} color={qty <= 1 ? '#94A3B8' : '#059669'} />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#334155',
                width: 70,
                textAlign: 'center',
              }}
            >
              {qty}
            </Text>

            <TouchableOpacity
              onPress={handlePlus}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#ECFDF5',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#A7F3D0',
              }}
            >
              <Plus size={24} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                paddingVertical: 14,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: '#E2E8F0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '600', color: '#64748B' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSave(qty)}
              style={{
                flex: 1,
                backgroundColor: '#047857',
                paddingVertical: 14,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'serif', fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
