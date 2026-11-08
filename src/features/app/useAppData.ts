import { useState } from 'react';
import { api } from '../../services/api';
import {
  CommunityGroup,
  CurrentUser,
  DirectMessage,
  PersonaOption,
  QueueItem,
} from '../../types';

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
      const userResult = await api.getCurrentUser(asUserId);
      setCurrentUser(userResult.user);
      setAllPersonas(userResult.allPersonas);
      onUserLoaded?.(userResult.user);

      const cohortResult = await api.getCohorts({
        userId: userResult.user.id,
        role: userResult.user.role,
      });
      setCohorts(cohortResult);

      if (userResult.user.role !== 'CARE_PARTNER') {
        const queueResult = await api.getModerationQueue();
        setPendingTriageCount(queueResult.totalPending || 0);
        setPendingQueue(queueResult.items || []);
      } else {
        setPendingTriageCount(0);
        setPendingQueue([]);
      }

      const notificationResult = await api.getNotifications(userResult.user.id);
      setNotifications(notificationResult.messages || []);
    } catch (error) {
      console.error('Failed to bootstrap app data:', error);
    }
  }

  async function refreshQueueAndNotifications(
    user: CurrentUser | null,
  ): Promise<void> {
    try {
      if (user?.role !== 'CARE_PARTNER') {
        const queueResult = await api.getModerationQueue();
        setPendingTriageCount(queueResult.totalPending || 0);
        setPendingQueue(queueResult.items || []);
      } else {
        setPendingTriageCount(0);
        setPendingQueue([]);
      }
      if (user) {
        const result = await api.getNotifications(user.id);
        setNotifications(result.messages || []);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function reloadCohorts(user: CurrentUser | null): Promise<void> {
    if (!user) return;
    const result = await api.getCohorts({
      userId: user.id,
      role: user.role,
    });
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
