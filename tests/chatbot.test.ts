import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, after } from 'node:test';
import type { GoogleGenAI } from '@google/genai';
import type { RagChunk } from '../server/rag.ts';

// Import the retrieval module against an isolated index, never the real guide database.
const originalCwd = process.cwd();
const fixtureDir = mkdtempSync(path.join(tmpdir(), 'ftd-chatbot-'));
mkdirSync(path.join(fixtureDir, 'data'));
const chunk: RagChunk = {
  id: 'ftd-p3', guideId: 'ftd', condition: 'FTD', title: 'Sleep routines',
  fileName: 'sleep guide.pdf', page: 3,
  content: 'Sleep routines improve sleep. Sleep routines and rest.', embedding: [1, 0],
};
writeFileSync(path.join(fixtureDir, 'data/rag_chunks.json'), JSON.stringify([
  chunk, { ...chunk, id: 'duplicate', page: 3 },
  { ...chunk, id: 'ad', guideId: 'ad', condition: 'AD' },
  { ...chunk, id: 'unapproved', guideId: 'unapproved' },
]));
process.chdir(fixtureDir);
const { answerRagQuery, createDiscussionDraft, calculateLexicalScore, verifyRelevantChunks, cosineSimilarity } = await import('../server/rag.ts');
process.chdir(originalCwd);
after(() => rmSync(fixtureDir, { recursive: true, force: true }));

const client = (generateContent: (...args: any[]) => any) => ({
  models: { generateContent, embedContent: async () => ({ embeddings: [] }) },
}) as unknown as GoogleGenAI;

test('matched queries return deduplicated, approved guide pages and a discussion draft without answer generation', async () => {
  const ai = client(() => { throw new Error('Classifier and draft failure should use offline fallback'); });
  const result = await answerRagQuery('sleep routines', [], ai, 'FTD', [
    { id: 'ftd', pdfUrl: '/uploads/guides/sleep.pdf' }, { id: 'ad' },
  ]);
  assert.equal(result.answer, '');
  assert.deepEqual(result.discussionDraft, { title: '', content: 'sleep routines' });
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


test('exact word matching does not confuse substrings or reward repeated words', () => {
  assert.equal(calculateLexicalScore('sleep', { ...chunk, content: 'A sleepy patient is asleep.' }), 0);
  assert.ok(calculateLexicalScore('sleep with CPAP', chunk) < 0.58);
  assert.ok(calculateLexicalScore('sleep 50 mg', chunk) < 0.58);
});

test('mismatched embedding dimensions cannot produce a semantic match', () => {
  assert.equal(cosineSimilarity([1, 0], [1]), 0);
});

test('relevance classifier rejects a high-similarity page that does not answer the specifics', async () => {
  const result = await verifyRelevantChunks('sleep with CPAP', [{ chunk, score: 0.99 }], client(async (request) => {
    assert.match(request.config.systemInstruction, /Do not answer the question/);
    assert.equal(JSON.parse(request.contents).question, 'sleep with CPAP');
    return { text: '{"matches":[]}' };
  }));
  assert.deepEqual(result, []);
});

test('semantic selection requires a known ID and exact supporting evidence', async () => {
  const candidates = [{ chunk, score: 0.9 }];
  for (const match of [
    { id: 'invented', evidence: chunk.content },
    { id: chunk.id, evidence: 'Invented evidence not in the guide.' },
    { id: chunk.id, evidence: 'Sleep' },
  ]) {
    assert.deepEqual(await verifyRelevantChunks('sleep', candidates, client(async () => ({
      text: JSON.stringify({ matches: [match] }),
    }))), []);
  }
  assert.deepEqual(await verifyRelevantChunks('sleep', candidates, client(async () => ({
    text: JSON.stringify({ matches: [{ id: chunk.id, evidence: 'Sleep routines improve sleep.' }] }),
  }))), candidates);
});

test('a working classifier can recognize paraphrases without generating an answer', async () => {
  const candidates = [{ chunk, score: 0.8 }];
  const result = await verifyRelevantChunks('resting habits', candidates, client(async () => ({
    text: JSON.stringify({ matches: [{ id: chunk.id, evidence: 'Sleep routines improve sleep.' }] }),
  })));
  assert.equal(result.length, 1);
});

for (const [name, generate] of [
  ['unavailable classifier', async () => { throw new Error('Offline'); }],
  ['malformed classification', async () => ({ text: '{}' })],
] as const) {
  test(`${name} rejects unsupported details while retaining straightforward matches`, async () => {
    const candidates = [{ chunk, score: 0.99 }];
    assert.deepEqual(await verifyRelevantChunks('sleep with CPAP', candidates, client(generate)), []);
    assert.equal((await verifyRelevantChunks('sleep routines', candidates, client(generate))).length, 1);
  });
}


test('a high vector similarity cannot bypass the answerability check', async () => {
  let classified = false;
  const query = 'CPAP calibration';
  const ai = {
    models: {
      embedContent: async () => ({ embeddings: [{ values: [1, 0] }] }),
      generateContent: async (request: any) => {
        if (request.config.systemInstruction.startsWith('Select only guide excerpts')) {
          classified = true;
          return { text: '{"matches":[]}' };
        }
        return { text: JSON.stringify({ title: 'CPAP calibration question', content: query }) };
      },
    },
  } as unknown as GoogleGenAI;
  const result = await answerRagQuery(query, [], ai, 'FTD', [{ id: 'ftd' }]);
  assert.equal(classified, true);
  assert.deepEqual(result.citedResources, []);
  assert.equal(result.discussionDraft?.content, query);
});
