/**
 * Per-user resting-face baseline (owner decision, 2026-10-17).
 *
 * The FER model was trained on FER2013 (48x48 grey, posed faces). On a live
 * webcam a relaxed face can look "sad" to it, so a normal face reads as
 * distressed. On the validation split there is no such bias (neutral is
 * predicted 29.7% of the time against a true 28.5%), so this is camera/person
 * domain shift, and the fix is per person rather than a global re-weighting.
 *
 * Captured ONCE per user: when a user first grants camera consent and has no
 * saved baseline, the first BASELINE_FRAME_COUNT valid frames (~5 s at the 1 s
 * sample rate) form their resting face `b`, saved to the database. First use
 * of the app is when distress is least likely, and a later distressed moment
 * can never become the user's "normal". Later sessions load the saved one.
 * A turn's mean 7-vector `p` is then re-expressed relative to it:
 *
 *     p'_c ∝ (p_c + ε) · r_c / (b_c + ε)
 *
 * where `r` is the model's mean output on validation faces labelled neutral.
 * A face equal to the user's baseline becomes `r` (grouped: 60% neutral), and
 * a smile or a frown moves away from it in proportion to how far the face
 * moved from the user's own resting face.
 *
 * ⛔ No image is kept: the baseline is seven floats, like the accumulator.
 */
import { FER_SERVICE_CLASS_ORDER, type FerProbabilities } from './frameAccumulator.js';

/**
 * Mean FER output over the 607 validation faces labelled `neutral`
 * (ml/fer/outputs/nb04_val_probabilities.csv). MEASURED, not chosen.
 * Grouped: calm 0.109, neutral 0.600, distressed 0.291; top class neutral.
 */
export const NEUTRAL_REFERENCE: Readonly<FerProbabilities> = Object.freeze({
  angry: 0.089743,
  disgust: 0.002747,
  fear: 0.06408,
  happy: 0.109367,
  neutral: 0.577213,
  sad: 0.134091,
  surprise: 0.022759,
});

/** Frames that form the baseline (~5 s at the 1 s sample rate). PROVISIONAL. */
export const BASELINE_FRAME_COUNT = 5;

/**
 * Additive smoothing on both sides of the ratio, so a class the baseline put
 * near zero cannot be amplified without bound. PROVISIONAL engineering
 * constant, not a measured value; tune it with real webcam data.
 */
export const BASELINE_SMOOTHING = 0.01;

export interface FaceBaseline {
  /** Mean of the baseline frames, keyed by FER class name. */
  probabilities: FerProbabilities;
  /** FER model the baseline came from; a different model ignores it. */
  modelVersion: string;
  frameCount: number;
}

/** Re-express `mean` relative to `baseline`; the result sums to 1. */
export function applyBaseline(mean: FerProbabilities, baseline: FerProbabilities): FerProbabilities {
  const out: FerProbabilities = {};
  let total = 0;
  for (const c of FER_SERVICE_CLASS_ORDER) {
    const v =
      (((mean[c] as number) + BASELINE_SMOOTHING) * (NEUTRAL_REFERENCE[c] as number)) /
      ((baseline[c] as number) + BASELINE_SMOOTHING);
    out[c] = v;
    total += v;
  }
  for (const c of FER_SERVICE_CLASS_ORDER) out[c] = (out[c] as number) / total;
  return out;
}

/** Collects the first BASELINE_FRAME_COUNT frames after a first consent. */
export class BaselineCollector {
  private sum: FerProbabilities = {};
  private count = 0;
  private modelVersion: string | null = null;
  private done = false;

  /** Restart collection (the FER model changed mid-collection). */
  restart(): void {
    this.sum = {};
    this.count = 0;
    this.modelVersion = null;
    this.done = false;
  }

  /** Add one valid frame. Returns the finished baseline on the frame that completes it. */
  add(probabilities: FerProbabilities, modelVersion: string): FaceBaseline | null {
    if (this.done) return null;
    if (this.modelVersion !== null && this.modelVersion !== modelVersion) this.restart();
    this.modelVersion = modelVersion;
    for (const c of FER_SERVICE_CLASS_ORDER) this.sum[c] = (this.sum[c] ?? 0) + (probabilities[c] as number);
    this.count += 1;
    if (this.count < BASELINE_FRAME_COUNT) return null;
    this.done = true;
    const mean: FerProbabilities = {};
    for (const c of FER_SERVICE_CLASS_ORDER) mean[c] = (this.sum[c] as number) / this.count;
    return { probabilities: mean, modelVersion, frameCount: this.count };
  }
}
