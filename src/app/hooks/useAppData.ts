import { reportError } from '@/shared/lib/logger';
import { useState } from 'react';
import { communityApi } from '@/features/community/api/communityApi';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { notificationApi } from '@/features/notifications/api/notificationApi';
import {
  CommunityGroup,
  CurrentUser,
  DirectMessage,
  PersonaOption,
  QueueItem,
} from '@/types';

export function useAppData() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allPersonas, setAllPersonas] = useState<PersonaOption[]>([]);
  const [cohorts, setCohorts] = useState<CommunityGroup[]>([]);
  const [pendingTriageCount, setPendingTriageCount] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<QueueItem[]>([]);
  const [notifications, setNotifications] = useState<DirectMessage[]>([]);

  async function loadUserAndData(
    asUserId?: string,
    onUserLoaded?: (user: CurrentUser) => void,
  ): Promise<void> {
    try {
      const userResult = await communityApi.getCurrentUser(asUserId);
      setAllPersonas(userResult.allPersonas);
      onUserLoaded?.(userResult.user);

      const [cohortResult, queueResult, notificationResult] = await Promise.all(
        [
          communityApi.getCohorts(),
          userResult.user.role !== 'CARE_PARTNER'
            ? moderationApi.getModerationQueue()
            : Promise.resolve({ totalPending: 0, items: [] }),
          notificationApi.getNotifications(),
        ],
      );
      setCohorts(cohortResult);
      setPendingTriageCount(queueResult.totalPending);
      setPendingQueue(queueResult.items);
      setNotifications(notificationResult.messages || []);
      setCurrentUser(userResult.user);
    } catch (error) {
      reportError('Failed to bootstrap app data:', error);
    }
  }

  async function refreshQueueAndNotifications(
    user: CurrentUser | null,
  ): Promise<void> {
    try {
      if (user?.role !== 'CARE_PARTNER') {
        const queueResult = await moderationApi.getModerationQueue();
        setPendingTriageCount(queueResult.totalPending || 0);
        setPendingQueue(queueResult.items || []);
      } else {
        setPendingTriageCount(0);
        setPendingQueue([]);
      }
      if (user) {
        const result = await notificationApi.getNotifications();
        setNotifications(result.messages || []);
      }
    } catch (error) {
      reportError('Request failed', error);
    }
  }

  async function reloadCohorts(user: CurrentUser | null): Promise<void> {
    if (!user) return;
    const result = await communityApi.getCohorts();
    setCohorts(result);
  }

  return {
    values: {
      currentUser,
      allPersonas,
      cohorts,
      pendingTriageCount,
      pendingQueue,
      notifications,
    },
    actions: {
      loadUserAndData,
      refreshQueueAndNotifications,
      reloadCohorts,
      setCurrentUser,
    },
  };
}
