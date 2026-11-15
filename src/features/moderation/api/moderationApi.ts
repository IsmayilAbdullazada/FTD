import {
  Audience,
  ModerationAuditEvent,
  ModeratorPrivateNote,
  QueueItem,
  RejectionReason,
} from '@/types';

import { safeFetchJson } from '@/shared/api/httpClient';

export const moderationApi = {
  // Moderation Queue & Triage
  getModerationQueue: async (
    page = 1,
    pageSize = 6,
    condition = 'all',
  ): Promise<{ totalPending: number; items: QueueItem[] }> =>
    safeFetchJson(
      `/api/v1/moderation/queue?page=${page}&pageSize=${pageSize}&condition=${condition}`,
      undefined,
    ),

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
    return safeFetchJson('/api/v1/moderation/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  sendPostPrivateNote: async (
    postId: string,
    payload: {
      message: string;
      action?: 'KEEP_PENDING' | 'PUBLISH';
    },
  ): Promise<{
    success: boolean;
    note: ModeratorPrivateNote;
    postStatus: string;
    notes: ModeratorPrivateNote[];
    message: string;
  }> => {
    return safeFetchJson(
      `/api/v1/posts/${encodeURIComponent(postId)}/private-note`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payload.message,
          action: payload.action,
        }),
      },
    );
  },

  // Audit Events
  getAuditEvents: async (): Promise<ModerationAuditEvent[]> => {
    return safeFetchJson('/api/v1/moderation/audit', undefined);
  },
};
