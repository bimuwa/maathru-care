/**
 * The single PostgreSQL connection pool (C7 — Part B). Constructed lazily so
 * importing this module (or anything that imports it) never opens a socket —
 * the same convention `clients/*.ts` already use for upstream HTTP clients.
 *
 * `env.DATABASE_URL` is the only place a connection string comes from
 * (§2.1 rule 4 — the environment is read only inside src/config/).
 */
import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

/**
 * A client that sets search_path as part of connecting, before the pool hands it out, so every
 * query on it sees `schema`. Done per connection (not ALTER ROLE) because the database may be
 * shared with other apps. The name is validated as a plain identifier in config/env.ts.
 */
function schemaClient(schema: string): typeof pg.Client {
  type Callback = ((err: Error) => void) | ((err: null, c: pg.Client) => void);
  return class extends pg.Client {
    // pg.Pool connects with a callback; keep both call forms working.
    override connect(): Promise<pg.Client>;
    override connect(callback: Callback): void;
    override connect(callback?: Callback): Promise<pg.Client> | void {
      const ready = super
        .connect()
        .then(() => this.query(`SET search_path TO "${schema}", public`))
        .then(() => this as pg.Client);
      if (!callback) return ready;
      ready.then(
        (c) => (callback as (err: null, c: pg.Client) => void)(null, c),
        (err: Error) => (callback as (err: Error) => void)(err),
      );
    }
  };
}

export function getPool(): pg.Pool {
  if (!pool) {
    const schema = env.DATABASE_SCHEMA;
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ...(schema ? { Client: schemaClient(schema) } : {}),
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export type { QueryResult } from 'pg';
