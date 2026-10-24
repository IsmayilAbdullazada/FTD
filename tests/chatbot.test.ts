import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, after } from 'node:test';
import type { GoogleGenAI } from '@google/genai';

// Import the retrieval module against an isolated index, never the real guide database.
const originalCwd = process.cwd();
const fixtureDir = mkdtempSync(path.join(tmpdir(), 'ftd-chatbot-'));
mkdirSync(path.join(fixtureDir, 'data'));
const chunk = {
  id: 'ftd-p3', guideId: 'ftd', condition: 'FTD', title: 'Sleep routines',
  fileName: 'sleep guide.pdf', page: 3,
  content: 'Sleep routines improve sleep. Sleep routines and rest.', embedding: [],
};
writeFileSync(path.join(fixtureDir, 'data/rag_chunks.json'), JSON.stringify([
  chunk, { ...chunk, id: 'duplicate', page: 3 },
  { ...chunk, id: 'ad', guideId: 'ad', condition: 'AD' },
  { ...chunk, id: 'unapproved', guideId: 'unapproved' },
]));
process.chdir(fixtureDir);
const { answerRagQuery, createDiscussionDraft } = await import('../server/rag.ts');
process.chdir(originalCwd);
after(() => rmSync(fixtureDir, { recursive: true, force: true }));

const client = (generateContent: (...args: any[]) => any) => ({
  models: { generateContent, embedContent: async () => ({ embeddings: [] }) },
}) as unknown as GoogleGenAI;

test('matched queries return deduplicated, approved guide pages without answer generation', async () => {
  const ai = client(() => { throw new Error('Guide answers must never be generated'); });
  const result = await answerRagQuery('sleep routines', [], ai, 'FTD', [
    { id: 'ftd', pdfUrl: '/uploads/guides/sleep.pdf' }, { id: 'ad' },
  ]);
  assert.equal(result.answer, '');
  assert.equal(result.discussionDraft, undefined);
  assert.equal(result.citedResources.length, 1);
  assert.equal(result.citedResources[0].url, '/uploads/guides/sleep.pdf#page=3');
  assert.equal(result.matchedGuide?.id, 'ftd');
  assert.equal(result.isUploadedGuideSourced, true);
});

test('unmatched queries preserve the exact request and empty title when offline', async () => {
  const query = 'Can anyone recommend a wheelchair van?';
  const result = await answerRagQuery(query, [], null, 'FTD');
  assert.deepEqual(result.discussionDraft, { title: '', content: query });
  assert.deepEqual(result.citedResources, []);
  assert.doesNotMatch(result.answer, /410|clinic|911|call/i);
});

test('an index containing only unapproved guides offers discussion creation', async () => {
  const result = await answerRagQuery('sleep routines', [], null, 'FTD', []);
  assert.equal(result.isUploadedGuideSourced, false);
  assert.ok(result.discussionDraft);
});

test('unmatched queries use the LLM only to prepare a reviewable discussion draft', async () => {
  let calls = 0;
  const result = await answerRagQuery('wheelchair van', [], client(async (request) => {
    calls++;
    assert.match(request.config.systemInstruction, /Do not answer the question/);
    assert.deepEqual(JSON.parse(request.contents), { request: 'wheelchair van' });
    return { text: JSON.stringify({ title: 'Wheelchair van recommendations', content: 'Does anyone have recommendations for a wheelchair van?' }) };
  }), 'FTD');
  assert.equal(calls, 1);
  assert.equal(result.discussionDraft?.title, 'Wheelchair van recommendations');
  assert.equal(result.discussionDraft?.content, 'Does anyone have recommendations for a wheelchair van?');
  assert.deepEqual(result.citedResources, []);
});

for (const [name, generate] of [
  ['unavailable LLM', async () => { throw new Error('Unavailable'); }],
  ['invalid JSON', async () => ({ text: 'not JSON' })],
  ['missing content', async () => ({ text: '{"title":"headline"}' })],
  ['empty content', async () => ({ text: '{"title":"headline","content":" "}' })],
] as const) {
  test(`${name} falls back to the original query and an empty headline`, async () => {
    assert.deepEqual(await createDiscussionDraft('My original request', client(generate)), {
      title: '', content: 'My original request',
    });
  });
}
