import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerRagQuery } from '../server/rag.ts';

// Regression checks against the repository's actual guide corpus, read-only.
for (const query of [
  'Where to go for local elder care attorney?',
  'sleep issues after installing a cochlear implant',
  'sleep routines for a blind person using a CPAP machine',
  'What are the Maryland Medicaid eligibility limits for sleep respite care?',
]) {
  test(`offline retrieval abstains on unsupported specifics: ${query}`, async () => {
    const result = await answerRagQuery(query, [], null, 'FTD');
    assert.deepEqual(result.citedResources, []);
    assert.deepEqual(result.discussionDraft, { title: '', content: query });
  });
}

for (const query of [
  'sleep issues',
  'Why is my husband waking at night?',
  'What can I do about bathing resistance?',
]) {
  test(`offline retrieval retains a relevant general caregiving match: ${query}`, async () => {
    const result = await answerRagQuery(query, [], null, 'FTD');
    assert.ok(result.citedResources.length > 0);
    assert.equal(result.answer, '');
    assert.deepEqual(result.discussionDraft, { title: '', content: query });
  });
}
