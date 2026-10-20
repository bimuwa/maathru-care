// Native face detection + crop, the phone's counterpart of useBlazeFace.web.ts + CameraPreview's
// canvas crop. Same rule as web: exactly one face, or nothing is sent. Detection is Google ML Kit
// on the device (a native module, so this needs the development build, not Expo Go); only the
// JPEG face crop leaves the phone.
import FaceDetection from "@react-native-ml-kit/face-detection";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { config } from "../config";

/** False in Expo Go, which does not include ML Kit: camera mood needs the development build. */
export const faceDetectionAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export type Photo = { uri: string; width: number; height: number };
/** Face box as fractions (0-1) of the photo, for drawing on the preview. */
export type FaceFraction = { x: number; y: number; w: number; h: number };
export type FaceCrop = { uri: string; box: FaceFraction };

/**
 * Find exactly one face in `photo` and save a JPEG crop of it.
 * Returns the face (`crop` null when there is not exactly one face) plus every temporary file
 * written, so the caller can delete them.
 */
export async function detectAndCrop(photo: Photo): Promise<{ crop: FaceCrop | null; files: string[] }> {
  const files: string[] = [];
  const faces = await FaceDetection.detect(photo.uri, { performanceMode: "fast", landmarkMode: "none", classificationMode: "none" });
  // Multiple faces -> skip, exactly as on web: never pick one.
  if (faces.length !== 1) return { crop: null, files };

  const { left, top, width, height } = faces[0].frame;
  const x = Math.max(0, Math.round(left));
  const y = Math.max(0, Math.round(top));
  const w = Math.min(photo.width - x, Math.round(width));
  const h = Math.min(photo.height - y, Math.round(height));
  if (w <= 0 || h <= 0) return { crop: null, files };

  const cropRef = await ImageManipulator.manipulate(photo.uri).crop({ originX: x, originY: y, width: w, height: h }).renderAsync();
  const crop = await cropRef.saveAsync({ format: SaveFormat.JPEG, compress: config.ferJpegQuality / 100 });
  files.push(crop.uri);
  return { crop: { uri: crop.uri, box: { x: x / photo.width, y: y / photo.height, w: w / photo.width, h: h / photo.height } }, files };
}
