import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || 'placeholder-key';

// Expo static rendering evaluates this module in Node, where `window` (and so AsyncStorage on web) doesn't exist.
const isServer = typeof window === 'undefined';

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Supabase Auth session lives in AsyncStorage and is refreshed automatically (client only).
    // detectSessionInUrl is off because the app has no OAuth/magic-link redirects.
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

