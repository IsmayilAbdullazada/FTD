import {
  CommunityGroup,
  CurrentUser,
  GroupMember,
  PersonaOption,
} from '@/types';
import { safeFetchJson } from '@/shared/api/httpClient';

export const communityApi = {
  // Current user persona
  getCurrentUser: async (
    asUserId?: string,
  ): Promise<{ user: CurrentUser; allPersonas: PersonaOption[] }> => {
    const query = asUserId ? `?asUser=${asUserId}` : '';
    return safeFetchJson(`/api/v1/users/me${query}`, undefined);
  },

  // Groups / Cohorts
  getCohorts: async (): Promise<CommunityGroup[]> => {
    return safeFetchJson('/api/v1/cohorts', undefined);
  },

  createCohort: async (payload: {
    name: string;
    slug: string;
    description: string;
    geographicRegion: string;
    radiusMiles?: number;
    tag?: string;
  }): Promise<CommunityGroup> => {
    return safeFetchJson('/api/v1/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // Group Members Management for Moderator
  getGroupMembers: async (groupId?: string): Promise<GroupMember[]> => {
    return safeFetchJson(
      `/api/v1/cohorts/members${groupId ? `?groupId=${groupId}` : ''}`,
      undefined,
    );
  },

  updateMemberGroup: async (
    userId: string,
    newGroupId: string,
  ): Promise<{ success: boolean }> => {
    return safeFetchJson('/api/v1/cohorts/members/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newGroupId }),
    });
  },
};
