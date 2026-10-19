/**
 * A chat turn reads only the frames since the previous chat turn, and the
 * client's follow-up /mood/analyse for the same text reads that same face
 * (owner decision, 2026-10-19).
 */
import { describe, expect, it, vi } from 'vitest';

// The real logger loads and validates env at import; this unit needs neither.
vi.mock('../../../src/logging/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { analyseMood, type MoodServiceDeps } from '../../../src/mood/moodService.js';
import { FrameAccumulator } from '../../../src/capture/frameAccumulator.js';
import type { CameraSession } from '../../../src/capture/sessionStore.js';

const SINHALA = 'මට අද හරිම දුකයි';
const SMILE = { angry: 0.05, disgust: 0.01, fear: 0.05, happy: 0.8, neutral: 0.05, sad: 0.02, surprise: 0.02 };
const SAD = { angry: 0.25, disgust: 0.05, fear: 0.2, happy: 0.15, neutral: 0.05, sad: 0.25, surprise: 0.05 };

function makeSession(): CameraSession {
  return { sessionId: 's1', consentGrantedAt: 0, cameraActive: true, accumulator: new FrameAccumulator(0), lastTurn: null };
}

function makeDeps(session: CameraSession) {
  const fuse = vi.fn(async (_request: { faceEvidence: Record<string, unknown> | null }) => ({
    kind: 'success' as const,
    data: { state: 'calm', confidence: 0.6, modalities_used: ['face'], fusion_version: 'test' },
  }));
  const deps = {
    sessionStore: { get: () => session },
    sentimentClient: {
      predict: vi.fn(async () => ({ kind: 'unavailable' as const, reason: 'timeout', code: 'sentiment_timeout', upstreamStatus: undefined })),
    },
    fusionClient: { fuse, health: async () => ({ ok: false }) },
    languageBounds: { siRatioHigh: 0.6, siRatioLow: 0.1 },
    languagePolicy: 'face_only',
    nodeEnv: 'test',
  } as unknown as MoodServiceDeps;
  return { deps, fuse };
}

function addFrames(session: CameraSession, probabilities: Record<string, number>, n: number): void {
  for (let i = 0; i < n; i += 1) session.accumulator.addFrame(probabilities, 'fer-test', i + 1);
}

describe('analyseMood — per-turn face window', () => {
  it('a chat turn clears the frames it read, so the next turn reads only its own', async () => {
    const session = makeSession();
    const { deps } = makeDeps(session);

    addFrames(session, SMILE, 5);
    const first = await analyseMood({ sessionId: 's1', text: 'one', endTurn: true }, deps);
    expect(first.kind === 'ok' && first.body.modality_breakdown.face?.state).toBe('calm');
    expect(first.kind === 'ok' && first.body.face_frame_count).toBe(5);
    expect(session.accumulator.count).toBe(0);

    addFrames(session, SAD, 3);
    const second = await analyseMood({ sessionId: 's1', text: 'two', endTurn: true }, deps);
    expect(second.kind === 'ok' && second.body.modality_breakdown.face?.state).toBe('distressed');
    expect(second.kind === 'ok' && second.body.face_frame_count).toBe(3);
  });

  it("the follow-up analyse for the same text reads the chat turn's frames, once", async () => {
    const session = makeSession();
    const { deps } = makeDeps(session);

    addFrames(session, SMILE, 4);
    await analyseMood({ sessionId: 's1', text: SINHALA, endTurn: true }, deps);
    addFrames(session, SAD, 1);

    const followUp = await analyseMood({ sessionId: 's1', text: SINHALA }, deps);
    expect(followUp.kind === 'ok' && followUp.body.modality_breakdown.face?.state).toBe('calm');
    expect(followUp.kind === 'ok' && followUp.body.face_frame_count).toBe(4);
    expect(session.lastTurn).toBeNull();
    // The live frames are untouched by the follow-up.
    expect(session.accumulator.count).toBe(1);
  });

  it('an analyse for different text reads the live frames', async () => {
    const session = makeSession();
    const { deps } = makeDeps(session);

    addFrames(session, SMILE, 4);
    await analyseMood({ sessionId: 's1', text: 'one', endTurn: true }, deps);
    addFrames(session, SAD, 2);

    const other = await analyseMood({ sessionId: 's1', text: 'something else' }, deps);
    expect(other.kind === 'ok' && other.body.face_frame_count).toBe(2);
  });
});

describe('FrameAccumulator.clearTurn', () => {
  it('zeroes the frames without counting a model-version reset', () => {
    const acc = new FrameAccumulator(0);
    acc.addFrame(SMILE, 'fer-test', 1);
    acc.clearTurn();
    expect(acc.count).toBe(0);
    expect(acc.mean()).toBeNull();
    expect(acc.resetCount).toBe(0);
    expect(acc.startedAt).toBe(0);
  });
});
