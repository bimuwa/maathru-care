export type ScanState =
  | 'idle'
  | 'camera'
  | 'preview'
  | 'compressing'
  | 'analyzing'
  | 'review'
  | 'error'
  | 'no_detection';

export interface MealItem {
  id: string;
  foodId: string;
  name: string;
  confidence: number;
  imageUri?: string;
  servingMultiplier: number;

  carbsG: number;
  sugarG: number;
  fiberG: number;
  fatG: number;
  ironMg: number;
  calciumMg: number;

  timestamp: number;
}
