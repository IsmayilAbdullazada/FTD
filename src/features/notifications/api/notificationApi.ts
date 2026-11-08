import { safeFetchJson } from '@/shared/api/httpClient';
import { notificationFallbackStore } from '@/shared/dev/devFallbackStore';
import { DirectMessage } from '@/types';

export const notificationApi = {
  getNotifications(
    userId: string,
  ): Promise<{ unreadCount: number; messages: DirectMessage[] }> {
    return safeFetchJson('/api/v1/notifications', undefined, () => {
      const messages = notificationFallbackStore.messages.filter(
        (message) => message.recipientUserId === userId,
      );
      return {
        unreadCount: messages.filter((message) => !message.read).length,
        messages,
      };
    });
  },

  markNotificationRead(id: string): Promise<{ success: boolean }> {
    return safeFetchJson(
      `/api/v1/notifications/${id}/read`,
      { method: 'POST' },
      () => {
        const message = notificationFallbackStore.messages.find(
          (candidate) => candidate.id === id,
        );
        if (message) message.read = true;
        return { success: true };
      },
    );
  },
};
