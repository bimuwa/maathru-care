import * as FileSystem from 'expo-file-system';

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

const API_URL = 'https://food-detector-api.onrender.com/predict';

export const analyzeMealImage = async (imageUri: string): Promise<DetectionResponse> => {
  try {
    const filename = imageUri.split('/').pop() || 'meal.jpg';

    // Use Expo FileSystem for robust native multipart uploads, bypassing React Native's Fetch/FormData quirks
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

    const data = JSON.parse(uploadResult.body);
    
    if (typeof data.success === 'undefined') {
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
  }
};
