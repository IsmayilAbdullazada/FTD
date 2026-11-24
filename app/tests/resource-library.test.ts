import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { listLibrary } from '../src/modules/resources/resourceLibrary.js';
after(() => pool.end());
test('unified library filters publication and condition, deduplicates PDFs, and keeps protected downloads', async () => {
  const suffix = randomUUID(),
    ids = ['ftd-' + suffix, 'ad-' + suffix],
    guideIds: string[] = [];
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-library-'));
  process.env.GUIDE_UPLOAD_DIRECTORY = directory;
  const { app } = await import('../src/app.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const url = '/uploads/guides/guide_' + suffix + '.pdf';
  try {
    for (const [index, id] of ids.entries())
      await pool.query(
        "INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label,condition) VALUES($1,$2,'unusable','CARE_PARTNER','Library','Test','Test',$3)",
        [id, id + '@example.test', index ? 'AD' : 'FTD'],
      );
    for (const [condition, status, active] of [
      ['FTD', 'APPROVED', true],
      ['AD', 'APPROVED', true],
      ['GENERAL', 'APPROVED', true],
      ['FTD', 'DRAFT', true],
      ['FTD', 'APPROVED', false],
    ] as const) {
      const id = 'library-' + randomUUID();
      guideIds.push(id);
      await pool.query(
        "INSERT INTO chatbot_guides(id,title,condition,status,is_active,file_name,content,pdf_url,uploaded_by) VALUES($1,'Library fixture',$2,$3,$4,'guide.pdf','Internal extracted document text',$5,'user-clinician-1')",
        [id, condition, status, active, id === guideIds[0] ? url : null],
      );
    }
    await pool.query(
      "INSERT INTO resources(id,title,summary,content_body,category,file_attachment_url,disease_domain) VALUES($1,'Duplicate','Duplicate','Duplicate','GUIDE',$2,'FTD')",
      [suffix, url],
    );
    const ftd = await listLibrary({
      id: ids[0],
      email: 'ftd@example.test',
      role: 'CARE_PARTNER',
    });
    for (const id of [guideIds[0], guideIds[2]])
      assert.ok(ftd.some((g) => g.id === id));
    for (const id of [guideIds[1], guideIds[3], guideIds[4], suffix])
      assert.ok(!ftd.some((g) => g.id === id));
    const mapped = ftd.find((g) => g.id === guideIds[0])!;
    assert.equal(mapped.contentBody, '');
    assert.equal(mapped.source, 'guide');
    await pool.query(
      "UPDATE chatbot_guides SET category='GUIDE',topic_tag='SAFETY_WANDERING' WHERE id=$1",
      [guideIds[0]],
    );
    assert.equal(
      (
        await listLibrary({
          id: ids[0],
          email: 'ftd@example.test',
          role: 'CARE_PARTNER',
        })
      ).find((guide) => guide.id === guideIds[0])?.category,
      'SAFETY_WANDERING',
    );
    assert.equal('status' in mapped, false);
    const ad = await listLibrary({
      id: ids[1],
      email: 'ad@example.test',
      role: 'CARE_PARTNER',
    });
    assert.ok(!ad.some((g) => g.id === guideIds[0]));
    assert.ok(ad.some((g) => g.id === guideIds[2]));
    const staff = await listLibrary({
      id: 'user-clinician-1',
      email: 'staff@example.test',
      role: 'CLINICIAN_MODERATOR',
    });
    assert.ok(staff.some((g) => g.id === guideIds[3] && g.status === 'DRAFT'));
    await fs.writeFile(
      path.join(directory, path.basename(url)),
      '%PDF-fixture',
    );
    const token = jwt.sign(
      { id: ids[0], email: 'ftd@example.test', sessionVersion: 0 },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        issuer: 'ftdcare-api',
        audience: 'ftdcare-web',
        expiresIn: '5m',
      },
    );
    assert.equal(
      (
        await fetch(base + url, {
          headers: { authorization: 'Bearer ' + token },
        })
      ).status,
      200,
    );
    assert.equal((await fetch(base + url)).status, 401);
    const textId = 'text-' + randomUUID();
    const keyword = 'plaintextsource' + randomUUID().replaceAll('-', '');
    guideIds.push(textId);
    await pool.query(
      "INSERT INTO chatbot_guides(id,title,condition,status,is_active,file_name,content,uploaded_by) VALUES($1,'Readable text guide','FTD','APPROVED',true,'guide.txt',$2,'user-clinician-1')",
      [textId, keyword],
    );
    await pool.query(
      'INSERT INTO guide_chunks(id,guide_id,page,content) VALUES($1,$2,1,$3)',
      [randomUUID(), textId, keyword],
    );
    const chat = await fetch(base + '/api/v1/knowledge/chat', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ query: keyword }),
    });
    assert.equal(chat.status, 200);
    const answer = await chat.json();
    assert.equal(
      answer.citedResources.find(
        (source: { id: string }) => source.id === textId,
      )?.url,
      '/?tab=knowledge&resource=' + encodeURIComponent(textId),
    );
    assert.equal(answer.retrievedChunks, undefined);
    assert.equal(
      (
        await listLibrary({
          id: ids[0],
          email: 'ftd@example.test',
          role: 'CARE_PARTNER',
        })
      ).find((guide) => guide.id === textId)?.contentBody,
      keyword,
    );
  } finally {
    server.closeIdleConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await pool.query('DELETE FROM resources WHERE id=$1', [suffix]);
    await pool.query('DELETE FROM chatbot_guides WHERE id=ANY($1::text[])', [
      guideIds,
    ]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [ids]);
    await fs.rm(directory, { recursive: true, force: true });
  }
});
