import type { Post } from '@/types';

export type DiscussionPolicyFilter =
  | 'all'
  | 'moderated'
  | 'unmoderated'
  | 'closed';

export function filterDiscussions(
  posts: Post[],
  policyFilter: DiscussionPolicyFilter,
  searchQuery: string,
) {
  const query = searchQuery.trim().toLowerCase();
  return posts.filter((post) => {
    if (
      policyFilter === 'moderated' &&
      (post.allowUnmoderatedReplies || post.isClosed)
    ) return false;
    if (
      policyFilter === 'unmoderated' &&
      (!post.allowUnmoderatedReplies || post.isClosed)
    ) return false;
    if (policyFilter === 'closed' && !post.isClosed) return false;
    return !query || (
      post.title.toLowerCase().includes(query) ||
      post.content.toLowerCase().includes(query) ||
      post.author.anonymousHandle.toLowerCase().includes(query)
    );
  });
}

export function updatePostReplyPolicy(
  posts: Post[],
  postId: string,
  allowUnmoderatedReplies: boolean,
) {
  return posts.map((post) =>
    post.id === postId ? { ...post, allowUnmoderatedReplies } : post
  );
}

export function replacePost(posts: Post[], replacement: Post) {
  return posts.map((post) => post.id === replacement.id ? replacement : post);
}
