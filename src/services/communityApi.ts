import {
  CommunityGroup,
  CurrentUser,
  GroupMember,
  PersonaOption,
} from '../types';
import { communityFallbackStore } from './devFallbackStore';
import { safeFetchJson } from './httpClient';

const {
  users: localUsers,
  cohorts: localCohorts,
  userCohortAssignments: localUserCohortAssignments,
} = communityFallbackStore;

export const communityApi = {
  // Current user persona
  getCurrentUser: async (asUserId?: string): Promise<{ user: CurrentUser; allPersonas: PersonaOption[] }> => {
    const query = asUserId ? `?asUser=${asUserId}` : '';
    return safeFetchJson(
      `/api/v1/users/me${query}`,
      undefined,
      () => {
        const userId = asUserId || 'user-care-1';
        const user = localUsers.find((u) => u.id === userId) || localUsers[1];
        return {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            clinicPatientId: user.clinicPatientId,
            anonymousHandle: user.anonymousHandle,
            badgeLabel: user.badgeLabel,
            avatarColor: user.avatarColor,
            condition: user.condition
          },
          allPersonas: localUsers.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            role: u.role,
            handle: u.anonymousHandle,
            clinicId: u.clinicPatientId,
            condition: u.condition
          })),
        };
      }
    );
  },

  // Groups / Cohorts
  getCohorts: async (options?: { userId?: string; role?: string }): Promise<CommunityGroup[]> => {
    return safeFetchJson('/api/v1/cohorts', undefined, () => {
      if (options?.role === 'CLINICIAN_MODERATOR' || options?.role === 'SYSTEM_ADMIN') {
        return [...localCohorts];
      }
      const assigned = localUserCohortAssignments[options?.userId || 'user-care-1'] || 'group-central-maryland';
      return localCohorts.filter((c) => c.isGeneralBoard || c.id === assigned);
    });
  },

  createCohort: async (payload: {
    name: string;
    slug: string;
    description: string;
    geographicRegion: string;
    radiusMiles?: number;
    tag?: string;
  }): Promise<CommunityGroup> => {
    return safeFetchJson(
      '/api/v1/cohorts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      () => {
        const newGroup: CommunityGroup = {
          id: `group-${Date.now()}`,
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          isGeneralBoard: false,
          geographicRegion: payload.geographicRegion,
          radiusMiles: payload.radiusMiles || 30,
          tag: payload.tag || 'GEO_CUSTOM',
          isActive: true,
          memberCount: 1,
        };
        localCohorts.push(newGroup);
        return newGroup;
      }
    );
  },

  // Group Members Management for Moderator
  getGroupMembers: async (groupId?: string): Promise<GroupMember[]> => {
    return safeFetchJson(
      `/api/v1/cohorts/members${groupId ? `?groupId=${groupId}` : ''}`,
      undefined,
      () => {
        let members: GroupMember[] = [
          {
            userId: 'user-care-1',
            realName: 'Sarah Smith',
            email: 'sarah.smith@example.com',
            phone: '(410) 555-8841',
            clinicPatientId: 'JHM-99210-FTD',
            anonymousHandle: 'User-882',
            primaryGroupId: 'group-central-maryland',
            primaryGroupName: 'Central Maryland (Baltimore Metro)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-08-15',
          },
          {
            userId: 'user-care-2',
            realName: 'Marcus Vance',
            email: 'marcus.vance@example.com',
            phone: '(443) 555-3921',
            clinicPatientId: 'JHM-77341-FTD',
            anonymousHandle: 'User-419',
            primaryGroupId: 'group-eastern-maryland',
            primaryGroupName: 'Eastern Maryland (Eastern Shore)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-08-20',
          },
          {
            userId: 'user-care-3',
            realName: 'Elena Rostova',
            email: 'elena.rostova@example.com',
            phone: '(717) 555-1299',
            clinicPatientId: 'JHM-44091-FTD',
            anonymousHandle: 'User-204',
            primaryGroupId: 'group-northern-maryland',
            primaryGroupName: 'Northern Maryland / Pennsylvania / Delaware',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-02',
          },
          {
            userId: 'user-care-4',
            realName: 'David Chen',
            email: 'david.chen@example.com',
            phone: '(240) 555-6712',
            clinicPatientId: 'JHM-55120-FTD',
            anonymousHandle: 'User-512',
            primaryGroupId: 'group-western-maryland',
            primaryGroupName: 'Western Maryland (Frederick and surrounding areas)',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-10',
          },
          {
            userId: 'user-care-5',
            realName: 'Patricia Morales',
            email: 'patricia.m@example.com',
            phone: '(703) 555-8901',
            clinicPatientId: 'JHM-63218-FTD',
            anonymousHandle: 'User-633',
            primaryGroupId: 'group-southern-maryland',
            primaryGroupName: 'Southern Maryland / DC / Northern Virginia',
            role: 'CARE_PARTNER',
            status: 'ACTIVE',
            joinedAt: '2026-09-15',
          },
        ];

        if (groupId && groupId !== 'all') {
          members = members.filter((m) => m.primaryGroupId === groupId);
        }
        return members;
      }
    );
  },

  updateMemberGroup: async (userId: string, newGroupId: string): Promise<{ success: boolean }> => {
    return safeFetchJson(
      '/api/v1/cohorts/members/reassign',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newGroupId }),
      },
      () => {
        localUserCohortAssignments[userId] = newGroupId;
        return { success: true };
      }
    );
  },
};
