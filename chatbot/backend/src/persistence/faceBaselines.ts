/**
 * Per-user resting-face baseline (see capture/faceBaseline.ts). Seven floats,
 * never an image. See migrations/005_face_baselines.sql.
 */
import type pg from 'pg';
import { getPool } from '../db/pool.js';
import type { FaceBaseline } from '../capture/faceBaseline.js';

export async function getFaceBaseline(userId: string, pool: pg.Pool = getPool()): Promise<FaceBaseline | undefined> {
  const { rows } = await pool.query(
    'SELECT probabilities, model_version, frame_count FROM face_baselines WHERE user_id = $1',
    [userId],
  );
  const row = rows[0];
  return row
    ? { probabilities: row.probabilities, modelVersion: row.model_version, frameCount: row.frame_count }
    : undefined;
}

export async function saveFaceBaseline(userId: string, baseline: FaceBaseline, pool: pg.Pool = getPool()): Promise<void> {
  await pool.query(
    `INSERT INTO face_baselines (user_id, probabilities, model_version, frame_count, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE
       SET probabilities = EXCLUDED.probabilities, model_version = EXCLUDED.model_version,
           frame_count = EXCLUDED.frame_count, updated_at = now()`,
    [userId, JSON.stringify(baseline.probabilities), baseline.modelVersion, baseline.frameCount],
  );
}
