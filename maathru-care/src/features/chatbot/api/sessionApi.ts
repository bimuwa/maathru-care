import { config } from "../config";
import { sessionId } from "../session";
import { useAppStore } from "../store";
import type { MoodState, Modality } from "./contracts";

export type MoodAnalyseResponse = {
  state: MoodState;
  confidence: number;
  modalities_used: Modality[];
  fusion_version: string;
};

function authHeaders(): Record<string, string> {
  const token = useAppStore.getState().accessToken;
  if (!token) throw new Error("No access token: cannot call the backend before anonymous sign-in completes.");
  return { Authorization: `Bearer ${token}`, "x-session-id": sessionId };
}

export async function grantCameraConsent(): Promise<void> {
  if (config.apiMode === "mock") return;
  const res = await fetch(`${config.apiBaseUrl}/api/v1/session/camera/consent`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ granted: true })
  });
  if (!res.ok) throw new Error(`camera consent request failed: ${res.status}`);
}

export async function setCameraActive(active: boolean): Promise<void> {
  if (config.apiMode === "mock") return;
  const res = await fetch(`${config.apiBaseUrl}/api/v1/session/camera/state`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ active })
  });
  if (!res.ok) throw new Error(`camera state request failed: ${res.status}`);
}

// Start the face average afresh (new chat, past chat opened, chat screen opened).
// Best-effort: a failure only means the next reply also reads earlier frames.
export function resetCameraFrames(): void {
  if (config.apiMode === "mock" || !useAppStore.getState().cameraEnabled) return;
  let headers: Record<string, string>;
  try {
    headers = authHeaders();
  } catch {
    return;
  }
  fetch(`${config.apiBaseUrl}/api/v1/session/camera/reset`, { method: "POST", headers }).catch(() => {});
}

export async function revokeCamera(): Promise<void> {
  if (config.apiMode === "mock") return;
  const res = await fetch(`${config.apiBaseUrl}/api/v1/session/camera`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`camera revoke request failed: ${res.status}`);
}

// Fire-and-forget by design (§3A.6): the response renders nothing, and
// {"accepted":false,...} for no-face/back-pressure/rate-limit is normal
// operation, not an error. Network failures are swallowed for the same
// reason -- there is nothing to surface to the user.
export function postFrame(blob: Blob): void {
  if (config.apiMode === "mock") return;
  let headers: Record<string, string>;
  try {
    headers = authHeaders();
  } catch {
    return;
  }
  const form = new FormData();
  form.append("image", blob, "frame.jpg");
  fetch(`${config.apiBaseUrl}/api/v1/session/frame`, { method: "POST", headers, body: form })
    .then(res => { if (res.status === 409 || res.status === 403) resyncCamera(res.status); })
    .catch(() => {});
}

// Self-repair: the app thinks the camera is on but the backend says the session is paused (409)
// or has no consent (403) -- e.g. a resume sent before sign-in finished, or a backend restart
// (sessions are in memory). Re-send resume / consent, at most once every 5 s.
let lastResync = 0;
function resyncCamera(status: number): void {
  const s = useAppStore.getState();
  if (!s.cameraEnabled || s.cameraPaused || Date.now() - lastResync < 5000) return;
  lastResync = Date.now();
  (status === 403 ? grantCameraConsent() : setCameraActive(true)).catch(() => {});
}

export async function analyseMood(text: string): Promise<MoodAnalyseResponse> {
  if (config.apiMode === "mock") throw new Error("mood analysis unavailable in mock mode");
  const res = await fetch(`${config.apiBaseUrl}/api/v1/mood/analyse`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, text_sensing: useAppStore.getState().sentimentEnabled })
  });
  if (!res.ok) throw new Error(`mood analyse request failed: ${res.status}`);
  return (await res.json()) as MoodAnalyseResponse;
}
