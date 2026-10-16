/**
 * Per-user resting-face baseline: the calibration maths, the one-time
 * collector, and the session store only collecting while in 'collecting'.
 */
import { describe, expect, it } from 'vitest';
import {
  applyBaseline,
  BASELINE_FRAME_COUNT,
  BaselineCollector,
  NEUTRAL_REFERENCE,
} from '../../../src/capture/faceBaseline.js';
import { SessionStore } from '../../../src/capture/sessionStore.js';
import { computeTurnFaceEvidence } from '../../../src/capture/turnFaceEvidence.js';

// A relaxed webcam face that the model reads as mostly "sad".
const RESTING = { angry: 0.12, disgust: 0.01, fear: 0.15, happy: 0.05, neutral: 0.25, sad: 0.4, surprise: 0.02 };
const SMILE = { angry: 0.03, disgust: 0.0, fear: 0.04, happy: 0.7, neutral: 0.13, sad: 0.08, surprise: 0.02 };
const FROWN = { angry: 0.2, disgust: 0.02, fear: 0.2, happy: 0.01, neutral: 0.07, sad: 0.48, surprise: 0.02 };
const MODEL = 'fer-test';

const sum = (v: Record<string, number>) => Object.values(v).reduce((a, b) => a + b, 0);

function stateFor(mean: Record<string, number>, baseline: Record<string, number> | null) {
  const snapshot = { count: 10, modelVersion: MODEL, startedAt: 0, lastFrameAt: 1, meanVector: mean, resetCount: 0 };
  const b = baseline ? { probabilities: baseline, modelVersion: MODEL, frameCount: 5 } : null;
  const evidence = computeTurnFaceEvidence(snapshot, 1, b).evidence!;
  const s = evidence.scores;
  return (Object.keys(s) as (keyof typeof s)[]).reduce((a, k) => (s[k] > s[a] ? k : a));
}

describe('applyBaseline', () => {
  it('a face equal to the baseline becomes the neutral reference', () => {
    const out = applyBaseline(RESTING, RESTING);
    for (const [c, v] of Object.entries(NEUTRAL_REFERENCE)) expect(out[c]).toBeCloseTo(v / sum(NEUTRAL_REFERENCE), 9);
    expect(sum(out)).toBeCloseTo(1, 12);
  });

  it('resting face: distressed without a baseline, neutral with one', () => {
    expect(stateFor(RESTING, null)).toBe('distressed');
    expect(stateFor(RESTING, RESTING)).toBe('neutral');
  });

  it('a smile still reads calm and a frown still reads distressed', () => {
    expect(stateFor(SMILE, RESTING)).toBe('calm');
    expect(stateFor(FROWN, RESTING)).toBe('distressed');
  });

  it('a baseline from a different FER model is ignored', () => {
    const snapshot = { count: 10, modelVersion: MODEL, startedAt: 0, lastFrameAt: 1, meanVector: RESTING, resetCount: 0 };
    const other = { probabilities: RESTING, modelVersion: 'other-model', frameCount: 5 };
    expect(computeTurnFaceEvidence(snapshot, 1, other).evidence!.scores).toEqual(
      computeTurnFaceEvidence(snapshot, 1, null).evidence!.scores,
    );
  });
});

describe('BaselineCollector', () => {
  it('returns the mean once, on the frame that completes it, then nothing', () => {
    const collector = new BaselineCollector();
    for (let i = 1; i < BASELINE_FRAME_COUNT; i++) expect(collector.add(RESTING, MODEL)).toBeNull();
    const done = collector.add(RESTING, MODEL)!;
    expect(done.frameCount).toBe(BASELINE_FRAME_COUNT);
    expect(done.probabilities.sad).toBeCloseTo(0.4, 12);
    expect(collector.add(SMILE, MODEL)).toBeNull();
  });
});

describe('SessionStore baseline phases', () => {
  it('collects only while collecting, and reports the capture once', () => {
    const store = new SessionStore();
    const session = store.grantConsentForOwner('s1', 'u1');
    expect(session.baselinePhase).toBe('loading');

    // Frames while the saved baseline is still loading are never collected.
    expect(store.recordFrameForOwner('s1', RESTING, MODEL, 'u1')).toEqual({ ok: true, frameCount: 1, reset: false });

    session.baselinePhase = 'collecting';
    const results = Array.from({ length: BASELINE_FRAME_COUNT }, () => store.recordFrameForOwner('s1', RESTING, MODEL, 'u1'));
    const captured = results.filter((r) => r.ok && r.baselineCaptured);
    expect(captured).toHaveLength(1);
    expect(session.baselinePhase).toBe('ready');
    expect(session.faceBaseline?.frameCount).toBe(BASELINE_FRAME_COUNT);

    const after = store.recordFrameForOwner('s1', SMILE, MODEL, 'u1');
    expect(after.ok && after.baselineCaptured).toBeFalsy();
  });

  it('an unauthenticated legacy session never collects', () => {
    const store = new SessionStore();
    const session = store.grantConsent('s2');
    for (let i = 0; i < BASELINE_FRAME_COUNT + 1; i++) store.recordFrame('s2', RESTING, MODEL);
    expect(session.baselinePhase).toBe('off');
    expect(session.faceBaseline).toBeNull();
  });
});
