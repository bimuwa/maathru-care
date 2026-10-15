/**
 * User setting `textSensing` — when false, the sentiment model is skipped and
 * the turn is fused from face evidence alone. Fusion is still always called.
 */
import { describe, expect, it, vi } from 'vitest';

// The real logger loads and validates env at import; this unit needs neither.
vi.mock('../../../src/logging/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { analyseMood, type MoodServiceDeps } from '../../../src/mood/moodService.js';

const SINHALA = 'මට අද ටිකක් මහන්සියි';

function makeDeps() {
  const predict = vi.fn(async () => ({
    kind: 'unavailable' as const,
    reason: 'timeout',
    code: 'sentiment_timeout',
    upstreamStatus: undefined,
  }));
  const fuse = vi.fn(async (_request: unknown) => ({
    kind: 'success' as const,
    data: { state: 'unknown', confidence: 0, modalities_used: [], fusion_version: 'test' },
  }));
  const deps = {
    sessionStore: { get: () => undefined },
    sentimentClient: { predict },
    fusionClient: { fuse, health: async () => ({ ok: false }) },
    languageBounds: { siRatioHigh: 0.6, siRatioLow: 0.1 },
    languagePolicy: 'face_only',
    nodeEnv: 'test',
  } as unknown as MoodServiceDeps;
  return { deps, predict, fuse };
}

describe('analyseMood — textSensing user setting', () => {
  it('textSensing: false never calls the sentiment model and fuses without text evidence', async () => {
    const { deps, predict, fuse } = makeDeps();
    const outcome = await analyseMood({ sessionId: undefined, text: SINHALA, textSensing: false }, deps);

    expect(predict).not.toHaveBeenCalled();
    expect(fuse).toHaveBeenCalledTimes(1);
    expect(fuse.mock.calls[0]![0]).toEqual({ faceEvidence: null, textEvidence: null });
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok') {
      expect(outcome.body.text_evidence_dropped).toBe(true);
      expect(outcome.body.language_detected).toBe('si');
      expect(outcome.body.modality_breakdown).toEqual({ face: null, text: null });
    }
  });

  it('textSensing absent (default) still calls the sentiment model for Sinhala text', async () => {
    const { deps, predict, fuse } = makeDeps();
    await analyseMood({ sessionId: undefined, text: SINHALA }, deps);

    expect(predict).toHaveBeenCalledTimes(1);
    expect(fuse).toHaveBeenCalledTimes(1);
  });

  it('textSensing: true behaves like the default', async () => {
    const { deps, predict } = makeDeps();
    await analyseMood({ sessionId: undefined, text: SINHALA, textSensing: true }, deps);

    expect(predict).toHaveBeenCalledTimes(1);
  });
});
