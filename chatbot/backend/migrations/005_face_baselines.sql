-- Per-user resting-face baseline (owner decision, 2026-10-17). Seven FER
-- probabilities averaged over the first frames after the camera turns on —
-- derived numbers only, never an image. Replaced each time a new baseline is
-- captured; used to read later frames relative to the user's own resting face.
CREATE TABLE face_baselines (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  probabilities JSONB NOT NULL,
  model_version TEXT NOT NULL,
  frame_count INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
