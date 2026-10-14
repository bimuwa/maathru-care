import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface Detection {
  food_id: string;
  confidence: number;
  box?: [number, number, number, number];
}

export interface DetectionResponse {
  success: boolean;
  count: number;
  detections: Detection[];
  error?: string;
}

const API_URL = process.env.EXPO_PUBLIC_FOOD_DETECTOR_API_URL || 'https://food-detector-api.onrender.com/predict';
const configuredTimeout = Number(process.env.EXPO_PUBLIC_FOOD_DETECTOR_TIMEOUT_MS);
const WEB_UPLOAD_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout : 90_000;

export const analyzeMealImage = async (imageUri: string): Promise<DetectionResponse> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    let data: DetectionResponse;
    if (Platform.OS === 'web') {
      // ImageManipulator returns a browser-readable blob/data URI on web.
      // Expo's native File constructor is unsupported here (validatePath fails).
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), WEB_UPLOAD_TIMEOUT_MS);
      const imageResponse = await fetch(imageUri, { signal: controller.signal });
      if (!imageResponse.ok) throw new Error('Unable to read the selected image.');
      const blob = await imageResponse.blob();
      const form = new FormData();
      form.append('file', blob, 'meal.jpg');
      const response = await fetch(API_URL, {
        method: 'POST',
        body: form,
        signal: controller.signal,
        // The browser sets Content-Type together with its multipart boundary.
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      data = await response.json();
    } else {
      // Keep native file uploads on Android/iOS.
      const file = new FileSystem.File(imageUri);
      const uploadResult = await file.upload(API_URL, {
        httpMethod: 'POST',
        uploadType: FileSystem.UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Server returned ${uploadResult.status}`);
      }
      data = JSON.parse(uploadResult.body);
    }

    if (!data || typeof data.success !== 'boolean' ||
        !Number.isInteger(data.count) || data.count < 0 ||
        !Array.isArray(data.detections) || data.count !== data.detections.length) {
      throw new Error('Invalid response format');
    }

    return data as DetectionResponse;

  } catch (error: any) {
    console.error('Error analyzing meal:', error);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        count: 0,
        detections: [],
        error: 'The server took too long to respond. Please try again.',
      };
    }

    return {
      success: false,
      count: 0,
      detections: [],
      error: 'We couldn\'t analyze your meal right now. Please check your connection and try again.',
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};
