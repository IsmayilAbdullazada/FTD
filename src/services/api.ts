import {
  CurrentUser,
  PersonaOption,
  Post,
  Comment,
  QueueItem,
  CommunityGroup,
  DeflectionMatch,
  ModerationAuditEvent,
  GroupMember,
  RejectionReason,
  Audience,
  ModeratorPrivateNote,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_GROUPS,
  INITIAL_POSTS,
  INITIAL_COMMENTS,
  INITIAL_QUEUE_ITEMS,
} from '../data/clinicalStore';
import { authApi } from './authApi';
import { adminApi } from './adminApi';
import { contentApi } from './contentApi';
import {
  contentFallbackStore,
  notificationFallbackStore,
} from './devFallbackStore';
import { guideApi } from './guideApi';
import { apiFetch, safeFetchJson } from './httpClient';
import { createMessagingApi } from './messagingApi';
import { notificationApi } from './notificationApi';

// Explicit development-only fallback data, enabled with VITE_ENABLE_API_FALLBACK=true.
let localUsers = [...INITIAL_USERS];
let localCohorts = [...INITIAL_GROUPS];
let localPosts = [...INITIAL_POSTS];
let localComments = [...INITIAL_COMMENTS];
let localQueue = [...INITIAL_QUEUE_ITEMS];
let localAuditEvents: ModerationAuditEvent[] = [];
let localUserCohortAssignments: Record<string, string> = {
  'user-care-1': 'group-central-maryland',
  'user-care-2': 'group-eastern-maryland',
  'user-care-3': 'group-northern-maryland',
  'user-care-4': 'group-western-maryland',
  'user-care-5': 'group-southern-maryland',
  'user-care-6': 'group-central-maryland',
  'user-care-7': 'group-western-maryland',
};
export const api = {
  ...authApi,
  ...guideApi,
  ...adminApi,
  ...contentApi,
  ...notificationApi,
  ...createMessagingApi(() => localUsers),
  // Current user persona
  getCurrentUser: async (asUserId?: string): Promise<{ user: CurrentUser; allPersonas: PersonaOption[] }> => {
    const query = asUserId ? `?asUser=${asUserId}` : '';
    return safeFetchJson(
      `/api/v1/users/me${query}`,
      undefined,
      () => {
        const userId = asUserId || 'user-care-1';
        const user = localUsers.find((u) => u.id === userId) || localUsers[1];
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            clinicPatientId: user.clinicPatientId,
            anonymousHandle: user.anonymousHandle,
            badgeLabel: user.badgeLabel,
            avatarColor: user.avatarColor,
            condition: user.condition
          },
          allPersonas: localUsers.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            handle: u.anonymousHandle,
            clinicId: u.clinicPatientId,
            condition: u.condition
          })),
        };
      }
    );
  },

  // Groups / Cohorts
  getCohorts: async (options?: { userId?: string; role?: string }): Promise<CommunityGroup[]> => {
    return safeFetchJson('/api/v1/cohorts', undefined, () => {
      if (options?.role === 'CLINICIAN_MODERATOR' || options?.role === 'SYSTEM_ADMIN') {
        return [...localCohorts];
      }
      const assigned = localUserCohortAssignments[options?.userId || 'user-care-1'] || 'group-central-maryland';
      return localCohorts.filter((c) => c.isGeneralBoard || c.id === assigned);
    });
  },

  createCohort: async (payload: {
    name: string;
    slug: string;
    description: string;
    geographicRegion: string;
    radiusMiles?: number;
    tag?: string;
  }): Promise<CommunityGroup> => {
    return safeFetchJson(
      '/api/v1/cohorts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const newGroup: CommunityGroup = {
          id: `group-${Date.now()}`,
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          isGeneralBoard: false,
          geographicRegion: payload.geographicRegion,
          radiusMiles: payload.radiusMiles || 30,
          tag: payload.tag || 'GEO_CUSTOM',
          isActive: true,
          memberCount: 1,
        };
        localCohorts.push(newGroup);
        return newGroup;
      }
    );
  },

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

  // Moderation Queue & Triage
  getModerationQueue: async (): Promise<{ totalPending: number; items: QueueItem[] }> => {
    return safeFetchJson('/api/v1/moderation/queue', undefined, () => {
      const replies: QueueItem[] = localComments.filter((c) => c.status === 'PENDING_MODERATION').flatMap((c) => {
        const post = localPosts.find((p) => p.id === c.postId);
        const author = localUsers.find((u) => u.id === c.author.userId);
        if (!post || !author) return [];
        return [{ id: c.id, type: 'COMMENT', postId: post.id, title: post.title,
          postContent: post.content, parentCommentId: c.parentCommentId,
          parentContent: localComments.find((parent) => parent.id === c.parentCommentId)?.content,
          author: { userId: author.id, realName: `${author.firstName} ${author.lastName}`,
            email: author.email, phone: '', clinicPatientId: '', condition: author.condition,
            anonymousHandle: author.anonymousHandle, avatarColor: author.avatarColor },
          rawContent: c.content, sanitizedContent: c.content, condition: post.condition,
          suggestedCohort: post.assignedGroups[0] || localCohorts[0],
          assignedGroupIds: post.assignedGroups.map((g) => g.id), phiAlerts: [], createdAt: c.createdAt }];
      });
      const items = [...localQueue.filter((q) => q.type !== 'COMMENT'), ...replies];
      return { totalPending: items.length, items };
    });
  },

  performModerationAction: async (payload: {
    entityId: string;
    entityType: 'POST' | 'COMMENT';
    action: 'APPROVE' | 'REJECT' | 'CLINICAL_REDIRECT';
    assignedGroupIds?: string[];
    sanitizedContent?: string;
    allowUnmoderatedReplies?: boolean;
    rejectionCode?: RejectionReason;
    rejectionMessage?: string;
    moderatorNotes?: string;
    condition?: Audience;
  }): Promise<{
    status: string;
    newEntityStatus: string;
    message: string;
    indexedToRag?: boolean;
  }> => {
    return safeFetchJson(
      '/api/v1/moderation/action',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        if (payload.entityType === 'COMMENT') {
          const comment = localComments.find((c) => c.id === payload.entityId);
          if (!comment || comment.status !== 'PENDING_MODERATION') throw new Error('Pending reply not found.');
          if (payload.action !== 'APPROVE' && payload.action !== 'REJECT') throw new Error('Invalid reply action.');
          comment.status = payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
          if (payload.action === 'APPROVE') comment.content = payload.sanitizedContent ?? comment.content;
          const post = localPosts.find((p) => p.id === comment.postId);
          if (post) post.commentCount = localComments.filter((c) => c.postId === post.id && c.status === 'APPROVED').length;
          return { status: 'SUCCESS', newEntityStatus: comment.status,
            message: payload.action === 'APPROVE' ? 'Reply approved and published.' : 'Reply rejected.' };
        }
        const queueIdx = localQueue.findIndex((q) => q.id === payload.entityId);
        const item = queueIdx >= 0 ? localQueue[queueIdx] : null;

        if (payload.action === 'APPROVE' && item) {
          const newPost: Post = {
            id: item.id,
            title: item.title,
            content: payload.sanitizedContent || item.sanitizedContent,
            status: 'APPROVED',
            allowUnmoderatedReplies: payload.allowUnmoderatedReplies ?? false,
            author: {
              userId: item.author.userId,
              anonymousHandle: item.author.anonymousHandle,
              badgeLabel: 'Care Partner',
              avatarColor: item.author.avatarColor,
            },
            assignedGroups: localCohorts.filter((c) =>
              (payload.assignedGroupIds || item.assignedGroupIds).includes(c.id)
            ),
            createdAt: new Date().toISOString(),
            commentCount: 0,
            upvotes: 0,
          };
          localPosts.unshift(newPost);
          localQueue.splice(queueIdx, 1);
          return {
            status: 'SUCCESS',
            newEntityStatus: 'APPROVED',
            message: 'Post approved and published.',
            indexedToRag: true,
          };
        }

        if (payload.action === 'REJECT') {
          if (queueIdx >= 0) localQueue.splice(queueIdx, 1);
          return {
            status: 'SUCCESS',
            newEntityStatus: 'REJECTED',
            message: 'Post rejected.',
          };
        }

        // Clinical escalation -> divert to Clinic Caregiver Support Line
        if (queueIdx >= 0) localQueue.splice(queueIdx, 1);

        if (item) {
          notificationFallbackStore.messages.unshift({
            id: `dm-${Date.now()}`,
            recipientUserId: item.author.userId,
            title: 'Medical Inquiry Diverted to Care Support Line',
            message: 'Prescription medications, acute medical symptoms, and direct medical questions cannot be addressed on public peer boards. Please contact the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911.',
            type: 'CLINICAL_ESCALATION',
            createdAt: new Date().toISOString(),
            read: false,
          });
        }

        return {
          status: 'SUCCESS',
          newEntityStatus: 'CLINICAL_REDIRECT',
          message: 'Diverted to clinic caregiver support line.',
        };
      }
    );
  },

  sendPostPrivateNote: async (
    postId: string,
    payload: { message: string; action?: 'KEEP_PENDING' | 'PUBLISH'; senderId?: string }
  ): Promise<{
    success: boolean;
    note: ModeratorPrivateNote;
    postStatus: string;
    notes: ModeratorPrivateNote[];
    message: string;
  }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/private-note`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payload.message, action: payload.action }),
      },
      () => {
        const post = localPosts.find((p) => p.id === postId);
        const queueItem = localQueue.find((q) => q.id === postId);
        const now = new Date().toISOString();
        const isClinician =
          payload.senderId === 'user-clinician-1' ||
          payload.senderId === 'user-admin-1' ||
          !payload.senderId?.startsWith('user-care');
        const note: ModeratorPrivateNote = {
          id: `pnote-${Date.now()}`,
          senderId: payload.senderId || (isClinician ? 'user-clinician-1' : post?.author?.userId || 'user-care-1'),
          senderName: isClinician ? 'Moderator' : 'Care Partner',
          senderRole: isClinician ? 'CLINICIAN_MODERATOR' : 'CARE_PARTNER',
          message: payload.message,
          createdAt: now,
        };
        if (post) {
          if (!post.moderatorPrivateNotes) post.moderatorPrivateNotes = [];
          post.moderatorPrivateNotes.push(note);
          if (payload.action === 'PUBLISH') post.status = 'APPROVED';
        }
        if (queueItem) {
          if (!queueItem.moderatorPrivateNotes) queueItem.moderatorPrivateNotes = [];
          queueItem.moderatorPrivateNotes.push(note);
          if (payload.action === 'PUBLISH') {
            const idx = localQueue.indexOf(queueItem);
            if (idx >= 0) localQueue.splice(idx, 1);
          }
        }
        return {
          success: true,
          note,
          postStatus: post?.status || (payload.action === 'PUBLISH' ? 'APPROVED' : 'PENDING_MODERATION'),
          notes: post?.moderatorPrivateNotes || [note],
          message: payload.action === 'PUBLISH' ? 'Private message sent and post published!' : 'Private message sent to care partner.',
        };
      }
    );
  },

  // Group Members Management for Moderator
  getGroupMembers: async (groupId?: string): Promise<GroupMember[]> => {
    return safeFetchJson(
      `/api/v1/cohorts/members${groupId ? `?groupId=${groupId}` : ''}`,
      undefined,
      () => {
        let members: GroupMember[] = [
          {
            userId: 'user-care-1',
            realName: 'Sarah Smith',
            email: 'sarah.smith@example.com',
            phone: '(410) 555-8841',
            clinicPatientId: 'JHM-99210-FTD',
            anonymousHandle: 'User-882',
            primaryGroupId: 'group-central-maryland',
            primaryGroupName: 'Central Maryland (Baltimore Metro)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-08-15',
          },
          {
            userId: 'user-care-2',
            realName: 'Marcus Vance',
            email: 'marcus.vance@example.com',
            phone: '(443) 555-3921',
            clinicPatientId: 'JHM-77341-FTD',
            anonymousHandle: 'User-419',
            primaryGroupId: 'group-eastern-maryland',
            primaryGroupName: 'Eastern Maryland (Eastern Shore)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-08-20',
          },
          {
            userId: 'user-care-3',
            realName: 'Elena Rostova',
            email: 'elena.rostova@example.com',
            phone: '(717) 555-1299',
            clinicPatientId: 'JHM-44091-FTD',
            anonymousHandle: 'User-204',
            primaryGroupId: 'group-northern-maryland',
            primaryGroupName: 'Northern Maryland / Pennsylvania / Delaware',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-02',
          },
          {
            userId: 'user-care-4',
            realName: 'David Chen',
            email: 'david.chen@example.com',
            phone: '(240) 555-6712',
            clinicPatientId: 'JHM-55120-FTD',
            anonymousHandle: 'User-512',
            primaryGroupId: 'group-western-maryland',
            primaryGroupName: 'Western Maryland (Frederick and surrounding areas)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-10',
          },
          {
            userId: 'user-care-5',
            realName: 'Patricia Morales',
            email: 'patricia.m@example.com',
            phone: '(703) 555-8901',
            clinicPatientId: 'JHM-63218-FTD',
            anonymousHandle: 'User-633',
            primaryGroupId: 'group-southern-maryland',
            primaryGroupName: 'Southern Maryland / DC / Northern Virginia',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-15',
          },
        ];

        if (groupId && groupId !== 'all') {
          members = members.filter((m) => m.primaryGroupId === groupId);
        }
        return members;
      }
    );
  },

  updateMemberGroup: async (userId: string, newGroupId: string): Promise<{ success: boolean }> => {
    return safeFetchJson(
      '/api/v1/cohorts/members/reassign',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newGroupId }),
      },
      () => {
        localUserCohortAssignments[userId] = newGroupId;
        return { success: true };
      }
    );
  },


  // Pre-submission Typeahead Deflection
  deflectQuery: async (draftText: string, userId: string): Promise<{ deflectionMatches: DeflectionMatch[] }> => {
    return safeFetchJson(
      '/api/v1/knowledge/deflect',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftText }),
      },
      () => {
        const text = draftText.toLowerCase();
        const matches: DeflectionMatch[] = [];

        contentFallbackStore.resources.forEach((res) => {
          const combined = `${res.title} ${res.summary} ${res.contentBody}`.toLowerCase();
          const words = text.split(/\s+/).filter((w) => w.length > 3);
          const score = words.filter((w) => combined.includes(w)).length;
          if (score >= 1) {
            matches.push({
              sourceType: 'RESOURCE',
              id: res.id,
              title: res.title,
              category: res.category,
              snippet: res.summary,
              url: res.externalUrl,
              confidenceScore: Math.min(0.95, 0.6 + score * 0.1),
            });
          }
        });

        return { deflectionMatches: matches.slice(0, 3) };
      }
    );
  },

  // Keyword matching against existing community discussions & answers
  checkDiscussionMatches: async (payload: { title: string; content: string; userId: string }): Promise<{
    matches: {
      postId: string;
      title: string;
      snippet: string;
      authorHandle: string;
      replyCount: number;
      matchScore: number;
    }[];
  }> => {
    return safeFetchJson(
      '/api/v1/deflection/discussions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, content: payload.content }),
      },
      () => {
        const rawText = `${payload.title} ${payload.content}`.toLowerCase();
        const stopWords = new Set([
          'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'what', 'when',
          'where', 'who', 'how', 'why', 'are', 'was', 'were', 'will', 'would', 'could',
          'should', 'can', 'about', 'just', 'some', 'any', 'not', 'you', 'your', 'our',
          'their', 'they', 'them', 'she', 'her', 'his', 'him', 'does', 'did', 'been',
        ]);
        const queryWords = rawText
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !stopWords.has(w));

        if (queryWords.length === 0) return { matches: [] };

        const matches: {
          postId: string;
          title: string;
          snippet: string;
          authorHandle: string;
          replyCount: number;
          matchScore: number;
        }[] = [];
        const approvedPosts = localPosts.filter((p) => p.status === 'APPROVED');

        for (const post of approvedPosts) {
          const postComments = localComments.filter((c) => c.postId === post.id);
          let bestScore = 0;
          let bestSnippet = post.content;

          const titleLower = post.title.toLowerCase();
          const titleMatches = queryWords.filter((w) => titleLower.includes(w)).length;
          if (titleMatches > 0) bestScore += titleMatches * 3;

          const contentLower = post.content.toLowerCase();
          const contentMatches = queryWords.filter((w) => contentLower.includes(w)).length;
          if (contentMatches > 0) bestScore += contentMatches * 1.5;

          for (const comm of postComments) {
            const commLower = comm.content.toLowerCase();
            const commMatches = queryWords.filter((w) => commLower.includes(w)).length;
            if (commMatches > 0) {
              const commScore = commMatches * 2;
              if (commScore > bestScore) {
                bestScore = commScore;
                bestSnippet = comm.content;
              }
            }
          }

          if (bestScore >= 2) {
            matches.push({
              postId: post.id,
              title: post.title,
              snippet: bestSnippet.slice(0, 160) + (bestSnippet.length > 160 ? '...' : ''),
              authorHandle: post.author.anonymousHandle,
              replyCount: postComments.length,
              matchScore: bestScore,
            });
          }
        }

        matches.sort((a, b) => b.matchScore - a.matchScore);
        return { matches: matches.slice(0, 2) };
      }
    );
  },

  // Instant discussion pool for real-time keystroke matching
  getAllDiscussionsPool: async (userId: string): Promise<{
    pool: {
      id: string;
      title: string;
      content: string;
      authorHandle: string;
      authorBadge?: string;
      cohortName?: string;
      createdAt: string;
      replies: {
        id: string;
        content: string;
        authorHandle: string;
        authorBadge?: string;
        createdAt?: string;
      }[];
    }[];
  }> => {
    return safeFetchJson(
      '/api/v1/deflection/discussions-pool',
      undefined,
      () => {
        const approvedPosts = localPosts.filter((p) => p.status === 'APPROVED');
        const pool = approvedPosts.map((p) => {
          const postComments = localComments.filter((c) => c.postId === p.id && (c.status === 'APPROVED' || !c.status));
          const cohort = p.assignedGroups?.[0];
          return {
            id: p.id,
            title: p.title,
            content: p.content,
            authorHandle: p.author.anonymousHandle,
            authorBadge: p.author.badgeLabel,
            cohortName: cohort?.properName || cohort?.name || 'General Forum',
            createdAt: p.createdAt,
            replies: postComments.map((c) => ({
              id: c.id,
              content: c.content,
              authorHandle: c.author.anonymousHandle,
              authorBadge: c.author.badgeLabel,
              createdAt: c.createdAt,
            })),
          };
        });
        return { pool };
      }
    );
  },

  // Closed-loop Assistant Grounded in Verified Institutional Care Guides
  chatWithAssistant: async (
    query: string,
    userId: string = 'anonymous',
    conversationHistory: Array<{ role: string; content?: string; text?: string }> = []
  ): Promise<{
    answer: string;
    retrievedChunks?: Array<{
      guideTitle: string;
      fileName: string;
      page: number;
      content: string;
      score: number;
    }>;
    isOffline?: boolean;
    isDisabled?: boolean;
    isMedicationRefusal?: boolean;
    discussionDraft?: { title: string; content: string };
    discussions?: { id: string; title: string; url: string; replyCount: number }[];
    citedResources?: Array<{
      id: string;
      title: string;
      fileName?: string;
      page?: number;
      url: string;
    }>;
    suggestedQuestions?: string[];
    isUploadedGuideSourced?: boolean;
    matchedGuide?: {
      id: string;
      title: string;
      fileName: string;
      page?: number;
      sectionTitle?: string;
    };
  }> => {
    const res = await apiFetch('/api/v1/knowledge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversationHistory }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Knowledge Assistant request failed: ${res.statusText || res.status}`);
    }
    return res.json();
  },

  // Audit Events
  getAuditEvents: async (): Promise<ModerationAuditEvent[]> => {
    return safeFetchJson('/api/v1/moderation/audit', undefined, () => [...localAuditEvents]);
  },

};


