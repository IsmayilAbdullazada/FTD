import { PrivateConversationMessage } from '../types';
import { communityFallbackStore } from './devFallbackStore';
import { safeFetchJson } from './httpClient';

const privateMessages: PrivateConversationMessage[] = [
  {
    id: 'chat-1',
    conversationId: 'chat-user-care-1',
    senderId: 'user-clinician-1',
    senderName: 'Dr. Seema Gulyani',
    senderRole: 'CLINICIAN_MODERATOR',
    recipientId: 'user-care-1',
    recipientName: 'Sarah Smith',
    content:
      'Hello Sarah, welcome to our Johns Hopkins FTD Care Partner community. Please let me know if you need assistance with local respite or behavioral routines.',
    createdAt: '2026-09-21T10:00:00Z',
    read: true,
  },
  {
    id: 'chat-2',
    conversationId: 'chat-user-care-1',
    senderId: 'user-care-1',
    senderName: 'User-882',
    senderRole: 'CARE_PARTNER',
    recipientId: 'user-clinician-1',
    recipientName: 'Dr. Seema Gulyani',
    content:
      'Thank you Dr. Seema. The towel bathing method helped us tremendously yesterday without escalating his anxiety.',
    createdAt: '2026-09-21T14:30:00Z',
    read: true,
  },
];

export const messagingApi = {
    getPrivateChat(caregiverId: string): Promise<PrivateConversationMessage[]> {
      return safeFetchJson(
        `/api/v1/chat/private?caregiverId=${caregiverId}`,
        undefined,
        () =>
          privateMessages.filter(
            (message) =>
              message.conversationId === `chat-${caregiverId}` ||
              message.recipientId === caregiverId ||
              message.senderId === caregiverId,
          ),
      );
    },

    sendPrivateChatMessage(payload: {
      caregiverId: string;
      senderId: string;
      content: string;
    }): Promise<PrivateConversationMessage> {
      return safeFetchJson(
        '/api/v1/chat/private',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caregiverId: payload.caregiverId,
            content: payload.content,
          }),
        },
        () => {
          const users = communityFallbackStore.users;
          const sender =
            users.find((user) => user.id === payload.senderId) || users[0];
          const recipient =
            users.find((user) => user.id === payload.caregiverId) || users[1];
          const message: PrivateConversationMessage = {
            id: `chat-msg-${Date.now()}`,
            conversationId: `chat-${payload.caregiverId}`,
            senderId: sender.id,
            senderName:
              sender.role === 'CLINICIAN_MODERATOR'
                ? 'Dr. Seema Gulyani'
                : sender.anonymousHandle,
            senderRole: sender.role,
            recipientId: recipient.id,
            recipientName:
              recipient.role === 'CLINICIAN_MODERATOR'
                ? 'Dr. Seema Gulyani'
                : recipient.anonymousHandle,
            content: payload.content,
            createdAt: new Date().toISOString(),
            read: false,
          };
          privateMessages.push(message);
          return message;
        },
      );
    },
};
