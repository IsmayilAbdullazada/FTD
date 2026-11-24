import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';

test('short public tags migrate safely, preserve valid tags and report namespace exhaustion', async () => {
  const client = await pool.connect();
  const schema = 'tags_' + randomBytes(8).toString('hex');
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema},public`);
    await client.query(
      `CREATE TABLE users(id text PRIMARY KEY,role text,anonymous_handle text UNIQUE NOT NULL,condition text,created_at timestamptz DEFAULT NOW())`,
    );
    await client.query(
      "INSERT INTO users(id,role,anonymous_handle,condition) VALUES ('existing','CARE_PARTNER','User-123','FTD'),('long','CARE_PARTNER','User-a2b3c4d5e6f789123456','AD'),('coded','CARE_PARTNER','User-FTD-456','FTD'),('staff','CLINICIAN_MODERATOR','A Clinician',NULL),('coded-staff','CLINICIAN_MODERATOR','FTD Moderator',NULL)",
    );
    await client.query(
      "CREATE TABLE posts(id text,author_id text REFERENCES users(id)); INSERT INTO posts VALUES('historical-post','long')",
    );
    const migration = await readFile(
      new URL(
        '../src/db/migrations/009_short_anonymous_handles.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await client.query(migration.replaceAll('public.', schema + '.'));
    const rows = (await client.query('SELECT * FROM users ORDER BY id')).rows;
    assert.equal(
      rows.find((row) => row.id === 'existing').anonymous_handle,
      'User-123',
    );
    assert.equal(
      rows.find((row) => row.id === 'staff').anonymous_handle,
      'A Clinician',
    );
    for (const row of rows.filter((row) => row.id !== 'staff'))
      assert.match(row.anonymous_handle, /^User-\d{3}$/);
    assert.equal(
      new Set(rows.map((row) => row.anonymous_handle)).size,
      rows.length,
    );
    assert.equal(rows.find((row) => row.id === 'long').condition, 'AD');
    assert.equal(
      (
        await client.query(
          "SELECT u.id FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id='historical-post'",
        )
      ).rows[0].id,
      'long',
    );
    await client.query('SAVEPOINT invalid_tag');
    await assert.rejects(
      client.query(
        "INSERT INTO users(id,role,anonymous_handle) VALUES('invalid','CARE_PARTNER','User-AD-999')",
      ),
      { code: '23514' },
    );
    await client.query('ROLLBACK TO SAVEPOINT invalid_tag');
    await client.query(
      "INSERT INTO users(id,role,anonymous_handle) SELECT 'capacity-'||n,'CARE_PARTNER','User-'||n FROM generate_series(100,999) n WHERE NOT EXISTS(SELECT 1 FROM users WHERE anonymous_handle='User-'||n)",
    );
    await client.query('SAVEPOINT full_namespace');
    await assert.rejects(
      client.query(`SELECT ${schema}.allocate_anonymous_handle()`),
      { code: 'P1001' },
    );
    await client.query('ROLLBACK TO SAVEPOINT full_namespace');
    const available = (
      await client.query(
        "DELETE FROM users WHERE id=(SELECT id FROM users WHERE id LIKE 'capacity-%' LIMIT 1) RETURNING anonymous_handle",
      )
    ).rows[0].anonymous_handle;
    assert.equal(
      (
        await client.query(
          `SELECT ${schema}.allocate_anonymous_handle() handle`,
        )
      ).rows[0].handle,
      available,
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});

test('parallel invited registrations get unique stored neutral tags and cannot choose their own', async () => {
  const fixture = randomUUID();
  const tokens = Array.from({ length: 12 }, () =>
    randomBytes(32).toString('base64url'),
  );
  const emails = tokens.map(
    (_, index) => `tag-${index}-${fixture}@example.test`,
  );
  const cohort = (
    await pool.query("SELECT slug FROM cohorts WHERE id='group-general'")
  ).rows[0].slug;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const [index, token] of tokens.entries())
      await pool.query(
        "INSERT INTO invitations(token_hash,email,primary_cohort_slug,condition,issued_by,expires_at) VALUES($1,$2,$3,$4,'user-clinician-1',NOW()+INTERVAL '1 day')",
        [
          createHash('sha256').update(token).digest('hex'),
          emails[index],
          cohort,
          index % 2 ? 'AD' : 'FTD',
        ],
      );
    const registrations = await Promise.all(
      tokens.map(async (token) => {
        const response = await fetch(base + '/api/v1/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token,
            password: 'Unique-tag-fixture-password!',
            carePartnerDetails: {
              patientAge: 70,
              carePartnerAge: 45,
              relationshipToPatient: 'Daughter',
              county: 'Baltimore',
              state: 'Maryland',
            },
            guidelinesAccepted: true,
            anonymousHandle: 'User-FTD-untrusted-long-value',
          }),
        });
        return {
          status: response.status,
          body: await response.json(),
          cookie: response.headers.get('set-cookie')?.split(';')[0],
        };
      }),
    );
    for (const registration of registrations) {
      assert.equal(registration.status, 201, JSON.stringify(registration.body));
      assert.match(registration.body.user.anonymousHandle, /^User-\d{3}$/);
      assert.doesNotMatch(registration.body.user.anonymousHandle, /FTD|AD/i);
      assert.notEqual(
        registration.body.user.id,
        registration.body.user.anonymousHandle,
      );
    }
    assert.equal(
      new Set(registrations.map((result) => result.body.user.anonymousHandle))
        .size,
      tokens.length,
    );
    const stored = (
      await pool.query(
        'SELECT id,anonymous_handle FROM users WHERE email=ANY($1::text[])',
        [emails],
      )
    ).rows;
    assert.equal(stored.length, tokens.length);
    for (const result of registrations)
      assert.equal(
        stored.find((row) => row.id === result.body.user.id).anonymous_handle,
        result.body.user.anonymousHandle,
      );
    const me = await fetch(base + '/api/v1/users/me', {
      headers: { cookie: registrations[0].cookie! },
    });
    assert.equal(
      (await me.json()).user.anonymousHandle,
      registrations[0].body.user.anonymousHandle,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    const users = (
      await pool.query('SELECT id FROM users WHERE email=ANY($1::text[])', [
        emails,
      ])
    ).rows.map((row) => row.id);
    await pool.query(
      'DELETE FROM notifications WHERE event_key=ANY($1::text[])',
      [
        (
          await pool.query(
            'SELECT id FROM invitations WHERE email=ANY($1::text[])',
            [emails],
          )
        ).rows.map((row) => `invitation-accepted:${row.id}`),
      ],
    );
    await pool.query('DELETE FROM invitations WHERE email=ANY($1::text[])', [
      emails,
    ]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [users]);
  }
});

test('user tags remain unique at the database boundary', async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = (
      await client.query(
        "SELECT anonymous_handle FROM users WHERE role='CARE_PARTNER' LIMIT 1",
      )
    ).rows[0];
    await assert.rejects(
      client.query(
        "INSERT INTO users(id,email,password_hash,role,first_name,last_name,anonymous_handle,badge_label) VALUES($1,$1||'@example.test','disabled','CARE_PARTNER','Duplicate','Fixture',$2,'Fixture')",
        [randomUUID(), existing.anonymous_handle],
      ),
      { code: '23505' },
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
