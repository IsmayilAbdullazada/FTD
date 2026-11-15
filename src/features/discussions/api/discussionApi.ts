import { safeFetchJson } from '@/shared/api/httpClient';

import { Audience, Comment, Post } from '@/types';

export const discussionApi = {
  // Posts Feed
  getPosts: async (options: {
    groupId?: string;
    status?: string;
    condition?: string;
    page?: number;
    pageSize?: number;
    search?: string;
    section?: string;
    policy?: string;
    closed?: string;
  }): Promise<{ total: number; posts: Post[] }> => {
    const params = new URLSearchParams();
    if (options.groupId) params.set('groupId', options.groupId);
    if (options.status) params.set('status', options.status);
    if (options.condition) params.set('condition', options.condition);

    params.set('page', String(options.page ?? 1));
    params.set('pageSize', String(options.pageSize ?? 10));
    for (const key of ['search', 'section', 'policy', 'closed'] as const)
      if (options[key]) params.set(key, options[key]);
    return safeFetchJson(`/api/v1/posts?${params}`, undefined);
  },

  getPostDetails: async (
    postId: string,
  ): Promise<{ post: Post; comments: Comment[] }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}`,
      undefined,
    );
  },

  createPost: async (payload: {
    title: string;
    content: string;
    targetCohortId?: string;
    condition?: Audience;
  }): Promise<{
    postId: string;
    status: string;
    message: string;
    hasPhiAlerts: boolean;
    phiAlertsCount: number;
  }> => {
    return safeFetchJson('/api/v1/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  addComment: async (
    postId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<{ comment: Comment; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentCommentId }),
      },
    );
  },

  closePost: async (
    postId: string,
    isClosed: boolean,
  ): Promise<{ post: Post; isClosed: boolean; message: string }> => {
    return safeFetchJson(`/api/v1/posts/${encodeURIComponent(postId)}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isClosed }),
    });
  },

  togglePostUnmoderatedReplies: async (
    postId: string,
    allowUnmoderated: boolean,
  ): Promise<{ post: Post; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}/unmoderated-replies`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowUnmoderatedReplies: allowUnmoderated }),
      },
    );
  },

  togglePostUpvote: async (
    postId: string,
  ): Promise<{ success: boolean; upvotes: number; isUpvoted: boolean }> => {
    return safeFetchJson(`/api/v1/posts/${encodeURIComponent(postId)}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  },

  updatePost: async (
    postId: string,
    payload: { title?: string; content?: string; targetCohortId?: string },
  ): Promise<{ post: Post; message: string }> => {
    return safeFetchJson(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  deletePost: async (
    postId: string,
  ): Promise<{ success: boolean; message: string }> => {
    return safeFetchJson(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
  },

  updateComment: async (
    postId: string,
    commentId: string,
    content: string,
  ): Promise<{ comment: Comment; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      },
    );
  },

  deleteComment: async (
    postId: string,
    commentId: string,
  ): Promise<{ success: boolean; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
      },
    );
  },
};
