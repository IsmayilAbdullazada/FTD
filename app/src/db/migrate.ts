import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('[Migration] Running database schema migration for PostgreSQL 16...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[Migration] Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
