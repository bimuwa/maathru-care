/**
 * Strict TypeScript types for GDM V4 Conservative Research Model.
 *
 * NOTE: GDM V4 is an experimental research prototype trained on 5 features:
 * 1. Age
 * 2. No of Pregnancy
 * 3. Family History
 * 4. unexplained prenetal loss
 * 5. Sedentary Lifestyle
 *
 * Threshold = 0.30 (from model metadata).
 * This model is strictly non-diagnostic and research-only.
 */

export interface GDMV4RiskRequest {
  age: number;
  no_of_pregnancy: number;
  family_history: 0 | 1;
  unexplained_prenatal_loss: 0 | 1;
  sedentary_lifestyle: 0 | 1;
}

export interface GDMV4RiskResponse {
  success: boolean;
  model_version: string;
  research_only: boolean;
  model_score: number;
  threshold: number;
  screen_positive: boolean;
  disclaimer: string;
}

export type MedicalHistoryChoice = 'yes' | 'no' | 'not_sure';

/** Shared wire/database encoding for explicit GDM V4 Yes/No values. */
export function toGdmV4Binary(value: boolean | MedicalHistoryChoice | null | undefined): 0 | 1 | null {
  if (value === true || value === 'yes') return 1;
  if (value === false || value === 'no') return 0;
  return null;
}

export interface GDMV4FormState {
  age: string;
  no_of_pregnancy: string;
  family_history: MedicalHistoryChoice | null;
  unexplained_prenatal_loss: MedicalHistoryChoice | null;
  sedentary_lifestyle: MedicalHistoryChoice | null;
}
