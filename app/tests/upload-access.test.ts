import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

test('uploaded PDFs require login and approval for the reader condition', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-pdf-access-'));
  process.env.GUIDE_UPLOAD_DIRECTORY = directory;
  const { app } = await import('../src/app.js');
  const { pool } = await import('../src/config/db.js');
  const { env } = await import('../src/config/env.js');
  const id = randomUUID();
  const name = `guide_${id}.pdf`;
  const careId = `care-${id}`;
  const staffId = `staff-${id}`;
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/uploads/guides/${name}`;
  async function headers(userId: string) {
    const user = (
      await pool.query(
        'SELECT id,email,session_version FROM users WHERE id=$1',
        [userId],
      )
    ).rows[0];
    return {
      authorization:
        'Bearer ' +
        jwt.sign(
          {
            id: user.id,
            email: user.email,
            sessionVersion: user.session_version,
          },
          env.JWT_SECRET,
          {
            algorithm: 'HS256',
            issuer: 'ftdcare-api',
            audience: 'ftdcare-web',
            expiresIn: '1m',
          },
        ),
    };
  }
  try {
    await fs.writeFile(path.join(directory, name), '%PDF-fixture');
    for (const [userId, role] of [
      [careId, 'CARE_PARTNER'],
      [staffId, 'CLINICIAN_MODERATOR'],
    ])
      await pool.query(
        "INSERT INTO users(id,email,password_hash,role,first_name,last_name,condition,anonymous_handle,badge_label) VALUES($1,$1||'@example.test','disabled',$2,'Fixture','Reader','FTD',$1,'Fixture')",
        [userId, role],
      );
    const care = await headers(careId);
    const staff = await headers(staffId);
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: care })).status, 404);
    assert.equal((await fetch(url, { headers: staff })).status, 200);
    await pool.query(
      "INSERT INTO chatbot_guides(id,title,condition,file_name,content,pdf_url,uploaded_by) VALUES($1,'Fixture','FTD',$2,'Fixture',$3,$4)",
      [id, name, '/uploads/guides/' + name, staffId],
    );
    assert.equal((await fetch(url, { headers: care })).status, 404);
    await pool.query(
      "UPDATE chatbot_guides SET status='APPROVED' WHERE id=$1",
      [id],
    );
    const response = await fetch(url, { headers: care });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    await pool.query("UPDATE chatbot_guides SET condition='AD' WHERE id=$1", [
      id,
    ]);
    assert.equal((await fetch(url, { headers: care })).status, 404);
    await pool.query(
      "UPDATE chatbot_guides SET condition='FTD',is_active=false WHERE id=$1",
      [id],
    );
    assert.equal((await fetch(url, { headers: care })).status, 404);
  } finally {
    await pool.query('DELETE FROM chatbot_guides WHERE id=$1', [id]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [
      [careId, staffId],
    ]);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await pool.end();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
