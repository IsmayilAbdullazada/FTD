import {
  CurrentUser,
  PersonaOption,
  Post,
  Comment,
  QueueItem,
  CommunityGroup,
  ClinicalResource,
  DeflectionMatch,
  ModerationAuditEvent,
  DirectMessage,
  PrivateConversationMessage,
  GroupMember,
  RejectionReason,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_GROUPS,
  INITIAL_RESOURCES,
  INITIAL_POSTS,
  INITIAL_COMMENTS,
  INITIAL_QUEUE_ITEMS,
} from '../data/clinicalStore';

// In-memory local state fallback so app NEVER fails even if dev server returns HTML fallback
let localUsers = [...INITIAL_USERS];
let localCohorts = [...INITIAL_GROUPS];
let localResources = [...INITIAL_RESOURCES];
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
};
let localDirectMessages: DirectMessage[] = [
  {
    id: 'dm-1',
    recipientUserId: 'user-care-1',
    title: 'Post Approved: Bathing Aggression',
    message: 'Your discussion query has been approved by Dr. Seema and published to the community.',
    type: 'APPROVAL',
    createdAt: '2026-09-20T10:15:00Z',
    read: true,
  },
];
let localPrivateChats: PrivateConversationMessage[] = [
  {
    id: 'chat-1',
    conversationId: 'chat-user-care-1',
    senderId: 'user-clinician-1',
    senderName: 'Dr. Seema Gulyani',
    senderRole: 'CLINICIAN_MODERATOR',
    recipientId: 'user-care-1',
    recipientName: 'Sarah Smith',
    content: 'Hello Sarah, welcome to our Johns Hopkins FTD Care Partner community. Please let me know if you need assistance with local respite or behavioral routines.',
    createdAt: '2026-09-21T10:00:00Z',
    read: true,
  },
  {
    id: 'chat-2',
    conversationId: 'chat-user-care-1',
    senderId: 'user-care-1',
    senderName: 'CarePartner-882',
    senderRole: 'CARE_PARTNER',
    recipientId: 'user-clinician-1',
    recipientName: 'Dr. Seema Gulyani',
    content: 'Thank you Dr. Seema. The towel bathing method helped us tremendously yesterday without escalating his anxiety.',
    createdAt: '2026-09-21T14:30:00Z',
    read: true,
  },
];


async function safeFetchJson<T>(
  url: string,
  options: RequestInit | undefined,
  fallback: () => T
): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    // Network error or offline
  }
  // Return resilient fallback
  return fallback();
}

export const api = {
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
          },
          allPersonas: localUsers.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            handle: u.anonymousHandle,
            clinicId: u.clinicPatientId,
          })),
        };
      }
    );
  },

  // Groups / Cohorts
  getCohorts: async (options?: { userId?: string; role?: string }): Promise<CommunityGroup[]> => {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);
    if (options?.role) params.set('role', options.role);
    const q = params.toString() ? `?${params.toString()}` : '';

    return safeFetchJson(`/api/v1/cohorts${q}`, undefined, () => {
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
  getPosts: async (options: { role: string; groupId?: string; status?: string; userId?: string }): Promise<{ total: number; posts: Post[] }> => {
    const params = new URLSearchParams();
    params.set('role', options.role);
    if (options.groupId) params.set('groupId', options.groupId);
    if (options.status) params.set('status', options.status);
    if (options.userId) params.set('userId', options.userId);

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
              (options.userId && p.author.userId === options.userId)
          );
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

  getPostDetails: async (postId: string, role: string, userId?: string): Promise<{ post: Post; comments: Comment[] }> => {
    const query = userId ? `?role=${role}&userId=${userId}` : `?role=${role}`;
    return safeFetchJson(
      `/api/v1/posts/${postId}${query}`,
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
  }): Promise<{ postId: string; status: string; message: string; hasPhiAlerts: boolean; phiAlertsCount: number }> => {
    return safeFetchJson(
      '/api/v1/posts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  addComment: async (postId: string, content: string, authorId: string): Promise<{ comment: Comment; message: string }> => {
    return safeFetchJson(
      `/api/v1/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, authorId }),
      },
      () => {
        const author = localUsers.find((u) => u.id === authorId) || localUsers[1];
        const newComm: Comment = {
          id: `comm-${Date.now()}`,
          postId,
          content,
          author: {
            userId: author.id,
            anonymousHandle: author.anonymousHandle,
            badgeLabel: author.badgeLabel,
            avatarColor: author.avatarColor,
          },
          status: author.role === 'CLINICIAN_MODERATOR' ? 'APPROVED' : 'PENDING_MODERATION',
          createdAt: new Date().toISOString(),
        };
        localComments.push(newComm);
        const post = localPosts.find((p) => p.id === postId);
        if (post && newComm.status === 'APPROVED') post.commentCount += 1;
        return {
          comment: newComm,
          message: author.role === 'CLINICIAN_MODERATOR' ? 'Reply posted.' : 'Reply submitted for moderation review.',
        };
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
        if (idx !== -1) localComments.splice(idx, 1);
        return { success: true, message: 'Reply withdrawn successfully.' };
      }
    );
  },

  // Moderation Queue & Triage
  getModerationQueue: async (): Promise<{ totalPending: number; items: QueueItem[] }> => {
    return safeFetchJson('/api/v1/moderation/queue', undefined, () => ({
      totalPending: localQueue.length,
      items: localQueue,
    }));
  },

  performModerationAction: async (payload: {
    entityId: string;
    entityType: 'POST' | 'COMMENT';
    action: 'APPROVE' | 'REJECT' | 'CLINICAL_REDIRECT';
    assignedGroupIds?: string[];
    sanitizedContent?: string;
    rejectionCode?: RejectionReason;
    rejectionMessage?: string;
    moderatorNotes?: string;
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
        const queueIdx = localQueue.findIndex((q) => q.id === payload.entityId);
        const item = queueIdx >= 0 ? localQueue[queueIdx] : null;

        if (payload.action === 'APPROVE' && item) {
          const newPost: Post = {
            id: item.id,
            title: item.title,
            content: payload.sanitizedContent || item.sanitizedContent,
            status: 'APPROVED',
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
          localDirectMessages.unshift({
            id: `dm-${Date.now()}`,
            recipientUserId: item.author.userId,
            title: 'Medical Inquiry Diverted to Clinical Support Line',
            message: 'Prescription medications, acute medical symptoms, and clinical questions cannot be addressed on public peer boards. Please contact the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911.',
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

  // Private 1-on-1 Chat between Dr. Seema and Caregivers
  getPrivateChat: async (caregiverId: string): Promise<PrivateConversationMessage[]> => {
    return safeFetchJson(
      `/api/v1/chat/private?caregiverId=${caregiverId}`,
      undefined,
      () => {
        return localPrivateChats.filter(
          (m) => m.conversationId === `chat-${caregiverId}` || m.recipientId === caregiverId || m.senderId === caregiverId
        );
      }
    );
  },

  sendPrivateChatMessage: async (payload: {
    caregiverId: string;
    senderId: string;
    content: string;
  }): Promise<PrivateConversationMessage> => {
    return safeFetchJson(
      '/api/v1/chat/private',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const sender = localUsers.find((u) => u.id === payload.senderId) || localUsers[0];
        const recipient = localUsers.find((u) => u.id === payload.caregiverId) || localUsers[1];

        const newMsg: PrivateConversationMessage = {
          id: `chat-msg-${Date.now()}`,
          conversationId: `chat-${payload.caregiverId}`,
          senderId: sender.id,
          senderName: sender.role === 'CLINICIAN_MODERATOR' ? 'Dr. Seema Gulyani' : sender.anonymousHandle,
          senderRole: sender.role,
          recipientId: recipient.id,
          recipientName: recipient.role === 'CLINICIAN_MODERATOR' ? 'Dr. Seema Gulyani' : recipient.anonymousHandle,
          content: payload.content,
          createdAt: new Date().toISOString(),
          read: false,
        };

        localPrivateChats.push(newMsg);
        return newMsg;
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
            anonymousHandle: 'CarePartner-882',
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
            anonymousHandle: 'CarePartner-419',
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
            anonymousHandle: 'CarePartner-204',
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
            anonymousHandle: 'CarePartner-512',
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
            anonymousHandle: 'CarePartner-633',
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
  deflectQuery: async (draftText: string): Promise<{ deflectionMatches: DeflectionMatch[] }> => {
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

        localResources.forEach((res) => {
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
  checkDiscussionMatches: async (payload: { title: string; content: string }): Promise<{
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
        body: JSON.stringify(payload),
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
  getAllDiscussionsPool: async (): Promise<{
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
            cohortName: cohort?.properName || cohort?.name || 'General Clinic Forum',
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

  // Closed-loop RAG Assistant
  chatWithAssistant: async (query: string): Promise<{ answer: string; isMedicationRefusal?: boolean; citedResources?: any[] }> => {
    return safeFetchJson(
      '/api/v1/knowledge/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      },
      () => {
        const q = query.toLowerCase();
        const drugKeywords = ['seroquel', 'haldol', 'donepezil', 'aricept', 'memantine', 'namenda', 'trazodone', 'dosage', 'dose', 'prescribe'];
        if (drugKeywords.some((d) => q.includes(d))) {
          return {
            answer: "Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911.",
            isMedicationRefusal: true,
            citedResources: [],
          };
        }

        const matched = localResources.find((r) => {
          const combined = `${r.title} ${r.summary} ${r.contentBody}`.toLowerCase();
          return q.split(/\s+/).some((w) => w.length > 3 && combined.includes(w));
        }) || localResources[0];

        return {
          answer: `Based on Dr. Seema's clinical protocols for "${matched.title}":\n\n${matched.summary}\n\nKey Strategies:\n${matched.keyTakeaways.map((t) => `• ${t}`).join('\n')}\n\nFor clinical questions, please call the clinic direct line at (410) 955-5147 (option 2) or support line at (410) 502-4163. For life-threatening emergencies, call 911.`,
          citedResources: [{ id: matched.id, title: matched.title, url: matched.externalUrl }],
        };
      }
    );
  },

  // Resources
  getResources: async (): Promise<ClinicalResource[]> => {
    return safeFetchJson('/api/v1/resources', undefined, () => [...localResources]);
  },

  createResource: async (payload: {
    title: string;
    category: ClinicalResource['category'];
    summary: string;
    contentBody: string;
    diseaseDomain?: 'FTD' | 'ALZHEIMERS' | 'LBD';
    externalUrl?: string;
    keyTakeaways?: string[];
  }): Promise<ClinicalResource> => {
    return safeFetchJson(
      '/api/v1/resources',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const newRes: ClinicalResource = {
          id: `res-${Date.now()}`,
          title: payload.title,
          category: payload.category || 'BEHAVIORAL_AGITATION',
          summary: payload.summary,
          contentBody: payload.contentBody,
          diseaseDomain: payload.diseaseDomain || 'FTD',
          externalUrl: payload.externalUrl || '',
          keyTakeaways: payload.keyTakeaways || [],
          createdAt: new Date().toISOString(),
        };
        localResources.unshift(newRes);
        return newRes;
      }
    );
  },


  // Audit Events
  getAuditEvents: async (): Promise<ModerationAuditEvent[]> => {
    return safeFetchJson('/api/v1/moderation/audit', undefined, () => [...localAuditEvents]);
  },

  // Notifications
  getNotifications: async (userId: string): Promise<{ unreadCount: number; messages: DirectMessage[] }> => {
    return safeFetchJson(
      `/api/v1/notifications?userId=${userId}`,
      undefined,
      () => {
        const msgs = localDirectMessages.filter((m) => m.recipientUserId === userId);
        return {
          unreadCount: msgs.filter((m) => !m.read).length,
          messages: msgs,
        };
      }
    );
  },

  markNotificationRead: async (id: string): Promise<{ success: boolean }> => {
    return safeFetchJson(
      `/api/v1/notifications/${id}/read`,
      { method: 'POST' },
      () => {
        const msg = localDirectMessages.find((m) => m.id === id);
        if (msg) msg.read = true;
        return { success: true };
      }
    );
  },

  // Clinician Invitations
  issueInvitation: async (payload: {
    email: string;
    firstName?: string;
    lastName?: string;
    clinicPatientId?: string;
    primaryCohortSlug: string;
  }): Promise<{
    invitationId: string;
    inviteToken: string;
    inviteExpiresAt: string;
    registrationUrl: string;
    status: string;
  }> => {
    return safeFetchJson(
      '/api/v1/auth/invitations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const token = `jh-token-${Math.random().toString(36).substring(2, 9)}`;
        return {
          invitationId: `inv-${Date.now()}`,
          inviteToken: token,
          inviteExpiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
          registrationUrl: `/register?token=${token}`,
          status: 'DISPATCHED',
        };
      }
    );
  },
};
