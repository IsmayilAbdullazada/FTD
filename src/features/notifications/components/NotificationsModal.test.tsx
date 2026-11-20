import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { NotificationsModal } from './NotificationsModal';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { notificationApi } from '@/features/notifications/api/notificationApi';
import type { CurrentUser, DirectMessage, QueueItem } from '@/types';

vi.mock('@/features/moderation/api/moderationApi', () => ({
  moderationApi: {
    performModerationAction: vi.fn(),
  },
}));

vi.mock('@/features/notifications/api/notificationApi', () => ({
  notificationApi: {
    markNotificationRead: vi.fn(),
  },
}));

const clinicianUser: CurrentUser = {
  id: 'user-owner-1',
  email: 'clinician@example.test',
  role: 'CLINICIAN_MODERATOR',
  firstName: 'Jordan',
  lastName: 'Lee',
  anonymousHandle: 'Dr. Lee',
  badgeLabel: 'Clinician Moderator',
  avatarColor: '#002D72',
  condition: 'FTD',
};

const pendingReply: QueueItem = {
  id: 'comment-123',
  type: 'COMMENT',
  postId: 'post-456',
  title: 'Evening routine tips',
  rawContent: 'A gentle playlist helped us wind down.',
  sanitizedContent: 'A gentle playlist helped us wind down.',
  createdAt: '2026-11-19T12:00:00.000Z',
  assignedGroupIds: ['group-1'],
  condition: 'FTD',
  suggestedCohort: {
    id: 'group-1',
    name: 'General Support',
    slug: 'general-support',
    description: 'General care partner support group',
    isGeneralBoard: true,
    geographicRegion: 'Maryland',
    tag: 'general',
    isActive: true,
    memberCount: 12,
  },
  phiAlerts: [],
  author: {
    userId: 'user-care-1',
    realName: 'Sarah Smith',
    email: 'sarah@example.test',
    phone: '410-555-0100',
    clinicPatientId: 'PAT-001',
    anonymousHandle: 'User-101',
    avatarColor: '#002D72',
    condition: 'FTD',
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('quick moderation of a pending reply passes entityType COMMENT without post-only fields', async () => {
  vi.mocked(moderationApi.performModerationAction).mockResolvedValue({
    status: 'ok',
    newEntityStatus: 'APPROVED',
    message: 'Approved',
  });
  const onQueueUpdated = vi.fn();

  render(
    <NotificationsModal
      isOpen
      onClose={vi.fn()}
      currentUser={clinicianUser}
      notifications={[]}
      pendingQueue={[pendingReply]}
      onRefreshNotifications={vi.fn()}
      onQueueUpdated={onQueueUpdated}
    />,
  );

  expect(screen.getByText('Reply')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

  await waitFor(() =>
    expect(moderationApi.performModerationAction).toHaveBeenCalledWith({
      entityId: 'comment-123',
      entityType: 'COMMENT',
      action: 'APPROVE',
      sanitizedContent: 'A gentle playlist helped us wind down.',
    }),
  );
  expect(onQueueUpdated).toHaveBeenCalledTimes(1);
});

test('notifications route to guides, specific discussions, and my posts based on kind and context', async () => {
  vi.mocked(notificationApi.markNotificationRead).mockResolvedValue({
    success: true,
  });
  const onClose = vi.fn();
  const onNavigateToConsole = vi.fn();
  const onOpenDiscussion = vi.fn();
  const onOpenMyPosts = vi.fn();

  const notifications: DirectMessage[] = [
    {
      id: 'notif-guide',
      recipientUserId: clinicianUser.id,
      title: 'Guide draft saved',
      message: 'Review extracted guide before activating.',
      type: 'MODERATION',
      kind: 'GUIDE_REVIEW_REQUIRED',
      context: { guideId: 'guide-1' },
      read: false,
      createdAt: '2026-11-19T12:00:00.000Z',
    },
    {
      id: 'notif-reply',
      recipientUserId: clinicianUser.id,
      title: 'New reply on your discussion',
      message: 'Someone replied to your post.',
      type: 'ACTIVITY',
      kind: 'DISCUSSION_REPLY_PUBLISHED',
      context: { postId: 'post-789', commentId: 'comment-999' },
      read: true,
      createdAt: '2026-11-19T12:05:00.000Z',
    },
    {
      id: 'notif-private',
      recipientUserId: clinicianUser.id,
      title: 'Private clinician follow-up',
      message: 'A clinician sent a private note.',
      type: 'MODERATION',
      kind: 'POST_CLINICAL_FOLLOWUP',
      context: { postId: 'post-321' },
      read: true,
      createdAt: '2026-11-19T12:10:00.000Z',
    },
  ];

  render(
    <NotificationsModal
      isOpen
      onClose={onClose}
      currentUser={clinicianUser}
      notifications={notifications}
      pendingQueue={[]}
      onRefreshNotifications={vi.fn()}
      onQueueUpdated={vi.fn()}
      onNavigateToConsole={onNavigateToConsole}
      onOpenDiscussion={onOpenDiscussion}
      onOpenMyPosts={onOpenMyPosts}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Open Guides' }));
  expect(onNavigateToConsole).toHaveBeenCalledWith('chatbot-knowledge');

  fireEvent.click(screen.getByRole('button', { name: 'View discussion' }));
  expect(onOpenDiscussion).toHaveBeenCalledWith('post-789');

  fireEvent.click(screen.getByRole('button', { name: 'View My Posts' }));
  expect(onOpenMyPosts).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
