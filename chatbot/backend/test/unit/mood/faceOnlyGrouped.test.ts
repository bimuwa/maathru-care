/**
 * Face-only turns use the highest GROUPED face share as the face state and
 * confidence (owner decision, 2026-10-17). With text present, the Rule A face
 * evidence is passed to fusion unchanged.
 */
import { describe, expect, it, vi } from 'vitest';

// The real logger loads and validates env at import; this unit needs neither.
vi.mock('../../../src/logging/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { analyseMood, type MoodServiceDeps } from '../../../src/mood/moodService.js';

const SINHALA = 'මට අද හරිම දුකයි';

// Single top class is happy (0.2665), but the distressed group sums to 0.5925.
const MEAN = { angry: 0.12, disgust: 0.0725, fear: 0.15, happy: 0.2665, sad: 0.25, surprise: 0.041, neutral: 0.1 };

const session = {
  accumulator: {
    snapshot: () => ({ count: 12, modelVersion: 'fer-test', startedAt: 0, lastFrameAt: 1, meanVector: MEAN, resetCount: 0 }),
  },
};

function makeDeps(textAvailable: boolean) {
  const predict = vi.fn(async () =>
    textAvailable
      ? {
          kind: 'success' as const,
          data: {
            evidence: { calm: 0.05, neutral: 0.15, distressed: 0.8 },
            predicted_label: 'DISTRESSED',
            confidence: 0.8,
            model_version: 'sent-test',
          },
        }
      : { kind: 'unavailable' as const, reason: 'timeout', code: 'sentiment_timeout', upstreamStatus: undefined },
  );
  const fuse = vi.fn(async (_request: { faceEvidence: Record<string, unknown> | null }) => ({
    kind: 'success' as const,
    data: { state: 'distressed', confidence: 0.6, modalities_used: ['face'], fusion_version: 'test' },
  }));
  const deps = {
    sessionStore: { get: () => session },
    sentimentClient: { predict },
    fusionClient: { fuse, health: async () => ({ ok: false }) },
    languageBounds: { siRatioHigh: 0.6, siRatioLow: 0.1 },
    languagePolicy: 'face_only',
    nodeEnv: 'test',
  } as unknown as MoodServiceDeps;
  return { deps, fuse };
}

describe('analyseMood — face-only grouped face state', () => {
  it('face-only: sends the highest grouped share as the face state and confidence', async () => {
    const { deps, fuse } = makeDeps(false);
    const outcome = await analyseMood({ sessionId: 's1', text: SINHALA }, deps);

    const face = fuse.mock.calls[0]![0].faceEvidence!;
    expect(face.predicted_state).toBe('distressed');
    expect(face.confidence).toBeCloseTo(0.5925, 6);
    expect(Object.keys(face)).toEqual(['scores', 'predicted_state', 'confidence', 'model_version']);
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok') expect(outcome.body.modality_breakdown.face?.state).toBe('distressed');
  });

  it('with text: passes the Rule A face evidence unchanged', async () => {
    const { deps, fuse } = makeDeps(true);
    const outcome = await analyseMood({ sessionId: 's1', text: SINHALA }, deps);

    const face = fuse.mock.calls[0]![0].faceEvidence!;
    expect(face.predicted_state).toBe('calm');
    expect(face.confidence).toBeCloseTo(0.2665, 6);
    // The displayed reading still matches the bars.
    if (outcome.kind === 'ok') expect(outcome.body.modality_breakdown.face?.state).toBe('distressed');
  });
});
