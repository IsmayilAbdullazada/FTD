import { safeFetchJson } from '@/shared/api/httpClient';
import { communityFallbackStore } from '@/shared/dev/devFallbackStore';
import { Audience, Comment, Post, QueueItem } from '@/types';

const {
  users: localUsers,
  cohorts: localCohorts,
  posts: localPosts,
  comments: localComments,
  moderationQueue: localQueue,
  userCohortAssignments: localUserCohortAssignments,
} = communityFallbackStore;

export const discussionApi = {
  // Posts Feed
  getPosts: async (options: { role: string; groupId?: string; status?: string; userId?: string; condition?: string }): Promise<{ total: number; posts: Post[] }> => {
    const params = new URLSearchParams();
    if (options.groupId) params.set('groupId', options.groupId);
    if (options.status) params.set('status', options.status);
    if (options.condition) params.set('condition', options.condition);

    return safeFetchJson(
      `/api/v1/posts?${params.toString()}`,
      undefined,
      () => {
        let filtered = localPosts.map((p) => ({
          ...p,
          commentCount: localComments.filter((c) => c.postId === p.id && (c.status === 'APPROVED' || !c.status)).length,
        }));
        if (options.role === 'CARE_PARTNER') {
          const userAssigned = localUserCohortAssignments[options.userId || 'user-care-1'] || 'group-central-maryland';
          const allowed = ['group-general', userAssigned];
          filtered = filtered.filter(
            (p) =>
              (p.status === 'APPROVED' && p.assignedGroups.some((g) => allowed.includes(g.id))) ||
              (options.userId && p.author.userId === options.userId && p.status === 'PENDING_MODERATION')
          );
        } else if (options.status) {
          filtered = filtered.filter((p) => p.status === options.status);
        } else {
          // Clinicians and Admins in Discussions only see published discussions
          filtered = filtered.filter((p) => p.status === 'APPROVED');
        }
        if (options.groupId && options.groupId !== 'all') {
          filtered = filtered.filter((p) =>
            p.assignedGroups.some((g) => g.id === options.groupId)
          );
        }
        return {
          total: filtered.length,
          posts: filtered,
        };
      }
    );
  },

  getPostDetails: async (postId: string, role: string, userId: string): Promise<{ post: Post; comments: Comment[] }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}`,
      undefined,
      () => {
        const found = localPosts.find((p) => p.id === postId);
        const post = found
          ? {
              ...found,
              commentCount: localComments.filter((c) => c.postId === found.id && (c.status === 'APPROVED' || !c.status)).length,
            }
          : localPosts[0];
        const comments = localComments.filter((c) => c.postId === postId);
        return { post, comments };
      }
    );
  },

  createPost: async (payload: {
    title: string;
    content: string;
    targetCohortId?: string;
    authorId: string;
    condition?: Audience;
  }): Promise<{ postId: string; status: string; message: string; hasPhiAlerts: boolean; phiAlertsCount: number }> => {
    const { authorId: _authorId, ...requestPayload } = payload;
    return safeFetchJson(
      '/api/v1/posts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      },
      () => {
        const author = localUsers.find((u) => u.id === payload.authorId) || localUsers[1];
        const assignedCohort = localCohorts.find((c) => c.id === payload.targetCohortId) || localCohorts[0];

        const newPost: Post = {
          id: `post-${Date.now()}`,
          title: payload.title,
          content: payload.content,
          status: 'PENDING_MODERATION',
          author: {
            userId: author.id,
            anonymousHandle: author.anonymousHandle,
            badgeLabel: author.badgeLabel,
            avatarColor: author.avatarColor,
          },
          assignedGroups: [assignedCohort],
          createdAt: new Date().toISOString(),
          commentCount: 0,
          upvotes: 0,
        };
        localPosts.unshift(newPost);

        const queueItem: QueueItem = {
          id: newPost.id,
          type: 'POST',
          author: {
            userId: author.id,
            realName: `${author.firstName} ${author.lastName}`,
            email: author.email,
            phone: author.phoneNumber || '(410) 555-8841',
            clinicPatientId: author.clinicPatientId || 'JHM-99210-FTD',
            anonymousHandle: author.anonymousHandle,
            avatarColor: author.avatarColor,
          },
          title: payload.title,
          rawContent: payload.content,
          sanitizedContent: payload.content,
          suggestedCohort: assignedCohort,
          assignedGroupIds: [assignedCohort.id],
          phiAlerts: [],
          createdAt: new Date().toISOString(),
        };

        localQueue.unshift(queueItem);

        return {
          postId: newPost.id,
          status: 'PENDING_MODERATION',
          message: 'Your question was submitted for Dr. Seema to review within 24 hours.',
          hasPhiAlerts: false,
          phiAlertsCount: 0,
        };
      }
    );
  },

  addComment: async (postId: string, content: string, authorId: string, parentCommentId?: string): Promise<{ comment: Comment; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentCommentId }),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        if (post?.isClosed) {
          throw new Error('This discussion has been closed by a clinician moderator. New replies are no longer accepted.');
        }

        const author = localUsers.find((u) => u.id === authorId) || localUsers[1];
        const isClinician = author.role === 'CLINICIAN_MODERATOR' || author.role === 'SYSTEM_ADMIN';
        const isUnmoderated = post?.allowUnmoderatedReplies === true;
        const newStatus = isClinician || isUnmoderated ? 'APPROVED' : 'PENDING_MODERATION';

        const newComm: Comment = {
          id: `comm-${Date.now()}`,
          postId,
          parentCommentId,
          content,
          author: {
            userId: author.id,
            anonymousHandle: author.anonymousHandle,
            badgeLabel: author.badgeLabel,
            avatarColor: author.avatarColor,
          },
          status: newStatus,
          createdAt: new Date().toISOString(),
        };
        localComments.push(newComm);
        if (post && newComm.status === 'APPROVED') post.commentCount += 1;
        return {
          comment: newComm,
          message: isClinician || isUnmoderated ? 'Reply posted.' : 'Reply submitted for moderation review.',
        };
      }
    );
  },

  closePost: async (postId: string, isClosed: boolean, moderatorId?: string): Promise<{ post: Post; isClosed: boolean; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/close`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isClosed }),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        if (post) {
          post.isClosed = isClosed;
          post.closedAt = isClosed ? new Date().toISOString() : undefined;
          post.closedBy = isClosed ? moderatorId : undefined;
        }
        return {
          post: post || localPosts[0],
          isClosed,
          message: isClosed
            ? 'Discussion closed to new replies. Existing replies are preserved.'
            : 'Discussion reopened. Care partners can now post replies again.',
        };
      }
    );
  },

  togglePostUnmoderatedReplies: async (postId: string, allowUnmoderated: boolean): Promise<{ post: Post; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/unmoderated-replies`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowUnmoderatedReplies: allowUnmoderated }),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        if (post) {
          post.allowUnmoderatedReplies = allowUnmoderated;
          if (allowUnmoderated) {
            localComments
              .filter((c) => c.postId === postId && c.status === 'PENDING_MODERATION')
              .forEach((c) => {
                c.status = 'APPROVED';
              });
            post.commentCount = localComments.filter((c) => c.postId === postId && c.status === 'APPROVED').length;
          }
        }
        return {
          post: post || localPosts[0],
          message: allowUnmoderated
            ? 'Post updated: Anyone can now reply without moderation.'
            : 'Post updated: All new replies now require moderation.',
        };
      }
    );
  },

  togglePostUpvote: async (postId: string, userId: string): Promise<{ success: boolean; upvotes: number; isUpvoted: boolean }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/upvote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        if (post) {
          const isCurrentlyUpvoted = Boolean(post.isUpvoted);
          post.isUpvoted = !isCurrentlyUpvoted;
          post.upvotes = isCurrentlyUpvoted ? Math.max(0, post.upvotes - 1) : post.upvotes + 1;
          return { success: true, upvotes: post.upvotes, isUpvoted: post.isUpvoted };
        }
        return { success: true, upvotes: 1, isUpvoted: true };
      }
    );
  },

  updatePost: async (postId: string, payload: { title?: string; content?: string; targetCohortId?: string }): Promise<{ post: Post; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        if (post) {
          if (payload.title) post.title = payload.title;
          if (payload.content) post.content = payload.content;
          if (payload.targetCohortId) {
            const grp = localCohorts.find((c) => c.id === payload.targetCohortId);
            if (grp) post.assignedGroups = [grp];
          }
        }
        return { post: post || localPosts[0], message: 'Question updated.' };
      }
    );
  },

  deletePost: async (postId: string): Promise<{ success: boolean; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}`,
      { method: 'DELETE' },
      () => {
        const idx = localPosts.findIndex((p) => p.id === postId);
        if (idx !== -1) localPosts.splice(idx, 1);
        return { success: true, message: 'Question withdrawn successfully.' };
      }
    );
  },

  updateComment: async (postId: string, commentId: string, content: string): Promise<{ comment: Comment; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/comments/${commentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      },
      () => {
        const comment = localComments.find((c) => c.id === commentId);
        if (comment) comment.content = content;
        return { comment: comment || localComments[0], message: 'Reply updated.' };
      }
    );
  },

  deleteComment: async (postId: string, commentId: string): Promise<{ success: boolean; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/comments/${commentId}`,
      { method: 'DELETE' },
      () => {
        const idx = localComments.findIndex((c) => c.id === commentId);
        if (idx !== -1) {
          const comm = localComments[idx];
          const post = localPosts.find((p) => p.id === postId);
          if (post && comm.status === 'APPROVED' && post.commentCount > 0) {
            post.commentCount -= 1;
          }
          localComments.splice(idx, 1);
        }
        return { success: true, message: 'Reply removed successfully.' };
      }
    );
  },
};
