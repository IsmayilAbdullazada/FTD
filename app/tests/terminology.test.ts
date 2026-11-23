import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/db.js';
after(() => pool.end());
test('terminology migration is idempotent and changes only the canonical system category', async () => {
  const sql = await readFile(
    new URL(
      '../src/db/migrations/013_care_partner_terminology.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const client = await pool.connect();
  const id = randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(
      "INSERT INTO resources(id,title,summary,content_body,category,external_url) VALUES($1,'Original source wording','Original summary','Original source content','CAREGIVER_SUPPORT','https://example.test')",
      [id],
    );
    await client.query(sql);
    await client.query(sql);
    const row = (
      await client.query('SELECT * FROM resources WHERE id=$1', [id])
    ).rows[0];
    assert.equal(row.category, 'CARE_PARTNER_SUPPORT');
    assert.equal(row.title, 'Original source wording');
    assert.equal(row.content_body, 'Original source content');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
