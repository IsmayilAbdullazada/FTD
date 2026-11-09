import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { communityApi } from '@/features/community/api/communityApi';

interface UseCreateCohortFormOptions {
  loadMembers: () => Promise<void>;
  onCohortCreated?: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export function useCreateCohortForm({
  loadMembers,
  onCohortCreated,
  setActionSuccessNotice,
}: UseCreateCohortFormOptions) {
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRegion, setNewGroupRegion] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

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

  return {
    showCreateGroupModal,
    setShowCreateGroupModal,
    newGroupName,
    setNewGroupName,
    newGroupRegion,
    setNewGroupRegion,
    newGroupDescription,
    setNewGroupDescription,
    isSubmittingGroup,
    handleCreateGroup,
  };
}
