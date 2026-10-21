import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (password.length < 8 || password !== confirm) { Alert.alert('Check your password', 'Use at least 8 characters and enter the same password twice.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Password updated', 'You can now sign in using your new password.');
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) { Alert.alert('Could not update password', error instanceof Error ? error.message : 'Please request a new recovery email.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#F8FAFC' }}>
    <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F172A' }}>Set a new password</Text>
    <Text style={{ color: '#64748B' }}>Choose a password with at least 8 characters.</Text>
    <TextInput secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} placeholder="New password" style={inputStyle} />
    <TextInput secureTextEntry autoCapitalize="none" value={confirm} onChangeText={setConfirm} placeholder="Confirm password" style={inputStyle} />
    <TouchableOpacity disabled={busy} onPress={() => void save()} style={{ minHeight: 48, borderRadius: 12, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' }}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Update password</Text>}
    </TouchableOpacity>
  </View>;
}
const inputStyle = { minHeight: 48, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 13, color: '#0F172A' } as const;
