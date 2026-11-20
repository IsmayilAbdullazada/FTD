import { reportError } from '@/shared/lib/logger';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { communityApi } from '@/features/community/api/communityApi';
import {
  filterMembers,
  moveMemberToGroup,
} from '@/features/community/lib/memberFilters';
import type { Condition, GroupMember } from '@/types';

interface UseMemberManagementOptions {
  audienceFilter: 'all' | Condition;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
  onReassigned?: () => void;
}

export const useMemberManagement = ({
  audienceFilter,
  setActionSuccessNotice,
  onReassigned,
}: UseMemberManagementOptions) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reassigningUser, setReassigningUser] = useState<GroupMember | null>(
    null,
  );
  const [targetNewGroupId, setTargetNewGroupId] = useState('');

  const loadMembers = async (groupId?: string) => {
    setLoadingMembers(true);
    try {
      const normalizedGroupId =
        groupId && groupId !== 'all' ? groupId : undefined;
      const response = await communityApi.getGroupMembers(normalizedGroupId);
      const filtered =
        audienceFilter === 'all'
          ? response
          : response.filter((member) => member.condition === audienceFilter);
      setMembers(filtered);
    } catch (error) {
      reportError('Request failed', error);
      setActionSuccessNotice('Failed to load members. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassigningUser || !targetNewGroupId) return;
    try {
      await communityApi.updateMemberGroup(
        reassigningUser.userId,
        targetNewGroupId,
      );
      setMembers((previous) =>
        moveMemberToGroup(previous, reassigningUser.userId, targetNewGroupId),
      );
      setReassigningUser(null);
      setTargetNewGroupId('');
      setActionSuccessNotice('Member moved to new group.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
      await loadMembers();
      onReassigned?.();
    } catch (error) {
      reportError('Request failed', error);
      setActionSuccessNotice(
        'Failed to update member group. Please try again.',
      );
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
