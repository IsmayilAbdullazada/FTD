import React, { useState, useEffect, useRef } from 'react';
import {
  CurrentUser,
  Condition,
  CommunityGroup,
} from '@/types';
import { usePagination } from '@/shared/hooks/usePagination';
import { useGuideManagement } from '@/features/knowledge/hooks/useGuideManagement';
import { useMemberManagement } from '@/features/community/hooks/useMemberManagement';
import { useDiscussionManagement } from '@/features/discussions/hooks/useDiscussionManagement';
import { useCreatePostForm } from '@/features/discussions/hooks/useCreatePostForm';
import { useCreateCohortForm } from '@/features/community/hooks/useCreateCohortForm';
import { GuideManagementTab } from '@/features/knowledge/components/GuideManagementTab';
import { GuideUploadDialog } from '@/features/knowledge/components/GuideUploadDialog';
import { GuideInspectorDialog } from '@/features/knowledge/components/GuideInspectorDialog';
import { DeleteGuideDialog } from '@/features/knowledge/components/DeleteGuideDialog';
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
  onQueueUpdated: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
  onCohortCreated?: () => void;
  onOpenDiscussion?: (postId: string) => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  currentUser,
  cohorts,
  onQueueUpdated,
  onOpenInvite,
  onOpenAudit,
  onCohortCreated,
  onOpenDiscussion,
}) => {
  const [activeTab, setActiveTab] = useState<ClinicianDashboardTab>('queue');
  const [audienceFilter, setAudienceFilter] = useState<'all' | Condition>('all');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const {
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

  const {
    chatbotGuides,
    loadingGuides,
    guideSearchFilter,
    setGuideSearchFilter,
    showUploadGuideModal,
    setShowUploadGuideModal,
    inspectGuideModal,
    setInspectGuideModal,
    guideToDelete,
    setGuideToDelete,
    isDeletingGuide,
    guideStatusFilter,
    setGuideStatusFilter,
    uploadTitle,
    setUploadTitle,
    uploadCondition,
    setUploadCondition,
    uploadTopicTag,
    setUploadTopicTag,
    uploadFileName,
    uploadPages,
    showExtractedInspector,
    setShowExtractedInspector,
    selectedInspectPage,
    setSelectedInspectPage,
    showMoreOptions,
    setShowMoreOptions,
    showTechDetails,
    setShowTechDetails,
    uploadPdfPreviewUrl,
    editingGuideId,
    isUploadingGuide,
    isExtractingPdf,
    extractedPdfStats,
    dragActive,
    fileInputRef,
    testQuery,
    setTestQuery,
    isTesting,
    testResult,
    copiedInspect,
    setCopiedInspect,
    filteredGuides,
    handleDrag,
    handleDrop,
    loadChatbotGuides,
    handleToggleGuide,
    handleRequestDeleteGuide,
    handleConfirmDeleteGuide,
    resetUploadModal,
    handleOpenReviewModal,
    handleQuickApprove,
    handleLoadResourceFile,
    handleProcessFile,
    handleSaveGuide,
    handleRunTestQuery,
  } = useGuideManagement({
    currentUser,
    onQueueUpdated,
    setActionSuccessNotice,
  });

  useEffect(() => {
    loadQueue();
    loadMembers();
    loadPublishedPosts();
    loadChatbotGuides();
  }, [audienceFilter]);

  const previousTab = useRef(activeTab);
  useEffect(() => {
    if (activeTab === 'queue' && previousTab.current !== 'queue') loadQueue();
    previousTab.current = activeTab;
  }, [activeTab]);

  const discussionPage = usePagination(filteredDiscussions, 10, JSON.stringify([audienceFilter, postsPolicyFilter, searchPostsQuery]));
  const groupPage = usePagination(cohorts, 12);
  const memberPage = usePagination(filteredMembers, 15, JSON.stringify([audienceFilter, selectedCohortFilter, searchMemberQuery]));
  const guidePage = usePagination(filteredGuides, 10, JSON.stringify([guideStatusFilter, guideSearchFilter]));

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
        pendingCount={queueItems.length}
        discussionCount={publishedPosts.length}
        activeGuideCount={chatbotGuides.filter((guide) => guide.isActive).length}
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
        <GuideManagementTab
          guides={chatbotGuides}
          loading={loadingGuides}
          searchFilter={guideSearchFilter}
          onSearchFilterChange={setGuideSearchFilter}
          statusFilter={guideStatusFilter}
          onStatusFilterChange={setGuideStatusFilter}
          pagination={guidePage}
          testQuery={testQuery}
          onTestQueryChange={setTestQuery}
          testing={isTesting}
          testResult={testResult}
          onOpenUpload={setShowUploadGuideModal}
          onResetUpload={resetUploadModal}
          onOpenReview={handleOpenReviewModal}
          onQuickApprove={handleQuickApprove}
          onToggleGuide={handleToggleGuide}
          onRequestDelete={handleRequestDeleteGuide}
          onRunTestQuery={handleRunTestQuery}
        />
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

      <GuideUploadDialog
        open={showUploadGuideModal}
        onClose={resetUploadModal}
        title={uploadTitle}
        onTitleChange={setUploadTitle}
        condition={uploadCondition}
        onConditionChange={setUploadCondition}
        topicTag={uploadTopicTag}
        onTopicTagChange={setUploadTopicTag}
        fileName={uploadFileName}
        pages={uploadPages}
        showExtractedInspector={showExtractedInspector}
        onShowExtractedInspectorChange={setShowExtractedInspector}
        selectedInspectPage={selectedInspectPage}
        onSelectedInspectPageChange={setSelectedInspectPage}
        showMoreOptions={showMoreOptions}
        onShowMoreOptionsChange={setShowMoreOptions}
        showTechDetails={showTechDetails}
        onShowTechDetailsChange={setShowTechDetails}
        pdfPreviewUrl={uploadPdfPreviewUrl}
        editingGuideId={editingGuideId}
        uploading={isUploadingGuide}
        extractingPdf={isExtractingPdf}
        extractedPdfStats={extractedPdfStats}
        dragActive={dragActive}
        fileInputRef={fileInputRef}
        onDrag={handleDrag}
        onDrop={handleDrop}
        onLoadResourceFile={handleLoadResourceFile}
        onProcessFile={handleProcessFile}
        onSave={handleSaveGuide}
      />
      <GuideInspectorDialog
        guide={inspectGuideModal}
        onGuideChange={setInspectGuideModal}
        copied={copiedInspect}
        onCopiedChange={setCopiedInspect}
        onToggleGuide={handleToggleGuide}
        onRequestDelete={handleRequestDeleteGuide}
      />
      <DeleteGuideDialog
        guide={guideToDelete}
        deleting={isDeletingGuide}
        onGuideChange={setGuideToDelete}
        onConfirm={handleConfirmDeleteGuide}
      />
    </div>
  );
};

