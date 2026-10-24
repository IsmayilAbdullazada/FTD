export function isVisibleReplyParent(
  parent: { postId: string; authorId: string; status: string } | undefined,
  postId: string, userId: string, isStaff: boolean
): boolean {
  return !!parent && parent.postId === postId && parent.status !== 'REJECTED' &&
    (parent.status === 'APPROVED' || parent.authorId === userId || isStaff);
}
