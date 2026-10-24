import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCommentTree } from '../src/utils/commentTree.ts';
import { isVisibleReplyParent } from '../server/replyParent.ts';
import type { Comment } from '../src/types';
const comment = (id: string, parentCommentId?: string) => ({ id, parentCommentId,
  content: id, author: { anonymousHandle: id }, createdAt: '2026-01-01',
}) as Comment;

test('builds arbitrary depth and preserves sibling order even if children arrive first', () => {
  const tree = buildCommentTree([comment('child', 'root'), comment('root'), comment('grandchild', 'child'), comment('sibling', 'root'), comment('other')]);
  assert.deepEqual(tree.map(n => n.comment.id), ['root', 'other']);
  assert.deepEqual(tree[0].children.map(n => n.comment.id), ['child', 'sibling']);
  assert.equal(tree[0].children[0].children[0].comment.id, 'grandchild');
});

test('removal or hidden parent does not discard surviving descendants or reveal parent content', () => {
  const tree = buildCommentTree([comment('child', 'missing'), comment('grandchild', 'child')]);
  assert.equal(tree[0].unavailableParent, true);
  assert.equal(tree[0].children[0].comment.id, 'grandchild');
});

test('self references and cycles cannot hide replies or cause infinite recursion', () => {
  const tree = buildCommentTree([comment('a', 'b'), comment('b', 'a'), comment('self', 'self')]);
  assert.equal(tree.length, 3);
});

test('parent validation enforces same discussion, visibility, and moderation', () => {
  const parent = { postId: 'post', authorId: 'author', status: 'APPROVED' };
  assert.equal(isVisibleReplyParent(parent, 'post', 'other', false), true);
  assert.equal(isVisibleReplyParent(parent, 'different-post', 'author', true), false);
  assert.equal(isVisibleReplyParent(undefined, 'post', 'author', true), false);
  assert.equal(isVisibleReplyParent({ ...parent, status: 'REJECTED' }, 'post', 'author', true), false);
  const pending = { ...parent, status: 'PENDING_MODERATION' };
  assert.equal(isVisibleReplyParent(pending, 'post', 'other', false), false);
  assert.equal(isVisibleReplyParent(pending, 'post', 'author', false), true);
  assert.equal(isVisibleReplyParent(pending, 'post', 'other', true), true);
});
