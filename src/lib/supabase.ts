import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** In-memory cache so API calls right after sign-in don't race storage writes. */
let cachedAccessToken: string | null = null;

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // SecureStore has a ~2KB limit; Supabase sessions exceed it and fail silently.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    cachedAccessToken = session.access_token;
    return session.access_token;
  }

  const {
    data: { session: refreshed },
    error,
  } = await supabase.auth.refreshSession();

  if (error || !refreshed?.access_token) {
    return null;
  }

  cachedAccessToken = refreshed.access_token;
  return refreshed.access_token;
}
