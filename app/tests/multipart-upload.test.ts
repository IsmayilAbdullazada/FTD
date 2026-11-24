import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';

let server: http.Server;
let pool: (typeof import('../src/config/db.js'))['pool'];
let base: string;
let directory: string;
let staffHeaders: Record<string, string>;
let careHeaders: Record<string, string>;
let pdf: Buffer;
const staffId = 'multipart-staff-' + randomUUID();
const careId = 'multipart-care-' + randomUUID();
const MAX_BYTES = 12 * 1024 * 1024;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-multipart-'));
  process.env.GUIDE_UPLOAD_DIRECTORY = directory;
  const db = await import('../src/config/db.js');
  pool = db.pool;
  const { env } = await import('../src/config/env.js');
  const { app } = await import('../src/app.js');
  for (const [id, role] of [
    [staffId, 'SYSTEM_ADMIN'],
    [careId, 'CARE_PARTNER'],
  ]) {
    await pool.query(
      `INSERT INTO users(id,email,password_hash,role,first_name,last_name,badge_label,condition)
      VALUES($1,$2,'unusable-test-hash',$3,'Upload','Test','Test account','FTD')`,
      [id, id + '@example.test', role],
    );
  }
  function headers(id: string) {
    const token = jwt.sign(
      { id, email: id + '@example.test', sessionVersion: 0 },
      env.JWT_SECRET,
      {
        algorithm: 'HS256',
        issuer: 'ftdcare-api',
        audience: 'ftdcare-web',
        expiresIn: '5m',
      },
    );
    return {
      authorization: 'Bearer ' + token,
      origin: 'http://localhost:5173',
    };
  }
  staffHeaders = headers(staffId);
  careHeaders = headers(careId);
  pdf = await fs.readFile(
    new URL(
      '../../public/resources/Managing-Aggressive-Behavior.pdf',
      import.meta.url,
    ),
  );
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.closeIdleConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.query(
    'DELETE FROM guide_uploads WHERE uploaded_by=ANY($1::text[])',
    [[staffId, careId]],
  );
  await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [
    [staffId, careId],
  ]);
  await pool.end();
  await fs.rm(directory, { recursive: true, force: true });
});
function form(data: Uint8Array = pdf, name = 'guide.pdf') {
  const body = new FormData();
  body.append(
    'file',
    new Blob([new Uint8Array(data)], { type: 'application/pdf' }),
    name,
  );
  return body;
}
async function upload(
  body: BodyInit,
  headers: Record<string, string> = staffHeaders,
) {
  const response = await fetch(base + '/api/v1/chatbot/extract-pdf', {
    method: 'POST',
    headers,
    body,
  });
  return { status: response.status, body: await response.json() };
}
test('staff multipart PDF upload extracts text, registers its owner and protects the stored file', async () => {
  assert.ok(pdf.length > 131072);
  const result = await upload(form());
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.pageCount, 2);
  assert.ok(result.body.wordCount > 900);
  assert.match(
    result.body.pdfUrl,
    /^\/uploads\/guides\/guide_[a-f0-9-]+\.pdf$/,
  );
  const registered = await pool.query(
    'SELECT uploaded_by FROM guide_uploads WHERE storage_name=$1',
    [path.basename(result.body.pdfUrl)],
  );
  assert.equal(registered.rows[0].uploaded_by, staffId);
  const read = await fetch(base + result.body.pdfUrl, {
    headers: staffHeaders,
  });
  assert.equal(read.status, 200);
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), pdf);
  assert.equal((await fetch(base + result.body.pdfUrl)).status, 401);
});
test('guide saves reuse owned PDF text and metadata updates preserve its pages', async () => {
  const uploaded = await upload(form());
  const input = {
    title: 'Multipart stored PDF',
    description: 'A practical guide to supporting familiar daily routines.',
    condition: 'FTD',
    fileName: 'guide.pdf',
    pdfUrl: uploaded.body.pdfUrl,
  };
  const post = (body: object) =>
    fetch(base + '/api/v1/chatbot/guides', {
      method: 'POST',
      headers: { ...staffHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  for (const description of [undefined, 'x'.repeat(19), 'x'.repeat(241)]) {
    assert.equal((await post({ ...input, description })).status, 400);
  }
  const saved = await post(input);
  assert.equal(saved.status, 201);
  const guide = await saved.json();
  assert.equal(guide.content, uploaded.body.text);
  assert.deepEqual(guide.pages, uploaded.body.pages);
  const updated = await fetch(base + '/api/v1/chatbot/guides/' + guide.id, {
    method: 'PUT',
    headers: { ...staffHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Updated multipart title',
      pdfUrl: input.pdfUrl,
      status: 'APPROVED',
    }),
  });
  assert.equal(updated.status, 200);
  const result = await updated.json();
  assert.equal(result.guide.content, guide.content);
  assert.deepEqual(result.guide.pages, guide.pages);
  const chunks = await pool.query(
    'SELECT COUNT(*)::int AS count FROM guide_chunks WHERE guide_id=$1',
    [guide.id],
  );
  assert.ok(chunks.rows[0].count > 0);
  assert.equal(
    (await post({ ...input, pdfUrl: '/uploads/guides/guide_missing.pdf' }))
      .status,
    403,
  );
  assert.equal(
    (await post({ ...input, pdfUrl: 'https://example.test/guide.pdf' })).status,
    400,
  );
  assert.equal(
    (
      await post({
        title: 'Missing content',
        condition: 'FTD',
        fileName: 'test.txt',
      })
    ).status,
    400,
  );
  const replacementPdf = await upload(form(pdf, 'replacement.pdf'));
  const replaced = await fetch(base + '/api/v1/chatbot/guides/' + guide.id, {
    method: 'PUT',
    headers: { ...staffHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ pdfUrl: replacementPdf.body.pdfUrl }),
  });
  assert.equal(replaced.status, 200);
  assert.equal(
    (await replaced.json()).guide.pdfUrl,
    replacementPdf.body.pdfUrl,
  );
  const foreign = await upload(form());
  await pool.query(
    'UPDATE guide_uploads SET uploaded_by=$1 WHERE storage_name=$2',
    [careId, path.basename(foreign.body.pdfUrl)],
  );
  assert.equal(
    (await post({ ...input, pdfUrl: foreign.body.pdfUrl })).status,
    403,
  );
  const expired = await upload(form());
  await fs.unlink(path.join(directory, path.basename(expired.body.pdfUrl)));
  const expiredSave = await post({ ...input, pdfUrl: expired.body.pdfUrl });
  assert.equal(expiredSave.status, 400);
  assert.match((await expiredSave.json()).error, /expired/);
  await pool.query('DELETE FROM chatbot_guides WHERE id=$1', [guide.id]);
});
test('moderator API responses omit extraction diagnostics while admins retain them', async () => {
  const version = (
    await pool.query('SELECT session_version FROM users WHERE id=$1', [
      'user-clinician-1',
    ])
  ).rows[0].session_version;
  const token = jwt.sign(
    {
      id: 'user-clinician-1',
      email: 'staff@example.test',
      sessionVersion: version,
    },
    (await import('../src/config/env.js')).env.JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'ftdcare-api',
      audience: 'ftdcare-web',
      expiresIn: '5m',
    },
  );
  const headers = {
    authorization: 'Bearer ' + token,
    origin: 'http://localhost:5173',
  };
  const result = await upload(form(), headers);
  assert.equal(result.status, 200);
  assert.equal(result.body.hasReadableText, true);
  for (const field of [
    'pages',
    'wordCount',
    'pageCount',
    'totalChunks',
    'text',
  ])
    assert.equal(field in result.body, false, field);
  const list = await fetch(base + '/api/v1/chatbot/guides', { headers });
  const guides = await list.json();
  for (const guide of guides.guides)
    for (const field of ['pages', 'totalChunks', 'wordCount'])
      assert.equal(field in guide, false, field);
  for (const auth of [headers, careHeaders]) {
    const response = await fetch(base + '/api/v1/knowledge/chat', {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'behavior' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal('retrievedChunks' in body, false);
    assert.ok(Array.isArray(body.citedResources));
  }
  const admin = await fetch(base + '/api/v1/knowledge/chat', {
    method: 'POST',
    headers: { ...staffHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'behavior' }),
  });
  assert.ok('retrievedChunks' in (await admin.json()));
  await pool.query('DELETE FROM guide_uploads WHERE storage_name=$1', [
    path.basename(result.body.pdfUrl),
  ]);
});
test('multipart validation rejects missing/wrong/additional file parts, text fields, fake PDFs and malformed boundaries', async () => {
  const count = (await fs.readdir(directory)).length;
  const empty = new FormData();
  assert.equal((await upload(empty)).status, 400);
  assert.equal((await upload(form(pdf, 'guide.txt'))).status, 400);
  assert.equal(
    (await upload(form(Buffer.from('not a PDF document')))).status,
    400,
  );
  assert.equal(
    (await upload(form(Buffer.from('%PDF-1.7\nInvalid PDF structure')))).status,
    400,
  );
  const wrong = new FormData();
  wrong.append('attachment', new Blob([new Uint8Array(pdf)]), 'guide.pdf');
  assert.equal((await upload(wrong)).status, 400);
  const multiple = form();
  multiple.append('file', new Blob([new Uint8Array(pdf)]), 'another.pdf');
  assert.equal((await upload(multiple)).status, 400);
  const fields = form();
  fields.append('extra', 'not allowed');
  assert.equal((await upload(fields)).status, 400);
  assert.equal(
    (
      await upload('broken', {
        ...staffHeaders,
        'content-type': 'multipart/form-data',
      })
    ).status,
    400,
  );
  const truncated =
    '--broken\r\nContent-Disposition: form-data; name="file"; filename="guide.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.7';
  assert.equal(
    (
      await upload(truncated, {
        ...staffHeaders,
        'content-type': 'multipart/form-data; boundary=broken',
      })
    ).status,
    400,
  );
  assert.equal((await fs.readdir(directory)).length, count);
});
test('oversized files return 413 without storing files; old JSON clients receive a refresh instruction', async () => {
  const count = (await fs.readdir(directory)).length;
  const oversized = await upload(form(Buffer.alloc(MAX_BYTES + 1, 32)));
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.error, 'PDF exceeds 12 MB limit');
  assert.ok(oversized.body.requestId);
  const old = await upload(
    JSON.stringify({ fileName: 'guide.pdf', fileBase64: 'old-client' }),
    { ...staffHeaders, 'content-type': 'application/json' },
  );
  assert.equal(old.status, 415);
  assert.match(old.body.error, /Refresh the page/);
  assert.equal((await fs.readdir(directory)).length, count);
});
test('anonymous and care-partner requests are rejected before waiting for a declared large multipart body', async () => {
  for (const [headers, status] of [
    [{}, 401],
    [careHeaders, 403],
  ] as const) {
    const received = await new Promise<number>((resolve, reject) => {
      const req = http.request(
        base + '/api/v1/chatbot/extract-pdf',
        {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'multipart/form-data; boundary=unused',
            'content-length': String(MAX_BYTES + 1000),
          },
        },
        (res) => {
          resolve(res.statusCode!);
          res.resume();
          req.destroy();
        },
      );
      req.setTimeout(4000, () => {
        req.destroy();
        reject(new Error('Server waited for unauthenticated upload body'));
      });
      req.on('error', (error) => {
        if (error.message !== 'socket hang up') reject(error);
      });
      req.flushHeaders();
    });
    assert.equal(received, status);
  }
});
test('concurrent uploads with identical filenames get different protected URLs', async () => {
  const [first, second] = await Promise.all([upload(form()), upload(form())]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.notEqual(first.body.pdfUrl, second.body.pdfUrl);
});

test('a valid PDF with no readable text is rejected before it is stored', async () => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
  ];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(data));
    data += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const start = Buffer.byteLength(data);
  data += `xref\n0 4\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, '0') + ' 00000 n ')
    .join(
      '\n',
    )}\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  const count = (await fs.readdir(directory)).length;
  const response = await upload(form(Buffer.from(data), 'blank.pdf'));
  assert.equal(response.status, 400);
  assert.match(response.body.error, /couldn’t find readable text/);
  assert.equal((await fs.readdir(directory)).length, count);
});
