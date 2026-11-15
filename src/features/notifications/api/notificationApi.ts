import { safeFetchJson } from '@/shared/api/httpClient';

import { DirectMessage } from '@/types';

export const notificationApi = {
  getNotifications(): Promise<{
    unreadCount: number;
    messages: DirectMessage[];
  }> {
    return safeFetchJson('/api/v1/notifications', undefined);
  },

  markNotificationRead(id: string): Promise<{ success: boolean }> {
    return safeFetchJson(`/api/v1/notifications/${id}/read`, {
      method: 'POST',
    });
  },
};
