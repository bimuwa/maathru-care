import { create } from "zustand";
import { ChatResponse, MoodState, ResponseMode, Modality, ModalityReading } from "./api/contracts";
import { defaultScenario, MockScenario } from "./api/mock";

export type Message = { id: string; role: "user" | "assistant"; text: string; response?: ChatResponse };
// Camera and text readings from the last reply, shown in the Info popup.
export type MoodReadings = { face: ModalityReading | null; text: ModalityReading | null; language: string };
export type LiveMoodAnalysis = { state: MoodState; confidence: number; modalities_used: Modality[]; fusion_version: string };
type AppState = { language: "en" | "si"; authenticated: boolean; accessToken: string | null; authError: string | null; cameraEnabled: boolean; cameraPaused: boolean; sentimentEnabled: boolean; consentSeen: boolean; consentAccepted: boolean; conversationId: string | null; messages: Message[]; scenario: MockScenario; lastMoodAnalysis: LiveMoodAnalysis | null; lastReadings: MoodReadings | null; setLastReadings: (readings: MoodReadings | null) => void; setLanguage: (language: "en" | "si") => void; setAccessToken: (token: string | null) => void; reset: () => void; setCamera: (enabled: boolean) => void; setCameraPaused: (paused: boolean) => void; setSentimentEnabled: (enabled: boolean) => void; setConsentSeen: (seen: boolean) => void; setConsentAccepted: (accepted: boolean) => void; addMessage: (message: Message) => void; openConversation: (conversationId: string, messages: Message[]) => void; setConversationId: (conversationId: string | null) => void; newChat: () => void; setScenario: (change: Partial<MockScenario>) => void; setLastMoodAnalysis: (analysis: LiveMoodAnalysis | null) => void };
export const useAppStore = create<AppState>((set) => ({
  language: "en",
  authenticated: false,
  accessToken: null,
  authError: null,
  cameraEnabled: false,
  cameraPaused: false,
  sentimentEnabled: true,
  consentSeen: false,
  consentAccepted: false,
  conversationId: null,
  messages: [],
  scenario: defaultScenario,
  lastMoodAnalysis: null,
  lastReadings: null,
  setLanguage: language => set({ language }),
  setAccessToken: token => set({ accessToken: token, authenticated: token !== null }),
  reset: () => set({ accessToken: null, authenticated: false, conversationId: null, messages: [], lastReadings: null, cameraEnabled: false, cameraPaused: false, sentimentEnabled: true, consentSeen: false, consentAccepted: false }),
  setCamera: cameraEnabled => set({ cameraEnabled, cameraPaused: false }),
  setCameraPaused: cameraPaused => set({ cameraPaused }),
  setSentimentEnabled: sentimentEnabled => set({ sentimentEnabled }),
  setConsentSeen: consentSeen => set({ consentSeen }),
  setConsentAccepted: consentAccepted => set({ consentAccepted }),
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  openConversation: (conversationId, messages) => set({ conversationId, messages, lastReadings: null }),
  setConversationId: conversationId => set({ conversationId }),
  // A new chat also drops the backend conversation id, so the next message starts a new conversation.
  newChat: () => set({ messages: [], conversationId: null, lastReadings: null }),
  setScenario: change => set(state => ({ scenario: { ...state.scenario, ...change } })),
  setLastMoodAnalysis: lastMoodAnalysis => set({ lastMoodAnalysis }),
  setLastReadings: lastReadings => set({ lastReadings })
}));
export const moodLabels: Record<MoodState, string> = { calm: "Calm", neutral: "Neutral", distressed: "Here with you", unknown: "Listening" };
export const responseLabels: Record<ResponseMode, string> = { normal: "Normal", supportive: "Supportive", safety: "Safety" };
