import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'ftdcare_db',
  user: process.env.DB_USER || 'ftdcare_user',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[Postgres Pool Error]', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
