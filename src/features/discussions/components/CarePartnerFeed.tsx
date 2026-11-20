import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  X,
} from 'lucide-react';
import React from 'react';
import { DiscussionDetail } from './DiscussionDetail';
import { FeedFilters } from './FeedFilters';
import { FeedPostDialogs } from './FeedPostDialogs';
import { FeedPostList } from './FeedPostList';

import {
  useCarePartnerFeed,
  type CarePartnerFeedProps,
} from '../hooks/useCarePartnerFeed';

export const CarePartnerFeed: React.FC<CarePartnerFeedProps> = ({
  currentUser,
  cohorts,
  resetKey,
  targetDiscussionId,
  onClearTargetDiscussion,
  recentNotice,
  onDismissNotice,
  onOpenComposer,
  initialSection,
  onSectionChange,
}) => {
  const {
    totalPosts,
    posts,
    setPosts,
    loading,
    viewSection,
    selectedGroupTab,
    setSelectedGroupTab,
    selectedStatusFilter,
    setSelectedStatusFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    POSTS_PER_PAGE,
    likedPosts,
    selectedPost,
    setSelectedPost,
    handleSectionChange,
    isStaff,
    isCarePartner,
    selectedCondition,
    setSelectedCondition,
    isFilterMenuOpen,
    setIsFilterMenuOpen,
    filterPopoverRef,
    editingPost,
    setEditingPost,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editCohortId,
    setEditCohortId,
    isSavingEdit,
    actionNotice,
    setActionNotice,
    confirmDeletePost,
    setConfirmDeletePost,
    isDeletingPost,
    carePartnerReplyText,
    setCarePartnerReplyText,
    isSendingCareReply,
    careReplyExpanded,
    setCareReplyExpanded,
    handleOpenDiscussion,
    handleBackToFeed,
    handleToggleLike,
    handleStartEdit,
    handleSaveEdit,
    handleConfirmWithdraw,
    handleSendPrivateCareReply,
  } = useCarePartnerFeed({
    currentUser,
    cohorts,
    resetKey,
    targetDiscussionId,
    onClearTargetDiscussion,
    recentNotice,
    onDismissNotice,
    onOpenComposer,
    initialSection,
    onSectionChange,
  });

  // If a post is selected, render the dedicated Discussion Detail page
  if (selectedPost) {
    return (
      <DiscussionDetail
        post={selectedPost}
        currentUser={currentUser}
        onBack={handleBackToFeed}
        onPostUpdated={(updatedPost) => {
          setSelectedPost(updatedPost);
          setPosts((prev) =>
            prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
          );
        }}
      />
    );
  }

  const myPosts = posts.filter(
    (p) =>
      p.author.userId === currentUser.id ||
      p.author.anonymousHandle === currentUser.anonymousHandle ||
      false,
  );
  const myPendingCount = myPosts.filter(
    (p) => p.status === 'PENDING_MODERATION',
  ).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* FLOATING TOP CONFIRMATION BANNER (Always on top of viewport, regardless of scroll) */}
      {(actionNotice || recentNotice) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium leading-snug text-slate-100">
                {actionNotice || recentNotice}
              </span>
            </div>
            <button
              onClick={() => {
                setActionNotice(null);
                if (onDismissNotice) onDismissNotice();
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* "ASK QUESTION" PROMPT (Desktop/Tablet only; on mobile, the prominent '+' button is in the center of the bottom navigation tray) */}
      <div className="hidden md:flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 items-center justify-between gap-3 sm:gap-4 shadow-xs transition-colors">
        <button
          onClick={onOpenComposer}
          className="flex-1 text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs sm:text-base bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition border border-slate-200/60 dark:border-slate-700 font-sans truncate cursor-pointer"
        >
          <span>
            Ask a question or share practical care advice with other
            caregivers...
          </span>
        </button>
        <button
          onClick={onOpenComposer}
          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition shrink-0 shadow-xs whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* REASSURING BANNER: For caregivers with posts under review */}
      {isCarePartner && myPendingCount > 0 && viewSection === 'all' && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
              You have {myPendingCount} post{myPendingCount > 1 ? 's' : ''}{' '}
              currently under review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSectionChange('my-posts')}
            className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>View My Posts</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MY POSTS DEDICATED HEADER */}
      {viewSection === 'my-posts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSectionChange('all')}
              className="text-xs sm:text-sm font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Discussions</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              {totalPosts} Total {totalPosts === 1 ? 'Post' : 'Posts'}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif font-semibold text-xl sm:text-2xl text-slate-900 dark:text-white">
              My Posts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {isCarePartner
                ? 'View and track all your submitted posts, review real-time moderation status, read private notes from the moderator, and edit or cancel anytime.'
                : 'View and manage the community discussions you have posted.'}
            </p>
          </div>
        </div>
      )}

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      <FeedFilters
        posts={posts}
        viewSection={viewSection}
        selectedGroupTab={selectedGroupTab}
        setSelectedGroupTab={setSelectedGroupTab}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentPage={setCurrentPage}
        isStaff={isStaff}
        selectedCondition={selectedCondition}
        setSelectedCondition={setSelectedCondition}
        isFilterMenuOpen={isFilterMenuOpen}
        setIsFilterMenuOpen={setIsFilterMenuOpen}
        filterPopoverRef={filterPopoverRef}
        cohorts={cohorts}
      />
      <FeedPostList
        totalPosts={totalPosts}
        posts={posts}
        loading={loading}
        viewSection={viewSection}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        POSTS_PER_PAGE={POSTS_PER_PAGE}
        likedPosts={likedPosts}
        isStaff={isStaff}
        setConfirmDeletePost={setConfirmDeletePost}
        carePartnerReplyText={carePartnerReplyText}
        setCarePartnerReplyText={setCarePartnerReplyText}
        isSendingCareReply={isSendingCareReply}
        careReplyExpanded={careReplyExpanded}
        setCareReplyExpanded={setCareReplyExpanded}
        handleOpenDiscussion={handleOpenDiscussion}
        handleToggleLike={handleToggleLike}
        handleStartEdit={handleStartEdit}
        handleSendPrivateCareReply={handleSendPrivateCareReply}
        currentUser={currentUser}
        onOpenComposer={onOpenComposer}
      />
      <FeedPostDialogs
        editingPost={editingPost}
        setEditingPost={setEditingPost}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editContent={editContent}
        setEditContent={setEditContent}
        editCohortId={editCohortId}
        setEditCohortId={setEditCohortId}
        isSavingEdit={isSavingEdit}
        confirmDeletePost={confirmDeletePost}
        setConfirmDeletePost={setConfirmDeletePost}
        isDeletingPost={isDeletingPost}
        handleSaveEdit={handleSaveEdit}
        handleConfirmWithdraw={handleConfirmWithdraw}
        cohorts={cohorts}
      />
    </div>
  );
};
