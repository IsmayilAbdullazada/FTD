import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { getGuidelinesStatus } from '../src/modules/policies/policies.service.js';
after(() => pool.end());
test('guidelines are versioned, idempotent and required for care partner posting only', async () => {
  const id = 'policy-' + randomUUID();
  await pool.query(
    "INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label) VALUES($1,$2,'unusable','CARE_PARTNER','Policy','Test','Test')",
    [id, id + '@example.test'],
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  async function token(userId: string) {
    const version = (
      await pool.query('SELECT session_version FROM users WHERE id=$1', [
        userId,
      ])
    ).rows[0].session_version;
    return jwt.sign(
      { id: userId, email: userId + '@example.test', sessionVersion: version },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        issuer: 'ftdcare-api',
        audience: 'ftdcare-web',
        expiresIn: '5m',
      },
    );
  }
  async function request(path: string, method = 'GET', user = id) {
    const response = await fetch(base + path, {
      method,
      headers: {
        authorization: 'Bearer ' + (await token(user)),
        'content-type': 'application/json',
      },
      ...(method === 'GET' ? {} : { body: '{}' }),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await request('/policies/status')).body.acknowledged, false);
    for (const path of ['/posts', '/posts/missing/comments']) {
      const rejected = await request(path, 'POST');
      assert.equal(rejected.status, 428);
      assert.equal(rejected.body.code, 'GUIDELINES_ACK_REQUIRED');
    }
    assert.equal(
      (await request('/policies/acknowledge', 'POST')).body.acknowledged,
      true,
    );
    assert.equal(
      (await request('/policies/acknowledge', 'POST')).body.acknowledged,
      true,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT * FROM policy_acknowledgments WHERE user_id=$1',
          [id],
        )
      ).rowCount,
      1,
    );
    assert.equal(
      (await getGuidelinesStatus(id, 'next-version')).acknowledged,
      false,
    );
    assert.equal((await request('/posts', 'POST')).status, 400); // posting validation now reached
    for (const staff of ['user-clinician-1', 'user-admin-1'])
      assert.equal((await request('/posts', 'POST', staff)).status, 400);
  } finally {
    server.closeIdleConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
});
