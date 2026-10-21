import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

export function FoodDiaryAuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 22 }}>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A' }}>Sign in to save meals</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ padding: 8 }}><X size={20} color="#64748B" /></TouchableOpacity>
        </View>
        <Text style={{ color: '#64748B', lineHeight: 20 }}>Food Diary uses your Maathru Care account. Sign in or create an account to continue.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => { onClose(); router.push('/login'); }} style={{ minHeight: 48, borderRadius: 13, backgroundColor: '#047857', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Continue to sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>;
}
