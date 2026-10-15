import { config } from "../config";
import { ChatApi, ChatResponse, ProvisionalChatReplyI1B } from "./contracts";
import { MockChatApi, defaultScenario } from "./mock";
import { useAppStore } from "../store";

function authHeaders(): Record<string, string> {
  const token = useAppStore.getState().accessToken;
  if (!token) throw new Error("No access token: cannot call the backend before anonymous sign-in completes.");
  return { Authorization: `Bearer ${token}` };
}

// The open conversation's id lives in the store: created lazily on the first send,
// cleared by New chat and logout, and set when a past chat is opened.
async function getOrCreateConversationId(): Promise<string> {
  const current = useAppStore.getState().conversationId;
  if (current) return current;
  const res = await fetch(`${config.apiBaseUrl}/api/v1/conversations`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const body = (await res.json()) as { id: string };
  useAppStore.getState().setConversationId(body.id);
  return body.id;
}

export type ConversationSummary = { id: string; title: string; created_at: string; last_message_at: string };

// Past chats for the side panel, most recent first. Mock mode has no history.
export async function listConversations(): Promise<ConversationSummary[]> {
  if (config.apiMode === "mock") return [];
  const res = await fetch(`${config.apiBaseUrl}/api/v1/conversations`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return ((await res.json()) as { conversations: ConversationSummary[] }).conversations;
}

// Loads a past chat's messages and makes it the open conversation.
export async function openConversation(id: string): Promise<void> {
  const res = await fetch(`${config.apiBaseUrl}/api/v1/conversations/${id}/messages`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const body = (await res.json()) as { messages: { id: string; role: "user" | "assistant"; content: string }[] };
  useAppStore.getState().openConversation(id, body.messages.map(m => ({ id: m.id, role: m.role, text: m.content })));
}

export function createChatApi(getScenario: () => typeof defaultScenario): ChatApi {
  if (config.apiMode === "mock") return new MockChatApi(getScenario);
  return {
    async sendMessage(request) {
      const id = await getOrCreateConversationId();
      // ⛔ FIXED (post-manual-verification) -- this call never sent
      // x-session-id, so the backend's mood_debug was silently text-only
      // regardless of camera state: confirmed live by sending the same
      // message with a detected, tracked face and getting the byte-identical
      // confidence as with the camera off. `request.session_id` is the same
      // per-app-load id every other authenticated call already sends.
      const res = await fetch(`${config.apiBaseUrl}/api/v1/conversations/${id}/messages`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json", "x-session-id": request.session_id },
        body: JSON.stringify({ content: request.text, text_sensing: useAppStore.getState().sentimentEnabled })
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const reply = (await res.json()) as ProvisionalChatReplyI1B;
      const breakdown = reply.mood_debug.modality_breakdown;
      useAppStore.getState().setLastReadings({ face: breakdown?.face ?? null, text: breakdown?.text ?? null, language: reply.mood_debug.language_detected });
      // Adapted at the call site (not a rename of ChatResponse -- see
      // contracts.ts). ⛔ `response_mode` is left as the backend's real
      // `null` -- B-1 (M6/M8) is unresolved, so no real mode is guessed. The
      // cast is needed only because `ChatResponse.response_mode` has no
      // `null` arm yet (D-1 was never asked to account for this scaffolding
      // path); nothing here invents a `normal`/`supportive`/`safety` value.
      // `content_suggestion` has no real value yet either. `mood` mirrors the
      // dev-only `mood_debug` field, not a real fused-modality signal.
      const adapted = {
        message_id: reply.id,
        session_id: request.session_id,
        response: reply.content,
        language: request.ui_language,
        response_mode: reply.response_mode,
        content_suggestion: null,
        mood: { state: reply.mood_debug.state, modalities_used: reply.mood_debug.modalities_used },
        // ⛔ Provisional passthrough -- `reply.music_offer` does not exist on
        // the backend's I1-B payload yet (see contracts.ts). This is a
        // straight passthrough, not a frontend-invented catalogue: once the
        // backend adds the field, its value flows through unchanged.
        music_offer: reply.music_offer ?? null
      } as unknown as ChatResponse;
      return adapted;
    }
  };
}
