import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || 'placeholder-key';
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const isNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const nativeStorage = async () => (await import('@react-native-async-storage/async-storage')).default;

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: async (key) => isWeb ? window.localStorage.getItem(key) : isNative ? (await nativeStorage()).getItem(key) : null,
      setItem: async (key, value) => { if (isWeb) window.localStorage.setItem(key, value); else if (isNative) await (await nativeStorage()).setItem(key, value); },
      removeItem: async (key) => { if (isWeb) window.localStorage.removeItem(key); else if (isNative) await (await nativeStorage()).removeItem(key); },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

