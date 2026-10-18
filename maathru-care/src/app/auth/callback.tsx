import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!code) { setError('The recovery link is missing its authorization code. Request a new password reset email.'); return; }
    void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) throw exchangeError;
      if (active) router.replace('/auth/reset-password');
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'This recovery link is invalid or expired.'); });
    return () => { active = false; };
  }, [code, router]);
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
    {error ? <Text style={{ color: '#B91C1C', textAlign: 'center' }}>{error}</Text> : <><ActivityIndicator color="#15803D" /><Text>Verifying recovery link…</Text></>}
  </View>;
}
