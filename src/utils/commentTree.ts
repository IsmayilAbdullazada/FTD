import type { Comment } from '../types';
export interface CommentNode { comment: Comment; children: CommentNode[]; unavailableParent: boolean }

/** Preserve server order; unavailable parents and malformed cycles must not hide replies. */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [], unavailableParent: false } as CommentNode]));
  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.comment.parentCommentId || '');
    let ancestor = parent;
    const seen = new Set([node.comment.id]);
    while (ancestor && !seen.has(ancestor.comment.id)) {
      seen.add(ancestor.comment.id);
      ancestor = nodes.get(ancestor.comment.parentCommentId || '');
    }
    if (!parent || ancestor) {
      node.unavailableParent = !!node.comment.parentCommentId;
      roots.push(node);
    } else parent.children.push(node);
  }
  return roots;
}
