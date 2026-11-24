import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/db.js';
const ids = [
  'resource-aftd-compulsive-behaviors',
  'resource-aftd-driving-decision',
  'resource-aftd-driving-tips',
  'resource-aftd-roaming-spring-2013',
  'resource-aftd-grief-journey',
  'resource-aftd-grief-booklet',
  'resource-yes-young-onset',
  'resource-alz-association',
];
after(() => pool.end());
test('catalog upgrade is idempotent, preserves staff edits and source duplicates, and sets source topics and audiences', async () => {
  const sql = await readFile(
    new URL(
      '../src/db/migrations/015_guide_topics_and_resources.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const audienceSql = await readFile(
    new URL(
      '../src/db/migrations/016_ad_resource_audiences.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM resources WHERE id=ANY($1::text[])', [ids]);
    const existingId = 'custom-' + randomUUID();
    await client.query(
      "INSERT INTO resources(id,title,summary,content_body,disease_domain,category,external_url) VALUES($1,'Staff edited title','Keep this summary','Keep this content','FTD','SAFETY_WANDERING','https://www.theaftd.org/help-and-hope/hs-driving-and-ftd/')",
      [existingId],
    );
    const legacy = 'legacy-' + randomUUID();
    await client.query(
      "INSERT INTO resources(id,title,summary,content_body,disease_domain,category) VALUES($1,'Original title','Original summary','Original content','FTD','INCONTINENCE')",
      [legacy],
    );
    await client.query(sql);
    const manualId = 'manual-yes-' + randomUUID();
    await client.query(
      "INSERT INTO resources(id,title,summary,content_body,disease_domain,category,external_url) VALUES($1,'Staff source title','Preserved summary','Preserved content','BOTH','CARE_PARTNER_SUPPORT','https://yessupport.org/')",
      [manualId],
    );
    await client.query(audienceSql);
    await client.query(sql);
    await client.query(audienceSql);
    const manual = (
      await client.query('SELECT * FROM resources WHERE id=$1', [manualId])
    ).rows[0];
    assert.equal(manual.disease_domain, 'AD');
    assert.equal(manual.title, 'Staff source title');
    assert.equal(manual.summary, 'Preserved summary');
    const rows = (
      await client.query('SELECT * FROM resources WHERE id=ANY($1::text[])', [
        ids,
      ])
    ).rows;
    assert.equal(
      rows.length,
      7,
      'an existing source must not produce a duplicate card',
    );
    for (const row of rows)
      assert.equal(
        row.disease_domain,
        row.id === 'resource-yes-young-onset' ||
          row.id === 'resource-alz-association'
          ? 'AD'
          : 'FTD',
      );
    const pdfs = rows.filter((row) => row.file_attachment_url);
    assert.equal(pdfs.length, 2);
    for (const pdf of pdfs) {
      assert.match(pdf.file_attachment_url, /^\/resources\/.+\.pdf$/);
      assert.equal(pdf.external_url, null);
      assert.equal(pdf.additional_links.length, 1);
      assert.match(
        pdf.additional_links[0].url,
        /^https:\/\/www.theaftd.org\/.+\.pdf$/,
      );
    }
    assert.equal(
      rows.find((row) => row.id === 'resource-aftd-grief-booklet')?.category,
      'GRIEF_LOSS',
    );
    assert.equal(
      rows.find((row) => row.id === 'resource-aftd-roaming-spring-2013')
        ?.category,
      'SAFETY_WANDERING',
    );
    const retained = (
      await client.query('SELECT * FROM resources WHERE id=$1', [existingId])
    ).rows[0];
    assert.equal(retained.title, 'Staff edited title');
    assert.equal(retained.summary, 'Keep this summary');
    const normalized = (
      await client.query('SELECT * FROM resources WHERE id=$1', [legacy])
    ).rows[0];
    assert.equal(normalized.category, 'DAILY_CARE');
    assert.equal(normalized.title, 'Original title');
    assert.equal(normalized.content_body, 'Original content');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
