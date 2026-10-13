// TODO(backend phase): return a Supabase JWT (access_token) from maathru-care's
// Supabase project for the signed-in user. Until then the chatbot runs in mock
// mode with no token. This file is the ONLY place chatbot auth gets wired.
export async function getChatbotAccessToken(): Promise<string | null> {
  return null;
}
