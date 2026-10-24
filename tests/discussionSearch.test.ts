import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findDiscussionAnswers } from '../server/discussionSearch.ts';
const user = { id: 'care-1', role: 'CARE_PARTNER', condition: 'FTD' as const };
const post = { id: 'post-1', title: 'Night waking strategies', authorId: 'other',
  status: 'APPROVED', assignedGroupIds: ['general'], condition: 'FTD' as const };
const reply = { id: 'reply-1', postId: post.id, status: 'APPROVED',
  rawContent: 'Sleep routines can help with sleep issues.' };

test('returns accessible answered discussions even when the title does not repeat the query', async () => {
  const results = await findDiscussionAnswers('sleep issues', [post], [reply], user, ['general']);
  assert.deepEqual(results, [{ id: post.id, title: post.title, url: '/?tab=feed&post=post-1', replyCount: 1 }]);
  assert.equal('content' in results[0], false);
});

test('unanswered or unapproved replies never qualify as answers', async () => {
  for (const replies of [[], [{ ...reply, status: 'PENDING_MODERATION' }], [{ ...reply, status: 'REJECTED' }]]) {
    assert.deepEqual(await findDiscussionAnswers('sleep issues', [post], replies, user, ['general']), []);
  }
});

test('enforces condition, regional visibility, and post approval before matching', async () => {
  for (const hidden of [
    { ...post, condition: 'AD' as const },
    { ...post, assignedGroupIds: ['private-region'] },
    { ...post, status: 'PENDING_MODERATION' },
    { ...post, status: 'REJECTED' },
  ]) {
    assert.deepEqual(await findDiscussionAnswers('sleep issues', [hidden], [reply], user, ['general']), []);
  }
  assert.deepEqual(await findDiscussionAnswers('sleep issues', [post], [reply], undefined, ['general']), []);
});

test('sanitized text controls matching and unrelated specifics are rejected', async () => {
  assert.deepEqual(await findDiscussionAnswers('sleep issues', [post], [
    { ...reply, sanitizedContent: 'This response was removed.' },
  ], user, ['general']), []);
  assert.deepEqual(await findDiscussionAnswers('sleep issues with CPAP calibration', [post], [reply], user, ['general']), []);
});

test('deduplicates multiple matching replies and counts only approved replies', async () => {
  const results = await findDiscussionAnswers('sleep issues', [post], [
    reply, { ...reply, id: 'reply-2' }, { ...reply, id: 'reply-3', status: 'REJECTED' },
  ], user, ['general']);
  assert.equal(results.length, 1);
  assert.equal(results[0].replyCount, 2);
});
