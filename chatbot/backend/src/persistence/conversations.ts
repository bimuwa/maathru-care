import type pg from 'pg';
import { getPool } from '../db/pool.js';

export interface ConversationRecord {
  id: string;
  userId: string;
  createdAt: Date;
}

export async function createConversation(userId: string, pool: pg.Pool = getPool()): Promise<ConversationRecord> {
  const { rows } = await pool.query(
    'INSERT INTO conversations (user_id) VALUES ($1) RETURNING id, user_id, created_at',
    [userId],
  );
  return { id: rows[0].id, userId: rows[0].user_id, createdAt: rows[0].created_at };
}

/**
 * Ownership check WITHOUT distinguishing "doesn't exist" from "belongs to
 * someone else" to the caller (TRAP 2) — returns undefined for both; the
 * route layer logs which case actually happened.
 */
export async function findOwnedConversation(
  id: string,
  userId: string,
  pool: pg.Pool = getPool(),
): Promise<{ found: boolean; owned: boolean }> {
  const { rows } = await pool.query('SELECT user_id FROM conversations WHERE id = $1', [id]);
  if (rows.length === 0) return { found: false, owned: false };
  return { found: true, owned: rows[0].user_id === userId };
}

export interface ConversationSummary {
  id: string;
  createdAt: Date;
  lastMessageAt: Date;
  /** First user message, used as the list title. Never logged. */
  firstUserMessage: string | null;
}

/**
 * The caller's conversations that have at least one message, most recently
 * active first. Empty conversations (created but never used) are skipped.
 */
export async function listConversationSummaries(
  userId: string,
  limit: number,
  pool: pg.Pool = getPool(),
): Promise<ConversationSummary[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.created_at, MAX(m.created_at) AS last_message_at,
            (SELECT fm.content FROM messages fm
              WHERE fm.conversation_id = c.id AND fm.role = 'user'
              ORDER BY fm.created_at ASC LIMIT 1) AS first_user_message
       FROM conversations c
       JOIN messages m ON m.conversation_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY last_message_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    lastMessageAt: r.last_message_at,
    firstUserMessage: r.first_user_message,
  }));
}
