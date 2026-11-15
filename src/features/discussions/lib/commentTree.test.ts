import { expect, test } from 'vitest';
import { buildCommentTree } from './commentTree';
import type { Comment } from '@/types';
const comment = (id: string, parentCommentId?: string) =>
  ({ id, parentCommentId }) as Comment;
test('replies stay visible when their parent is unavailable or cyclic', () => {
  const roots = buildCommentTree([
    comment('child', 'missing'),
    comment('a', 'b'),
    comment('b', 'a'),
  ]);
  expect(roots.map((node) => node.comment.id)).toContain('child');
  expect(
    roots.find((node) => node.comment.id === 'child')?.unavailableParent,
  ).toBe(true);
  expect(roots.length).toBeGreaterThan(1);
});
