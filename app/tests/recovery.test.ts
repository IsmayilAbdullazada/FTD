import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { app } from '../src/app.js';
import { processRecoveryJob } from '../src/services/recovery.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

test('link-only recovery is private, expiring, single-use under concurrent requests and revokes sessions', async () => {
  const id = randomUUID();
  const email = id + '@example.test';
  const sent: Array<{ text: string; html: string; from: string }> = [];
  const settings = { SMTP_HOST: env.SMTP_HOST };
  env.SMTP_HOST = 'smtp.example.test';
  const transport = mock.method(
    nodemailer,
    'createTransport',
    (options: { requireTLS?: boolean; auth?: unknown }) => {
      assert.equal(options.requireTLS, true);
      assert.equal(options.auth, undefined);
      return {
        sendMail: async (message: {
          text: string;
          html: string;
          from: string;
        }) => {
          sent.push(message);
        },
      };
    },
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = async (path: string, body: unknown) => {
    const response = await fetch(base + '/api/v1/auth/' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  };
  async function issueLink(existingJobId?: string) {
    const job = existingJobId
      ? { id: existingJobId }
      : (
          await pool.query(
            'INSERT INTO password_recovery_jobs(email) VALUES($1) RETURNING id',
            [email],
          )
        ).rows[0];
    const before = sent.length;
    await processRecoveryJob(job.id);
    assert.equal(
      sent.length,
      before + 1,
      'each recovery request sends exactly one email',
    );
    const message = sent.at(-1)!;
    assert.equal(message.from, env.SMTP_FROM);
    assert.match(message.text, /20 minutes/);
    assert.doesNotMatch(message.text, /verification code|recovery code/i);
    const url = new URL(message.text.match(/https?:\/\/\S+/)![0]);
    assert.equal(url.searchParams.get('email'), null);
    assert.equal(url.searchParams.get('resetToken'), null);
    const token = new URLSearchParams(url.hash.slice(1)).get('resetToken')!;
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(
      (
        await pool.query(
          'SELECT completed_at FROM password_recovery_jobs WHERE id=$1',
          [job.id],
        )
      ).rows[0].completed_at,
    );
    return token;
  }
  try {
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label) VALUES($1,$2,$3,'CARE_PARTNER','Recovery','Fixture','Care Partner')",
      [id, email, await bcrypt.hash('Initial-fixture-password!', 12)],
    );
    const login = await request('login', {
      identifier: email,
      password: 'Initial-fixture-password!',
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const known = await request('forgot-password', { email });
    const unknownEmail = randomUUID() + '@example.test';
    const unknown = await request('forgot-password', { email: unknownEmail });
    assert.equal(known.status, 200);
    assert.deepEqual(known.body, unknown.body);
    assert.equal(known.body.resetToken, undefined);
    assert.equal(known.body.testCode, undefined);
    const unknownJob = (
      await pool.query('SELECT id FROM password_recovery_jobs WHERE email=$1', [
        unknownEmail,
      ])
    ).rows[0];
    await processRecoveryJob(unknownJob.id);
    assert.equal(sent.length, 0);
    await pool.query('DELETE FROM password_recovery_jobs WHERE id=$1', [
      unknownJob.id,
    ]);
    const queuedJob = (
      await pool.query(
        'SELECT id FROM password_recovery_jobs WHERE email=$1 ORDER BY created_at LIMIT 1',
        [email],
      )
    ).rows[0];
    const token = await issueLink(queuedJob.id);
    const hash = createHash('sha256').update(token).digest('hex');
    const stored = (
      await pool.query('SELECT * FROM password_resets WHERE user_id=$1', [id])
    ).rows[0];
    assert.equal(stored.token_hash, hash);
    assert.equal(stored.code_hash, undefined);
    assert.ok(new Date(stored.expires_at).getTime() > Date.now() + 19 * 60_000);
    assert.equal(
      (await request('reset-password', { token, newPassword: 'short' })).status,
      400,
    );
    assert.equal(
      (
        await request('reset-password', {
          token: randomBytes(32).toString('base64url'),
          newPassword: 'Other-fixture-password!',
        })
      ).status,
      400,
    );
    await pool.query(
      "UPDATE password_resets SET expires_at=NOW()-INTERVAL '1 minute' WHERE user_id=$1",
      [id],
    );
    assert.equal(
      (
        await request('reset-password', {
          token,
          newPassword: 'Other-fixture-password!',
        })
      ).status,
      400,
    );
    const replacement = await issueLink();
    assert.equal(
      (
        await request('reset-password', {
          token,
          newPassword: 'Other-fixture-password!',
        })
      ).status,
      400,
    );
    const outcomes = await Promise.all(
      ['First-new-fixture-password!', 'Second-new-fixture-password!'].map(
        (newPassword) =>
          request('reset-password', { token: replacement, newPassword }),
      ),
    );
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 400]);
    const winner =
      outcomes[0].status === 200
        ? 'First-new-fixture-password!'
        : 'Second-new-fixture-password!';
    assert.equal(
      (await request('login', { identifier: email, password: winner })).status,
      200,
    );
    assert.equal(
      (
        await request('login', {
          identifier: email,
          password: 'Initial-fixture-password!',
        })
      ).status,
      401,
    );
    assert.equal(
      (await fetch(base + '/api/v1/users/me', { headers: { cookie } })).status,
      401,
    );
    assert.equal(
      (await pool.query('SELECT session_version FROM users WHERE id=$1', [id]))
        .rows[0].session_version,
      1,
    );
    assert.equal(
      (
        await request('reset-password', {
          token: replacement,
          newPassword: 'Replay-fixture-password!',
        })
      ).status,
      400,
    );
    const inactiveToken = await issueLink();
    await pool.query('UPDATE users SET is_active=false WHERE id=$1', [id]);
    assert.equal(
      (
        await request('reset-password', {
          token: inactiveToken,
          newPassword: 'Inactive-fixture-password!',
        })
      ).status,
      400,
    );
    const outbox = await pool.query(
      'SELECT text_body,html_body FROM email_outbox WHERE recipient=$1',
      [email],
    );
    assert.equal(outbox.rowCount, 3);
    assert.ok(
      outbox.rows.every(
        (row) =>
          row.text_body === '[Content not retained]' &&
          row.html_body === '[Content not retained]',
      ),
    );
  } finally {
    transport.mock.restore();
    Object.assign(env, settings);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await pool.query('DELETE FROM password_recovery_jobs WHERE email=$1', [
      email,
    ]);
    await pool.query('DELETE FROM email_outbox WHERE recipient=$1', [email]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    await pool.end();
  }
});
