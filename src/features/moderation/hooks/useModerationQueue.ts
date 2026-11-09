import { useState, type Dispatch, type SetStateAction } from 'react';
import { communityApi } from '@/features/community/api/communityApi';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { usePagination } from '@/shared/hooks/usePagination';
import {
  filterQueueByAudience,
  sanitizePersonalInfo,
} from '@/features/moderation/lib/moderationQueue';
import type {
  Audience,
  CommunityGroup,
  Condition,
  CurrentUser,
  QueueItem,
  RejectionReason,
} from '@/types';

interface UseModerationQueueOptions {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  audienceFilter: 'all' | Condition;
  onQueueUpdated: () => void;
  onPublishedPostsChanged: () => Promise<void>;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export function useModerationQueue({
  currentUser,
  cohorts,
  audienceFilter,
  onQueueUpdated,
  onPublishedPostsChanged,
  setActionSuccessNotice,
}: UseModerationQueueOptions) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [approveAudience, setApproveAudience] = useState<Audience>('FTD');
  const [sanitizedDraft, setSanitizedDraft] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [allowUnmoderatedReplies, setAllowUnmoderatedReplies] = useState(false);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionCode, setRejectionCode] = useState<RejectionReason>('CLINICAL_MEDICATION_QUERY');
  const [customRejectionText, setCustomRejectionText] = useState('');
  const [showPrivateReplyModal, setShowPrivateReplyModal] = useState(false);
  const [privateReplyMessage, setPrivateReplyMessage] = useState('');
  const [privateReplyAction, setPrivateReplyAction] = useState<'KEEP_PENDING' | 'PUBLISH'>('KEEP_PENDING');
  const [isSendingPrivateReply, setIsSendingPrivateReply] = useState(false);

  const activeItem = queueItems[selectedIndex] || null;
  const queuePage = usePagination(queueItems, 6, audienceFilter);

  const initItemState = (item: QueueItem) => {
    setApproveAudience(item.condition ?? 'FTD');
    setSanitizedDraft(item.sanitizedContent || item.rawContent);
    setSelectedGroupIds(
      item.assignedGroupIds && item.assignedGroupIds.length > 0
        ? item.assignedGroupIds
        : cohorts.slice(0, 1).map((cohort) => cohort.id)
    );
    setAllowUnmoderatedReplies(item.allowUnmoderatedReplies ?? false);
    setModeratorNotes('');
  };

  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const [queueResponse, members] = await Promise.all([
        moderationApi.getModerationQueue(),
        communityApi.getGroupMembers(),
      ]);

      const filteredItems = filterQueueByAudience(
        queueResponse.items || [],
        members,
        audienceFilter,
      );

      setQueueItems(filteredItems);
      const page = Math.min(
        queuePage.page,
        Math.max(1, Math.ceil(filteredItems.length / queuePage.pageSize))
      );
      const index = (page - 1) * queuePage.pageSize;
      setSelectedIndex(index);
      if (filteredItems.length > 0) initItemState(filteredItems[index]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSelectItem = (index: number) => {
    setSelectedIndex(index);
    initItemState(queueItems[index]);
  };

  const handlePublish = async () => {
    if (!activeItem) return;
    try {
      const response = await moderationApi.performModerationAction({
        entityId: activeItem.id,
        entityType: activeItem.type,
        action: 'APPROVE',
        assignedGroupIds: selectedGroupIds,
        condition: approveAudience,
        sanitizedContent: sanitizedDraft,
        allowUnmoderatedReplies,
        moderatorNotes,
      });
      setActionSuccessNotice(response.message || 'Post published.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
      onQueueUpdated();
      await loadQueue();
      await onPublishedPostsChanged();
    } catch (error) {
      console.error('Failed to publish:', error);
      setActionSuccessNotice('Error publishing post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeItem) return;
    try {
      const response = await moderationApi.performModerationAction({
        entityId: activeItem.id,
        entityType: activeItem.type,
        action: 'REJECT',
        rejectionCode,
        rejectionMessage:
          customRejectionText.trim() ||
          `Your ${activeItem.type === 'COMMENT' ? 'reply' : 'post'} could not be shared publicly. Please review the moderator feedback.`,
        moderatorNotes,
      });
      setShowRejectModal(false);
      setCustomRejectionText('');
      setActionSuccessNotice(response.message || 'Post rejected.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
      onQueueUpdated();
      await loadQueue();
    } catch (error) {
      console.error('Failed to reject:', error);
      setActionSuccessNotice('Error rejecting post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  const handleSendPrivateReply = async () => {
    if (!activeItem || !privateReplyMessage.trim() || isSendingPrivateReply) return;
    setIsSendingPrivateReply(true);
    try {
      const response = await moderationApi.sendPostPrivateNote(activeItem.id, {
        message: privateReplyMessage.trim(),
        action: privateReplyAction,
        senderId: currentUser.id,
      });
      setShowPrivateReplyModal(false);
      setPrivateReplyMessage('');
      setActionSuccessNotice(response.message || 'Private message sent to care partner.');
      setTimeout(() => setActionSuccessNotice(null), 3500);

      const addedNote = response.note || {
        id: `pnote-${Date.now()}`,
        senderId: currentUser.id,
        senderName: 'Clinical Moderator',
        senderRole: 'CLINICIAN_MODERATOR' as const,
        message: privateReplyMessage.trim(),
        createdAt: new Date().toISOString(),
      };
      setQueueItems((previous) =>
        previous.map((item) =>
          item.id === activeItem.id
            ? { ...item, moderatorPrivateNotes: [...(item.moderatorPrivateNotes || []), addedNote] }
            : item
        )
      );
      onQueueUpdated();
      await loadQueue();
      if (privateReplyAction === 'PUBLISH') await onPublishedPostsChanged();
    } catch (error) {
      console.error('Failed to send private reply:', error);
      setActionSuccessNotice(
        error instanceof Error ? error.message : 'Error sending private message.'
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsSendingPrivateReply(false);
    }
  };

  const handleCleanPersonalInfo = () => {
    if (!activeItem) return;
    const source = sanitizedDraft.trim().length > 0
      ? sanitizedDraft
      : activeItem.rawContent;
    const cleaned = sanitizePersonalInfo(source, activeItem.phiAlerts);
    setSanitizedDraft(cleaned);
    setActionSuccessNotice('Personal details removed from draft.');
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  const changeQueuePage = (page: number) => {
    queuePage.setPage(page);
    const index = (page - 1) * queuePage.pageSize;
    setSelectedIndex(index);
    if (queueItems[index]) initItemState(queueItems[index]);
  };

  return {
    queueItems,
    loadingQueue,
    selectedIndex,
    activeItem,
    queuePage,
    approveAudience,
    setApproveAudience,
    sanitizedDraft,
    setSanitizedDraft,
    selectedGroupIds,
    setSelectedGroupIds,
    allowUnmoderatedReplies,
    setAllowUnmoderatedReplies,
    moderatorNotes,
    setModeratorNotes,
    showRejectModal,
    setShowRejectModal,
    rejectionCode,
    setRejectionCode,
    customRejectionText,
    setCustomRejectionText,
    showPrivateReplyModal,
    setShowPrivateReplyModal,
    privateReplyMessage,
    setPrivateReplyMessage,
    privateReplyAction,
    setPrivateReplyAction,
    isSendingPrivateReply,
    loadQueue,
    handleSelectItem,
    handlePublish,
    handleConfirmReject,
    handleSendPrivateReply,
    handleCleanPersonalInfo,
    changeQueuePage,
  };
}
