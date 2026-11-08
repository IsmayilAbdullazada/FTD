import { adminApi } from './adminApi';
import { authApi } from './authApi';
import { communityApi } from './communityApi';
import { contentApi } from './contentApi';
import { discussionApi } from './discussionApi';
import { guideApi } from './guideApi';
import { knowledgeApi } from './knowledgeApi';
import { messagingApi } from './messagingApi';
import { moderationApi } from './moderationApi';
import { notificationApi } from './notificationApi';

/**
 * Compatibility facade for existing component call sites.
 * Domain behavior belongs in the focused clients composed here.
 */
export const api = {
  ...authApi,
  ...communityApi,
  ...discussionApi,
  ...moderationApi,
  ...knowledgeApi,
  ...contentApi,
  ...messagingApi,
  ...notificationApi,
  ...guideApi,
  ...adminApi,
};
