import { create } from "zustand";
import { ChatResponse, MoodState, ResponseMode, Modality } from "./api/contracts";
import { defaultScenario, MockScenario } from "./api/mock";

export type Message = { id: string; role: "user" | "assistant"; text: string; response?: ChatResponse };
export type LiveMoodAnalysis = { state: MoodState; confidence: number; modalities_used: Modality[]; fusion_version: string };
type AppState = { language: "en" | "si"; authenticated: boolean; accessToken: string | null; authError: string | null; cameraEnabled: boolean; cameraPaused: boolean; consentSeen: boolean; messages: Message[]; scenario: MockScenario; lastMoodAnalysis: LiveMoodAnalysis | null; setLanguage: (language: "en" | "si") => void; setAccessToken: (token: string | null) => void; reset: () => void; setCamera: (enabled: boolean) => void; setCameraPaused: (paused: boolean) => void; setConsentSeen: (seen: boolean) => void; addMessage: (message: Message) => void; newChat: () => void; setScenario: (change: Partial<MockScenario>) => void; setLastMoodAnalysis: (analysis: LiveMoodAnalysis | null) => void };
export const useAppStore = create<AppState>((set) => ({
  language: "en",
  authenticated: false,
  accessToken: null,
  authError: null,
  cameraEnabled: false,
  cameraPaused: false,
  consentSeen: false,
  messages: [],
  scenario: defaultScenario,
  lastMoodAnalysis: null,
  setLanguage: language => set({ language }),
  setAccessToken: token => set({ accessToken: token, authenticated: token !== null }),
  reset: () => set({ accessToken: null, authenticated: false, messages: [], cameraEnabled: false, cameraPaused: false, consentSeen: false }),
  setCamera: cameraEnabled => set({ cameraEnabled, cameraPaused: false }),
  setCameraPaused: cameraPaused => set({ cameraPaused }),
  setConsentSeen: consentSeen => set({ consentSeen }),
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  newChat: () => set({ messages: [] }),
  setScenario: change => set(state => ({ scenario: { ...state.scenario, ...change } })),
  setLastMoodAnalysis: lastMoodAnalysis => set({ lastMoodAnalysis })
}));
export const moodLabels: Record<MoodState, string> = { calm: "Calm", neutral: "Neutral", distressed: "Here with you", unknown: "Listening" };
export const responseLabels: Record<ResponseMode, string> = { normal: "Normal", supportive: "Supportive", safety: "Safety" };
