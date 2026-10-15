import AsyncStorage from "@react-native-async-storage/async-storage";

// Per-user camera choice, kept on the device so the privacy notice is shown only the first time a
// user opens the chat. `accepted` = agreed to the notice once; `on` = camera was on when last set.
export type CameraPreference = { accepted: boolean; on: boolean };

const key = (userId: string) => `maathru.chatbot.camera.${userId}`;

export async function loadCameraPreference(userId: string): Promise<CameraPreference | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as CameraPreference) : null;
  } catch {
    return null;
  }
}

export async function saveCameraPreference(userId: string, preference: CameraPreference): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(preference));
  } catch {
    // Storage unavailable: the notice may show again next time; nothing else depends on it.
  }
}
