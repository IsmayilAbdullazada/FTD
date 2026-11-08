import {
  Audience,
  ModerationAuditEvent,
  ModeratorPrivateNote,
  Post,
  QueueItem,
  RejectionReason,
} from '@/types';
import {
  communityFallbackStore,
  notificationFallbackStore,
} from '@/shared/dev/devFallbackStore';
import { safeFetchJson } from '@/shared/api/httpClient';

const {
  users: localUsers,
  cohorts: localCohorts,
  posts: localPosts,
  comments: localComments,
  moderationQueue: localQueue,
  auditEvents: localAuditEvents,
} = communityFallbackStore;

export const moderationApi = {
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

  // Audit Events
  getAuditEvents: async (): Promise<ModerationAuditEvent[]> => {
    return safeFetchJson('/api/v1/moderation/audit', undefined, () => [...localAuditEvents]);
  },
};
