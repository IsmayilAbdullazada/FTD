import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { communityApi } from '@/features/community/api/communityApi';
import type { CommunityGroup, Condition, GroupMember } from '@/types';

interface UseMemberManagementOptions {
  audienceFilter: 'all' | Condition;
  onCohortCreated?: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export const useMemberManagement = ({
  audienceFilter,
  onCohortCreated,
  setActionSuccessNotice,
}: UseMemberManagementOptions) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reassigningUser, setReassigningUser] = useState<GroupMember | null>(null);
  const [targetNewGroupId, setTargetNewGroupId] = useState('');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRegion, setNewGroupRegion] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

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

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!newGroupName.trim() || isSubmittingGroup) return;

    setIsSubmittingGroup(true);
    try {
      const slug = newGroupName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await communityApi.createCohort({
        name: newGroupName.trim(),
        slug,
        description: newGroupDescription.trim() || `Local group for ${newGroupRegion.trim() || newGroupName.trim()} caregivers.`,
        geographicRegion: newGroupRegion.trim() || 'Local Area',
        radiusMiles: 35,
        tag: 'GEO_CUSTOM',
      });

      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupRegion('');
      setNewGroupDescription('');
      setActionSuccessNotice(`Group "${newGroupName}" created.`);
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onCohortCreated?.();
      loadMembers();
    } catch (error) {
      console.error('Failed to create group:', error);
      setActionSuccessNotice('Could not create group. Please check inputs and try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = searchMemberQuery.toLowerCase();
    const matchesSearch =
      member.realName.toLowerCase().includes(query) ||
      member.anonymousHandle.toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query) ||
      (member.phone || '').toLowerCase().includes(query);
    const matchesGroup =
      selectedCohortFilter === 'all' || member.primaryGroupId === selectedCohortFilter;
    const matchesCondition = audienceFilter === 'all' || member.condition === audienceFilter;
    return matchesSearch && matchesGroup && matchesCondition;
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
    showCreateGroupModal,
    setShowCreateGroupModal,
    newGroupName,
    setNewGroupName,
    newGroupRegion,
    setNewGroupRegion,
    newGroupDescription,
    setNewGroupDescription,
    isSubmittingGroup,
    loadMembers,
    handleConfirmReassign,
    handleCreateGroup,
  };
};
