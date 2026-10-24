// Run against a local development server: node_modules/.bin/tsx tests/moderationReplies.integration.ts
import assert from 'node:assert/strict';
const base = process.env.FTD_TEST_BASE_URL || 'http://127.0.0.1:3000';
const ids: string[] = [];
const request = async (path: string, data?: unknown, method = 'POST') => {
  const response = await fetch(base + path, data === undefined ? undefined : {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return { status: response.status, data: await response.json() };
};
const path = '/api/v1/posts/post-1/comments';
try {
  const before = (await request('/api/v1/posts/post-1?userId=user-care-1')).data;
  const make = async (content: string, parentCommentId?: string) => {
    const result = await request(path, { content, authorId: 'user-care-1', parentCommentId });
    assert.equal(result.status, 201); ids.push(result.data.comment.id);
    assert.equal(result.data.comment.status, 'PENDING_MODERATION');
    return result.data.comment.id as string;
  };
  const root = await make('Integration: pending top-level reply');
  const nested = await make('Integration: pending nested reply', root);
  const rejected = await make('Integration: reject this reply');
  let queue = (await request('/api/v1/moderation/queue')).data;
  assert.equal(queue.totalPending, queue.items.length);
  for (const id of ids) assert.equal(queue.items.find((i: any) => i.id === id)?.type, 'COMMENT');
  const item = queue.items.find((i: any) => i.id === nested);
  assert.equal(item.postId, 'post-1'); assert.equal(item.parentCommentId, root);
  assert.equal(item.parentContent, 'Integration: pending top-level reply');
  assert.ok(item.postContent);
  assert.equal((await request('/api/v1/moderation/action', {
    entityType: 'COMMENT', entityId: nested, action: 'APPROVE', sanitizedContent: ' ',
  })).status, 400);
  for (const id of [root, nested]) {
    const result = await request('/api/v1/moderation/action', {
      entityType: 'COMMENT', entityId: id, action: 'APPROVE', sanitizedContent: 'Reviewed public reply',
    });
    assert.equal(result.status, 200); assert.equal(result.data.newEntityStatus, 'APPROVED');
  }
  const rejection = await request('/api/v1/moderation/action', {
    entityType: 'COMMENT', entityId: rejected, action: 'REJECT', rejectionMessage: 'Moderator feedback',
  });
  assert.equal(rejection.data.newEntityStatus, 'REJECTED');
  assert.equal((await request('/api/v1/moderation/action', {
    entityType: 'COMMENT', entityId: root, action: 'APPROVE',
  })).status, 409);
  queue = (await request('/api/v1/moderation/queue')).data;
  assert.ok(ids.every(id => !queue.items.some((i: any) => i.id === id)));
  const after = (await request('/api/v1/posts/post-1?userId=user-care-1')).data;
  assert.equal(after.post.commentCount, before.post.commentCount + 2);
  assert.equal(after.comments.find((c: any) => c.id === nested).parentCommentId, root);
  assert.equal(after.comments.find((c: any) => c.id === nested).content, 'Reviewed public reply');
  assert.equal(after.post.status, before.post.status);
  console.log('Reply moderation integration passed: queue, thread context, approval, rejection, redaction, counts, duplicate handling, and thread position.');
} finally {
  for (const id of ids) await request(`${path}/${id}`, {}, 'DELETE');
}
