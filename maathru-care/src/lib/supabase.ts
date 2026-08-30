import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || 'placeholder-key';

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage removed — causes "Native module is null" crash in Expo Go.
    // Auth session persistence is disabled; queries still work with the anon key.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

