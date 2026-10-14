// The ONLY place chatbot auth gets wired: the chatbot backend accepts the Supabase JWT (access_token)
// of the user signed in to maathru-care.
import { supabase } from "../../lib/supabase";
import { useAppStore } from "./store";

export async function getChatbotAccessToken(): Promise<string | null> {
  return (await supabase.auth.getSession()).data.session?.access_token ?? null;
}

// Keeps the store's token in sync with the Supabase session (sign-in, sign-out, token refresh).
// Returns the unsubscribe function.
export function subscribeChatbotToken(): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    useAppStore.getState().setAccessToken(session?.access_token ?? null);
  });
  return () => subscription.unsubscribe();
}
