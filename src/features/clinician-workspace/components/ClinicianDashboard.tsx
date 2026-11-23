import { KnowledgeBaseExplorer } from '@/features/knowledge/components/KnowledgeBaseExplorer';
import { useEffectEvent } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { CurrentUser, Condition, CommunityGroup } from '@/types';
import { usePagination } from '@/shared/hooks/usePagination';
import { useGuideManagement } from '@/features/knowledge/hooks/useGuideManagement';
import { useMemberManagement } from '@/features/community/hooks/useMemberManagement';
import { useDiscussionManagement } from '@/features/discussions/hooks/useDiscussionManagement';
import { useCreatePostForm } from '@/features/discussions/hooks/useCreatePostForm';
import { useCreateCohortForm } from '@/features/community/hooks/useCreateCohortForm';
import { CohortsTab } from '@/features/community/components/CohortsTab';
import { MembersTab } from '@/features/community/components/MembersTab';
import { DiscussionsTab } from '@/features/discussions/components/DiscussionsTab';
import { CloseDiscussionDialog } from '@/features/discussions/components/CloseDiscussionDialog';
import { CreatePostDialog } from '@/features/discussions/components/CreatePostDialog';
import { useModerationQueue } from '@/features/moderation/hooks/useModerationQueue';
import { ReviewQueuePanel } from '@/features/moderation/components/ReviewQueuePanel';
import { RejectPostDialog } from '@/features/moderation/components/RejectPostDialog';
import { PrivateReplyDialog } from '@/features/moderation/components/PrivateReplyDialog';
import { CreateCohortDialog } from '@/features/community/components/CreateCohortDialog';
import { ReassignMemberDialog } from '@/features/community/components/ReassignMemberDialog';
import { DashboardHeader } from '@/features/clinician-workspace/components/DashboardHeader';
import { DashboardNavigation } from '@/features/clinician-workspace/components/DashboardNavigation';
import type { ClinicianDashboardTab } from '@/features/clinician-workspace/types';

interface ClinicianDashboardProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  initialQueue?: { items: import('@/types').QueueItem[]; totalPending: number };
  activeTab?: ClinicianDashboardTab;
  onTabChange?: (tab: ClinicianDashboardTab) => void;
  onQueueUpdated: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
  onCohortCreated?: () => void;
  onOpenDiscussion?: (postId: string) => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  currentUser,
  cohorts,
  initialQueue,
  activeTab: controlledTab,
  onTabChange,
  onQueueUpdated,
  onOpenInvite,
  onOpenAudit,
  onCohortCreated,
  onOpenDiscussion,
}) => {
  const [internalTab, setInternalTab] =
    useState<ClinicianDashboardTab>('queue');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: ClinicianDashboardTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [audienceFilter, setAudienceFilter] = useState<'all' | Condition>(
    'all',
  );
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(
    null,
  );

  const {
    discussionPage,
    publishedPosts,
    filteredDiscussions,
    loadingPosts,
    searchPostsQuery,
    setSearchPostsQuery,
    postsPolicyFilter,
    setPostsPolicyFilter,
    postToClose,
    setPostToClose,
    isTogglingClose,
    loadPublishedPosts,
    handleTogglePostRepliesMode,
    handleTogglePostClose,
  } = useDiscussionManagement({
    currentUser,
    audienceFilter,
    onQueueUpdated,
    setActionSuccessNotice,
  });

  const {
    showNewPostModal,
    setShowNewPostModal,
    npTitle,
    setNpTitle,
    npContent,
    setNpContent,
    npGroupId,
    setNpGroupId,
    npAudience,
    setNpAudience,
    isSubmittingPost,
    handleCreatePost,
  } = useCreatePostForm({
    currentUser,
    loadPublishedPosts,
    onAudienceReset: () => setAudienceFilter('all'),
    onPostCreated: () => setActiveTab('discussions'),
    setActionSuccessNotice,
  });

  const {
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
  } = useModerationQueue({
    initialQueue,
    currentUser,
    cohorts,
    audienceFilter,
    onQueueUpdated,
    onPublishedPostsChanged: loadPublishedPosts,
    setActionSuccessNotice,
  });

  const {
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
  } = useMemberManagement({
    audienceFilter,
    setActionSuccessNotice,
    onReassigned: onCohortCreated,
  });

  const {
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
  } = useCreateCohortForm({
    loadMembers,
    onCohortCreated,
    setActionSuccessNotice,
  });

  const { chatbotGuides, loadChatbotGuides } = useGuideManagement({
    currentUser,
    onQueueUpdated,
    setActionSuccessNotice,
  });

  const refreshAudience = useEffectEvent(() => {
    loadMembers();
    loadChatbotGuides();
  });
  const refreshQueue = useEffectEvent(() => loadQueue());
  useEffect(() => {
    refreshAudience();
  }, [audienceFilter]);

  const previousTab = useRef(activeTab);
  useEffect(() => {
    if (activeTab === 'queue' && previousTab.current !== 'queue')
      refreshQueue();
    previousTab.current = activeTab;
  }, [activeTab]);

  const groupPage = usePagination(cohorts, 12);
  const memberPage = usePagination(
    filteredMembers,
    15,
    JSON.stringify([audienceFilter, selectedCohortFilter, searchMemberQuery]),
  );

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 space-y-4 sm:space-y-5 transition-colors">
      <DashboardHeader
        audienceFilter={audienceFilter}
        actionSuccessNotice={actionSuccessNotice}
        onAudienceFilterChange={setAudienceFilter}
        onCreatePost={() => setShowNewPostModal(true)}
        onCreateCohort={() => setShowCreateGroupModal(true)}
        onOpenInvite={onOpenInvite}
        onOpenAudit={onOpenAudit}
        onDismissNotice={() => setActionSuccessNotice(null)}
      />
      <DashboardNavigation
        activeTab={activeTab}
        pendingCount={queuePage.total}
        discussionCount={discussionPage.total}
        activeGuideCount={
          chatbotGuides.filter(
            (guide) => guide.isActive && guide.status === 'APPROVED',
          ).length
        }
        guideCount={chatbotGuides.length}
        cohortCount={cohorts.length}
        memberCount={members.length}
        onTabChange={setActiveTab}
      />

      {/* TAB 1: PENDING POSTS */}
      {activeTab === 'queue' && (
        <ReviewQueuePanel
          queueItems={queueItems}
          loadingQueue={loadingQueue}
          selectedIndex={selectedIndex}
          activeItem={activeItem}
          queuePage={queuePage}
          cohorts={cohorts}
          approveAudience={approveAudience}
          sanitizedDraft={sanitizedDraft}
          selectedGroupIds={selectedGroupIds}
          allowUnmoderatedReplies={allowUnmoderatedReplies}
          onRefresh={() => {
            loadQueue();
            onQueueUpdated();
          }}
          onSelectItem={handleSelectItem}
          onQueuePageChange={changeQueuePage}
          onApproveAudienceChange={setApproveAudience}
          onSanitizedDraftChange={setSanitizedDraft}
          onSelectedGroupIdsChange={setSelectedGroupIds}
          onAllowUnmoderatedRepliesChange={setAllowUnmoderatedReplies}
          onCleanPersonalInfo={handleCleanPersonalInfo}
          onPublish={handlePublish}
          onOpenPrivateReply={() => setShowPrivateReplyModal(true)}
          onOpenReject={() => setShowRejectModal(true)}
        />
      )}

      {/* TAB: DISCUSSIONS & REPLY POLICIES */}
      {activeTab === 'discussions' && (
        <DiscussionsTab
          publishedPosts={publishedPosts}
          filteredDiscussions={filteredDiscussions}
          loadingPosts={loadingPosts}
          searchPostsQuery={searchPostsQuery}
          postsPolicyFilter={postsPolicyFilter}
          discussionPage={discussionPage}
          setSearchPostsQuery={setSearchPostsQuery}
          setPostsPolicyFilter={setPostsPolicyFilter}
          setPostToClose={setPostToClose}
          handleTogglePostRepliesMode={handleTogglePostRepliesMode}
          handleTogglePostClose={handleTogglePostClose}
          onOpenDiscussion={onOpenDiscussion}
        />
      )}

      {/* TAB: GROUPS */}
      {activeTab === 'cohorts' && (
        <CohortsTab
          cohorts={cohorts}
          members={members}
          pagination={groupPage}
          onCreateGroup={() => setShowCreateGroupModal(true)}
          onSelectCohort={(cohortId) => {
            setSelectedCohortFilter(cohortId);
            setActiveTab('members');
          }}
        />
      )}

      {/* TAB 3: MEMBERS */}
      {activeTab === 'members' && (
        <MembersTab
          cohorts={cohorts}
          filteredMembers={filteredMembers}
          selectedCohortFilter={selectedCohortFilter}
          searchMemberQuery={searchMemberQuery}
          loadingMembers={loadingMembers}
          pagination={memberPage}
          onCohortFilterChange={setSelectedCohortFilter}
          onSearchChange={setSearchMemberQuery}
          onReassign={(member) => {
            setReassigningUser(member);
            setTargetNewGroupId(member.primaryGroupId);
          }}
        />
      )}

      {/* TAB 5: CHATBOT KNOWLEDGE MANAGEMENT */}
      {activeTab === 'chatbot-knowledge' && (
        <KnowledgeBaseExplorer currentUser={currentUser} />
      )}

      <CreateCohortDialog
        open={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        name={newGroupName}
        onNameChange={setNewGroupName}
        region={newGroupRegion}
        onRegionChange={setNewGroupRegion}
        description={newGroupDescription}
        onDescriptionChange={setNewGroupDescription}
        submitting={isSubmittingGroup}
        onSubmit={handleCreateGroup}
      />
      <ReassignMemberDialog
        member={reassigningUser}
        onMemberChange={setReassigningUser}
        targetGroupId={targetNewGroupId}
        onTargetGroupChange={setTargetNewGroupId}
        cohorts={cohorts}
        onConfirm={handleConfirmReassign}
      />

      <RejectPostDialog
        open={showRejectModal}
        item={activeItem}
        onOpenChange={setShowRejectModal}
        rejectionCode={rejectionCode}
        onRejectionCodeChange={setRejectionCode}
        rejectionText={customRejectionText}
        onRejectionTextChange={setCustomRejectionText}
        onConfirm={handleConfirmReject}
      />
      <PrivateReplyDialog
        open={showPrivateReplyModal}
        item={activeItem}
        sending={isSendingPrivateReply}
        message={privateReplyMessage}
        action={privateReplyAction}
        onOpenChange={setShowPrivateReplyModal}
        onMessageChange={setPrivateReplyMessage}
        onActionChange={setPrivateReplyAction}
        onSend={handleSendPrivateReply}
      />
      <CloseDiscussionDialog
        post={postToClose}
        closing={isTogglingClose}
        onPostChange={setPostToClose}
        onConfirm={handleTogglePostClose}
      />
      <CreatePostDialog
        open={showNewPostModal}
        onOpenChange={setShowNewPostModal}
        title={npTitle}
        onTitleChange={setNpTitle}
        content={npContent}
        onContentChange={setNpContent}
        groupId={npGroupId}
        onGroupIdChange={setNpGroupId}
        audience={npAudience}
        onAudienceChange={setNpAudience}
        submitting={isSubmittingPost}
        cohorts={cohorts}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};
