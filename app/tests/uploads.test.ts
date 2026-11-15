import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanupUploads } from '../src/services/uploads.js';
import { pool } from '../src/config/db.js';
test('aged orphan PDFs are removed while referenced uploads are preserved', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-upload-'));
  const id = randomUUID();
  const name = `guide_${id}.pdf`;
  const file = path.join(dir, name);
  try {
    await fs.writeFile(file, '%PDF-test');
    await fs.utimes(file, new Date(0), new Date(0));
    await pool.query(
      "INSERT INTO resources(id,title,summary,content_body,category,file_attachment_url) VALUES($1,'Fixture','Fixture','Fixture','GENERAL_EDUCATION',$2)",
      [id, '/uploads/guides/' + name],
    );
    await cleanupUploads(dir);
    await fs.access(file);
    await pool.query('DELETE FROM resources WHERE id=$1', [id]);
    await cleanupUploads(dir);
    await assert.rejects(fs.access(file));
  } finally {
    await pool.query('DELETE FROM resources WHERE id=$1', [id]);
    await fs.rm(dir, { recursive: true, force: true });
    await pool.end();
  }
});
