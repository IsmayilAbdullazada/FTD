import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

test('corrective upgrade revokes legacy bcryptjs credentials and sessions without changing unrelated accounts', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const applied = await client.query(
      "SELECT version FROM schema_migrations WHERE version='003_account_security'",
    );
    assert.equal(applied.rowCount, 1);
    const oldHash = await bcrypt.hash('Hopkins2026!', 12);
    assert.ok(oldHash.startsWith('$2b$'));
    const safeHash = await bcrypt.hash('An-unrelated-strong-password!', 12);
    const rows = [
      ['upgrade-care', oldHash],
      ['upgrade-clinician', oldHash],
      ['upgrade-admin', oldHash],
      ['upgrade-2a', oldHash.replace('$2b$', '$2a$')],
      ['upgrade-safe', safeHash],
    ];
    for (const [id, hash] of rows) {
      await client.query(
        `INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label,session_version)
        VALUES($1,$1||'@example.test',$2,'CARE_PARTNER','Upgrade','Fixture','Care Partner',7)`,
        [id, hash],
      );
    }
    // This database has already applied 003; 004 must repair the upgrade anyway.
    const sql = await readFile(
      new URL(
        '../src/db/migrations/004_revoke_legacy_bcrypt_credentials.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await client.query(sql);
    for (const [id] of rows) {
      const result = await client.query(
        'SELECT password_hash,session_version FROM users WHERE id=$1',
        [id],
      );
      const row = result.rows[0];
      assert.equal(
        await bcrypt.compare('Hopkins2026!', row.password_hash),
        false,
      );
      assert.equal(row.session_version, id === 'upgrade-safe' ? 7 : 8);
      if (id === 'upgrade-safe') assert.equal(row.password_hash, safeHash);
    }
    await client.query(sql);
    const repeat = await client.query(
      "SELECT session_version FROM users WHERE id='upgrade-care'",
    );
    assert.equal(repeat.rows[0].session_version, 8);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
