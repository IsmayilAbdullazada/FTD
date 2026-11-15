import { safeFetchJson } from '@/shared/api/httpClient';

import { PrivateConversationMessage } from '@/types';

export const messagingApi = {
  async getPrivateChat(
    caregiverId: string,
    page = 1,
  ): Promise<PrivateConversationMessage[]> {
    const response = await safeFetchJson<{
      messages: PrivateConversationMessage[];
    }>(
      `/api/v1/chat/private?caregiverId=${encodeURIComponent(caregiverId)}&page=${page}&pageSize=50`,
      undefined,
    );
    return response.messages;
  },

  sendPrivateChatMessage(payload: {
    caregiverId: string;
    senderId: string;
    content: string;
  }): Promise<PrivateConversationMessage> {
    return safeFetchJson('/api/v1/chat/private', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caregiverId: payload.caregiverId,
        content: payload.content,
      }),
    });
  },
};
