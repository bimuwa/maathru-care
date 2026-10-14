-- Link public.users profile rows to Supabase Auth (auth.users).
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Adds users.auth_user_id, makes users.password nullable (new accounts store no
-- password), and indexes lower(email). No RLS, drops or data changes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE
  REFERENCES auth.users (id) ON DELETE SET NULL;

-- Password is no longer stored for Supabase Auth accounts. DROP NOT NULL is a
-- no-op if the column is already nullable.
ALTER TABLE public.users
  ALTER COLUMN password DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON public.users (lower(email));
