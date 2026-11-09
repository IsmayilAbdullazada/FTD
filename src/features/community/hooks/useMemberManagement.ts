import { useState, type Dispatch, type SetStateAction } from 'react';
import { communityApi } from '@/features/community/api/communityApi';
import {
  filterMembers,
  moveMemberToGroup,
} from '@/features/community/lib/memberFilters';
import type { CommunityGroup, Condition, GroupMember } from '@/types';

interface UseMemberManagementOptions {
  audienceFilter: 'all' | Condition;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export const useMemberManagement = ({
  audienceFilter,
  setActionSuccessNotice,
}: UseMemberManagementOptions) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reassigningUser, setReassigningUser] = useState<GroupMember | null>(null);
  const [targetNewGroupId, setTargetNewGroupId] = useState('');

  const loadMembers = async (groupId?: string) => {
    setLoadingMembers(true);
    try {
      const response = await communityApi.getGroupMembers(groupId);
      const filtered = audienceFilter === 'all'
        ? response
        : response.filter((member) => member.condition === audienceFilter);
      setMembers(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassigningUser || !targetNewGroupId) return;
    try {
      await communityApi.updateMemberGroup(reassigningUser.userId, targetNewGroupId);
      setMembers((previous) =>
        moveMemberToGroup(previous, reassigningUser.userId, targetNewGroupId)
      );
      setReassigningUser(null);
      setTargetNewGroupId('');
      setActionSuccessNotice('Member moved to new group.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
      loadMembers(selectedCohortFilter);
    } catch (error) {
      console.error(error);
      setActionSuccessNotice('Failed to update member group. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  const filteredMembers = filterMembers(members, {
    searchQuery: searchMemberQuery,
    cohortId: selectedCohortFilter,
    audienceFilter,
  });

  return {
    members,
    filteredMembers,
    selectedCohortFilter,
    setSelectedCohortFilter,
    searchMemberQuery,
    setSearchMemberQuery,
    loadingMembers,
    reassigningUser,
    setReassigningUser,
    targetNewGroupId,
    setTargetNewGroupId,
    loadMembers,
    handleConfirmReassign,
  };
};

