import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { logger } from '../lib/logger.js';
import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const embeddedDataDir =
  process.env.PGLITE_DATA_DIR || path.join(repositoryRoot, '.pgdata');

const hasDbConfig = Boolean(
  env.DATABASE_URL || env.DB_PASSWORD || env.NODE_ENV === 'test',
);

let useEmbedded = !hasDbConfig;
let embeddedPromise: Promise<PGlite> | null = null;
let embeddedLock: Promise<void> = Promise.resolve();

function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof AggregateError) return true;
  const code = 'code' in error ? String(error.code) : '';
  return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code);
}

function getEmbeddedDb(): Promise<PGlite> {
  if (!embeddedPromise) {
    logger.info(
      '[AI Studio] External PostgreSQL unreachable — using embedded PGlite database',
    );
    embeddedPromise = PGlite.create(embeddedDataDir, {
      extensions: { pgcrypto },
    });
  }
  return embeddedPromise;
}

function toPgResult<T extends QueryResultRow>(result: {
  rows: unknown[];
  affectedRows?: number;
  fields: Array<{ name: string; dataTypeID: number }>;
}): QueryResult<T> {
  const rows = result.rows as T[];
  return {
    rows,
    rowCount: rows.length > 0 ? rows.length : (result.affectedRows ?? 0),
    command: 'SELECT',
    oid: 0,
    fields: result.fields.map((field) => ({
      name: field.name,
      tableID: 0,
      columnID: 0,
      dataTypeID: field.dataTypeID,
      dataTypeSize: -1,
      dataTypeModifier: -1,
      format: 'text',
    })),
  };
}

async function runEmbeddedQuery<T extends QueryResultRow = QueryResultRow>(
  db: Pick<PGlite, 'query' | 'exec'>,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  const params = values.map((value) => (value === undefined ? null : value));
  if (params.length > 0) {
    const res = await db.query<T>(text, params);
    return toPgResult<T>(res);
  }
  const results = await db.exec(text);
  const last = results[results.length - 1] ?? {
    rows: [],
    affectedRows: 0,
    fields: [],
  };
  return toPgResult<T>(last);
}

async function acquireEmbeddedClient(): Promise<PoolClient> {
  let releaseLock!: () => void;
  const previous = embeddedLock;
  embeddedLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  await previous;
  const db = await getEmbeddedDb();
  let released = false;
  return {
    query: <T extends QueryResultRow = QueryResultRow>(
      text: string,
      values: unknown[] = [],
    ) => runEmbeddedQuery<T>(db, text, values),
    release: () => {
      if (!released) {
        released = true;
        releaseLock();
      }
    },
  } as unknown as PoolClient;
}

const realPool = hasDbConfig
  ? new Pool(
      env.DATABASE_URL
        ? {
            connectionString: env.DATABASE_URL,
            max: env.DB_POOL_MAX,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 3_000,
            ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
          }
        : {
            host: env.DB_HOST,
            port: env.DB_PORT,
            database: env.DB_NAME,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            max: env.DB_POOL_MAX,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 3_000,
            ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
          },
    )
  : null;

realPool?.on('error', (error) => logger.error('[Postgres pool error]', error));

export const pool = {
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (useEmbedded || !realPool) {
      const client = await acquireEmbeddedClient();
      try {
        return await client.query<T>(text, values);
      } finally {
        client.release();
      }
    }
    try {
      return await realPool.query<T>(text, values);
    } catch (error) {
      if (isConnectionError(error)) {
        useEmbedded = true;
        const client = await acquireEmbeddedClient();
        try {
          return await client.query<T>(text, values);
        } finally {
          client.release();
        }
      }
      throw error;
    }
  },
  async connect(): Promise<PoolClient> {
    if (useEmbedded || !realPool) return acquireEmbeddedClient();
    try {
      return await realPool.connect();
    } catch (error) {
      if (isConnectionError(error)) {
        useEmbedded = true;
        return acquireEmbeddedClient();
      }
      throw error;
    }
  },
  async end(): Promise<void> {
    if (realPool) await realPool.end();
    if (embeddedPromise) {
      const db = await embeddedPromise;
      await db.close();
      embeddedPromise = null;
    }
  },
};

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return pool.query<T>(text, values);
}

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
