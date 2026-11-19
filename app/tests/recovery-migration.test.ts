import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/db.js';

test('link-only migration invalidates old unconsumed credentials without rewriting migration history', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'CREATE TEMP TABLE password_resets(id text,code_hash text NOT NULL,consumed_at timestamptz) ON COMMIT DROP',
    );
    await client.query(
      "INSERT INTO password_resets VALUES('old-pending','hashed-code',NULL),('old-used','hashed-code',NOW())",
    );
    await client.query(
      await readFile(
        new URL(
          '../src/db/migrations/007_link_only_password_recovery.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const rows = await client.query('SELECT * FROM password_resets');
    assert.deepEqual(
      rows.rows.map((row) => row.id),
      ['old-used'],
    );
    assert.equal(
      rows.fields.some((field) => field.name === 'code_hash'),
      false,
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
