import { AudienceBadge } from "@/shared/components/AudienceBadge";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Heart,
  Lock,
  LockOpen,
  MessageSquare,
  Pencil,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import React from "react";
import { DiscussionActionDialogs } from "./DiscussionActionDialogs";
import { DiscussionReplies } from "./DiscussionReplies";

import {
  useDiscussionDetail,
  type DiscussionDetailProps,
} from "../hooks/useDiscussionDetail";

export const DiscussionDetail: React.FC<DiscussionDetailProps> = ({
  post: initialPost,
  currentUser,
  onBack,
  onPostUpdated,
}) => {
  const {
    post,
    setPost,
    comments,
    setComments,
    loadingComments,
    setLoadingComments,
    replyText,
    setReplyText,
    replyTarget,
    setReplyTarget,
    collapsedThreads,
    setCollapsedThreads,
    isSubmitting,
    setIsSubmitting,
    isLiked,
    setIsLiked,
    replySuccessMessage,
    setReplySuccessMessage,
    replyErrorMessage,
    setReplyErrorMessage,
    showConfirmCloseModal,
    setShowConfirmCloseModal,
    isTogglingClose,
    setIsTogglingClose,
    isEditingMainPost,
    setIsEditingMainPost,
    mainPostTitle,
    setMainPostTitle,
    mainPostContent,
    setMainPostContent,
    isSavingMainPost,
    setIsSavingMainPost,
    showWithdrawPostModal,
    setShowWithdrawPostModal,
    isWithdrawingPost,
    setIsWithdrawingPost,
    editingCommentId,
    setEditingCommentId,
    editCommentText,
    setEditCommentText,
    isSavingComment,
    setIsSavingComment,
    deletingCommentId,
    setDeletingCommentId,
    commentToDelete,
    setCommentToDelete,
    carePrivateReplyText,
    setCarePrivateReplyText,
    isSendingCarePrivateReply,
    setIsSendingCarePrivateReply,
    showCarePrivateReplyBox,
    setShowCarePrivateReplyBox,
    replyFormRef,
    isClinician,
    isMainPostPending,
    isMainPostAuthor,
    regionName,
    currentLikes,
    loadComments,
    handleSaveMainPost,
    handleConfirmWithdrawPost,
    handleStartEditComment,
    handleSaveComment,
    handleDeleteComment,
    handleSendCarePrivateReply,
    handleToggleRepliesModeration,
    handleOpenRemoveReplyModal,
    handleConfirmModeratorRemoveReply,
    handleToggleCloseDiscussion,
    handleSendReply,
    handleToggleLike,
  } = useDiscussionDetail({
    post: initialPost,
    currentUser,
    onBack,
    onPostUpdated,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* FLOATING TOP CONFIRMATION BANNER (Always on top of viewport, regardless of scroll) */}
      {replySuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium leading-snug text-slate-100">
                {replySuccessMessage}
              </span>
            </div>
            <button
              onClick={() => setReplySuccessMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0 min-w-9 min-h-9 flex items-center justify-center cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <button
          onClick={onBack}
          className="min-h-11 px-3 py-2 -ml-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>

        {regionName && (
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {regionName}
          </span>
        )}
      </div>

      {/* Clinician Moderator Reply Policy & Discussion Close Banner */}
      {isClinician && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Moderator Controls
            </span>
            {post.isClosed ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                <Lock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Discussion Closed</span>
              </span>
            ) : post.allowUnmoderatedReplies ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Unmoderated</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 rounded-lg">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Moderated</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Allow open replies toggle (when discussion is open) */}
            {!post.isClosed && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    Allow open replies
                  </span>
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={post.allowUnmoderatedReplies}
                      onChange={handleToggleRepliesModeration}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>
              </div>
            )}

            {/* Moderator Close / Reopen Discussion Button */}
            {post.isClosed ? (
              <button
                type="button"
                disabled={isTogglingClose}
                onClick={handleToggleCloseDiscussion}
                className="min-h-11 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Reopen discussion to allow new replies"
              >
                <LockOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Reopen Discussion</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isTogglingClose}
                onClick={() => setShowConfirmCloseModal(true)}
                className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Close discussion to prevent new replies while preserving existing comments"
              >
                <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Close Discussion</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Discussion Post */}
      <article
        className={`rounded-2xl border p-5 sm:p-7 space-y-4 shadow-xs transition-colors ${
          isMainPostPending
            ? "bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
            : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
        }`}
      >
        {/* Author Metadata */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium min-w-0">
            <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">
              {post.author.anonymousHandle}
            </span>
            {regionName && (
              <>
                <span
                  aria-hidden="true"
                  className="text-slate-300 dark:text-slate-700 shrink-0"
                >
                  ·
                </span>
                <span className="truncate">{regionName}</span>
              </>
            )}
            {isClinician && post.condition && post.condition !== "BOTH" && (
              <>
                <span
                  aria-hidden="true"
                  className="text-slate-300 dark:text-slate-700 shrink-0"
                >
                  ·
                </span>
                <AudienceBadge condition={post.condition} />
              </>
            )}
            {post.isClosed && (
              <>
                <span
                  aria-hidden="true"
                  className="text-slate-300 dark:text-slate-700 shrink-0"
                >
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                  <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Closed</span>
                </span>
              </>
            )}
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm shrink-0 pl-2">
            {new Date(post.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Post Title & Content or Edit Form */}
        {isEditingMainPost ? (
          <form onSubmit={handleSaveMainPost} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Edit Title
              </label>
              <input
                type="text"
                value={mainPostTitle}
                onChange={(e) => setMainPostTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 text-base font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Edit Details
              </label>
              <textarea
                rows={4}
                value={mainPostContent}
                onChange={(e) => setMainPostContent(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed text-base"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingMainPost(false)}
                className="min-h-11 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSavingMainPost ||
                  !mainPostTitle.trim() ||
                  !mainPostContent.trim()
                }
                className="min-h-11 px-5 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                {isSavingMainPost ? "Saving..." : "Save Updates"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
              {post.title}
            </h1>
            <p className="text-base sm:text-[17px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line select-text">
              {post.content}
            </p>
          </>
        )}

        {/* Confidential Moderator Response Box */}
        {post.moderatorPrivateNotes &&
          post.moderatorPrivateNotes.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#002D72] dark:text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-sm font-semibold">
                    Private Response from Moderator
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800">
                  Only visible to you
                </span>
              </div>

              <p className="text-xs text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
                This is a confidential dialogue between you and the moderator
                regarding your post.
              </p>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {post.moderatorPrivateNotes.map((note) => {
                  const isFromCarePartner =
                    note.senderRole !== "CLINICIAN_MODERATOR" &&
                    note.senderName !== "Clinical Moderator" &&
                    note.senderName !== "Moderator" &&
                    note.senderId !== "user-clinician-1" &&
                    note.senderId !== "user-admin-1" &&
                    (note.senderRole === "CARE_PARTNER" ||
                      note.senderId === post.author.userId ||
                      note.senderId === currentUser.id);
                  return (
                    <div
                      key={note.id}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                        isFromCarePartner
                          ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 ml-4 sm:ml-8"
                          : "bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 mr-2 sm:mr-6 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                        <span
                          className={
                            isFromCarePartner
                              ? "text-amber-800 dark:text-amber-300 font-semibold"
                              : "text-[#002D72] dark:text-blue-300 font-semibold"
                          }
                        >
                          {isFromCarePartner
                            ? "You (Care Partner)"
                            : "Moderator"}
                        </span>
                        <span className="text-[11px]">
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-line select-text">
                        {note.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Quick reply back form */}
              <div className="pt-2 border-t border-blue-200/70 dark:border-blue-900/60">
                {!showCarePrivateReplyBox ? (
                  <button
                    type="button"
                    onClick={() => setShowCarePrivateReplyBox(true)}
                    className="text-xs sm:text-sm font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply to Moderator</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleSendCarePrivateReply}
                    className="space-y-2.5 pt-1"
                  >
                    <textarea
                      rows={3}
                      value={carePrivateReplyText}
                      onChange={(e) => setCarePrivateReplyText(e.target.value)}
                      placeholder="Write your private reply to the moderator..."
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCarePrivateReplyBox(false)}
                        disabled={isSendingCarePrivateReply}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !carePrivateReplyText.trim() ||
                          isSendingCarePrivateReply
                        }
                        className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {isSendingCarePrivateReply ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Reply to Moderator</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        {/* Bottom Actions Row: If pending, show Edit & Cancel buttons instead of replies/helpful! */}
        {isMainPostPending ? (
          <div className="pt-4 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>This question is currently awaiting review</span>
            </span>

            {isMainPostAuthor && !isEditingMainPost && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMainPost(true)}
                  className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Edit Question</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawPostModal(true)}
                  className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Cancel Submission</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium text-sm">
              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>
                {comments.length} {comments.length === 1 ? "reply" : "replies"}
              </span>
            </div>

            <button
              onClick={handleToggleLike}
              className={`min-h-11 flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm transition cursor-pointer ${
                isLiked
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Heart
                className={`w-4 h-4 ${isLiked ? "fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400" : ""}`}
              />
              <span>{currentLikes} helpful</span>
            </button>
          </div>
        )}
      </article>

      <DiscussionReplies
        post={post}
        comments={comments}
        loadingComments={loadingComments}
        replyText={replyText}
        setReplyText={setReplyText}
        replyTarget={replyTarget}
        setReplyTarget={setReplyTarget}
        collapsedThreads={collapsedThreads}
        setCollapsedThreads={setCollapsedThreads}
        isSubmitting={isSubmitting}
        replyErrorMessage={replyErrorMessage}
        editingCommentId={editingCommentId}
        setEditingCommentId={setEditingCommentId}
        editCommentText={editCommentText}
        setEditCommentText={setEditCommentText}
        isSavingComment={isSavingComment}
        deletingCommentId={deletingCommentId}
        replyFormRef={replyFormRef}
        isClinician={isClinician}
        handleStartEditComment={handleStartEditComment}
        handleSaveComment={handleSaveComment}
        handleDeleteComment={handleDeleteComment}
        handleOpenRemoveReplyModal={handleOpenRemoveReplyModal}
        handleSendReply={handleSendReply}
        currentUser={currentUser}
      />
      <DiscussionActionDialogs
        post={post}
        comments={comments}
        showConfirmCloseModal={showConfirmCloseModal}
        setShowConfirmCloseModal={setShowConfirmCloseModal}
        isTogglingClose={isTogglingClose}
        showWithdrawPostModal={showWithdrawPostModal}
        setShowWithdrawPostModal={setShowWithdrawPostModal}
        isWithdrawingPost={isWithdrawingPost}
        deletingCommentId={deletingCommentId}
        commentToDelete={commentToDelete}
        setCommentToDelete={setCommentToDelete}
        handleConfirmWithdrawPost={handleConfirmWithdrawPost}
        handleConfirmModeratorRemoveReply={handleConfirmModeratorRemoveReply}
        handleToggleCloseDiscussion={handleToggleCloseDiscussion}
      />
    </div>
  );
};
