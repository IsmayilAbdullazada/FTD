import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Post, Comment, CurrentUser, getProperGroupName } from '../types';
import { api } from '../services/api';

interface DiscussionDetailProps {
  post: Post;
  currentUser: CurrentUser;
  onBack: () => void;
  onPostUpdated?: (updatedPost: Post) => void;
}

export const DiscussionDetail: React.FC<DiscussionDetailProps> = ({
  post: initialPost,
  currentUser,
  onBack,
  onPostUpdated,
}) => {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);
  const [replyErrorMessage, setReplyErrorMessage] = useState<string | null>(null);

  // Main post editing
  const [isEditingMainPost, setIsEditingMainPost] = useState(false);
  const [mainPostTitle, setMainPostTitle] = useState(initialPost.title);
  const [mainPostContent, setMainPostContent] = useState(initialPost.content);
  const [isSavingMainPost, setIsSavingMainPost] = useState(false);
  const [showWithdrawPostModal, setShowWithdrawPostModal] = useState(false);
  const [isWithdrawingPost, setIsWithdrawingPost] = useState(false);

  // Comment editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Moderator reply policy & inappropriate reply removal
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  const replyFormRef = useRef<HTMLFormElement | null>(null);
  const isClinician =
    currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';
  const isMainPostPending = post.status === 'PENDING_MODERATION';
  const isMainPostAuthor =
    !isClinician &&
    (post.author.userId === currentUser.id || post.author.anonymousHandle === currentUser.anonymousHandle);

  const regionName = getProperGroupName(post.assignedGroups[0]);
  const currentLikes = post.upvotes + (isLiked ? 1 : 0);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.getPostDetails(post.id, currentUser.role, currentUser.id);
      setComments(res.comments || []);
    } catch (err) {
      console.error('Failed to load discussion comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post.id]);

  const handleSaveMainPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainPostTitle.trim() || !mainPostContent.trim()) return;

    setIsSavingMainPost(true);
    try {
      const res = await api.updatePost(post.id, {
        title: mainPostTitle.trim(),
        content: mainPostContent.trim(),
      });
      setPost({
        ...post,
        title: mainPostTitle.trim(),
        content: mainPostContent.trim(),
      });
      setIsEditingMainPost(false);
      setReplySuccessMessage(res.message || 'Question updated successfully.');
      setTimeout(() => setReplySuccessMessage(null), 3500);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          title: mainPostTitle.trim(),
          content: mainPostContent.trim(),
        });
      }
    } catch (err) {
      console.error('Failed to update question:', err);
      setReplyErrorMessage('Unable to update question. Please try again.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    } finally {
      setIsSavingMainPost(false);
    }
  };

  const handleConfirmWithdrawPost = async () => {
    setIsWithdrawingPost(true);
    try {
      await api.deletePost(post.id);
      setShowWithdrawPostModal(false);
      onBack();
    } catch (err) {
      console.error('Failed to withdraw question:', err);
      setReplyErrorMessage('Unable to withdraw question.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
      setIsWithdrawingPost(false);
    }
  };

  const handleStartEditComment = (comm: Comment) => {
    setEditingCommentId(comm.id);
    setEditCommentText(comm.content);
  };

  const handleSaveComment = async (commId: string) => {
    if (!editCommentText.trim()) return;
    setIsSavingComment(true);
    try {
      await api.updateComment(post.id, commId, editCommentText.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === commId ? { ...c, content: editCommentText.trim() } : c))
      );
      setEditingCommentId(null);
      setReplySuccessMessage('Reply updated successfully.');
      setTimeout(() => setReplySuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to update reply:', err);
      setReplyErrorMessage('Failed to update reply.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteComment = async (commId: string) => {
    // Optimistic removal from display immediately
    setComments((prev) => prev.filter((c) => c.id !== commId));
    setReplySuccessMessage('Reply withdrawn successfully.');
    setTimeout(() => setReplySuccessMessage(null), 3500);

    try {
      await api.deleteComment(post.id, commId);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentCount: Math.max(0, post.commentCount - 1),
        });
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Toggle allow unmoderated replies (clinician only)
  const handleToggleRepliesModeration = async () => {
    if (!isClinician) return;
    const previousMode = post.allowUnmoderatedReplies;
    const newAllowUnmoderated = !previousMode;

    const updatedPost: Post = {
      ...post,
      allowUnmoderatedReplies: newAllowUnmoderated,
    };
    // Optimistic immediate update
    setPost(updatedPost);
    if (onPostUpdated) onPostUpdated(updatedPost);

    try {
      const res = await api.togglePostUnmoderatedReplies(post.id, newAllowUnmoderated);
      setReplySuccessMessage(
        res.message ||
          (newAllowUnmoderated
            ? 'Open replies enabled: Anyone can now reply without moderation.'
            : 'Moderated mode enabled: Replies now require clinical verification.')
      );
      setTimeout(() => setReplySuccessMessage(null), 3500);
      await loadComments();
    } catch (err) {
      // Revert if error
      const revertedPost: Post = {
        ...post,
        allowUnmoderatedReplies: previousMode,
      };
      setPost(revertedPost);
      if (onPostUpdated) onPostUpdated(revertedPost);
      console.error('Failed to update reply moderation policy:', err);
      setReplyErrorMessage('Failed to update reply moderation policy.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    }
  };

  // Moderator remove inappropriate reply
  const handleOpenRemoveReplyModal = (comm: Comment) => {
    setCommentToDelete(comm);
  };

  const handleConfirmModeratorRemoveReply = async () => {
    if (!commentToDelete) return;
    const commId = commentToDelete.id;
    setDeletingCommentId(commId);

    try {
      await api.deleteComment(post.id, commId);
      setComments((prev) => prev.filter((c) => c.id !== commId));
      const updatedPost = {
        ...post,
        commentCount: Math.max(0, post.commentCount - 1),
      };
      setPost(updatedPost);
      if (onPostUpdated) onPostUpdated(updatedPost);

      setCommentToDelete(null);
      setReplySuccessMessage('Inappropriate reply removed by moderator.');
      setTimeout(() => setReplySuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to remove inappropriate reply:', err);
      setReplyErrorMessage('Failed to remove reply.');
      setTimeout(() => setReplyErrorMessage(null), 4000);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    const submittedContent = replyText.trim();
    setIsSubmitting(true);
    setReplyErrorMessage(null);

    const isUnmoderated = post.allowUnmoderatedReplies === true;

    try {
      const res = await api.addComment(post.id, submittedContent, currentUser.id);
      setReplyText('');

      const confirmationText =
        isClinician || isUnmoderated
          ? 'Your reply has been published.'
          : 'Your reply was submitted successfully and sent to Dr. Seema for clinical safety review.';

      setReplySuccessMessage(confirmationText);
      setTimeout(() => setReplySuccessMessage(null), 6000);

      // Optimistically insert user's comment if not yet returned
      if (res.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === res.comment.id)) return prev;
          return [
            ...prev,
            {
              ...res.comment,
              status: isClinician || isUnmoderated ? 'APPROVED' : 'PENDING_MODERATION',
            },
          ];
        });
      }

      // Refresh comments from server
      await loadComments();

      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentCount: post.commentCount + 1,
        });
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      setReplyErrorMessage('Unable to submit your reply right now. Please try again.');
      setTimeout(() => setReplyErrorMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* FLOATING TOP CONFIRMATION BANNER (Always on top of viewport, regardless of scroll) */}
      {replySuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-snug text-slate-100">
                {replySuccessMessage}
              </span>
            </div>
            <button
              onClick={() => setReplySuccessMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
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
          className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
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

      {/* Clinician Moderator Reply Policy Control Banner */}
      {isClinician && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Moderator Reply Policy
            </span>
            {post.allowUnmoderatedReplies ? (
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

          <div className="shrink-0">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
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
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Discussion Post */}
      <article
        className={`rounded-2xl border p-5 sm:p-7 space-y-4 shadow-xs transition-colors ${
          isMainPostPending
            ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
        }`}
      >
        {/* Author Metadata */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium min-w-0">
            <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">{post.author.anonymousHandle}</span>
            {regionName && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                <span className="truncate">{regionName}</span>
              </>
            )}
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 pl-2">
            {new Date(post.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 text-base font-semibold"
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
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed text-sm"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingMainPost(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingMainPost || !mainPostTitle.trim() || !mainPostContent.trim()}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                {isSavingMainPost ? 'Saving...' : 'Save Updates'}
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

        {/* Bottom Actions Row: If pending, show Edit & Cancel buttons instead of replies/helpful! */}
        {isMainPostPending ? (
          <div className="pt-4 border-t border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>This question is currently awaiting Dr. Seema's clinical safety verification</span>
            </span>

            {isMainPostAuthor && !isEditingMainPost && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMainPost(true)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Edit Question</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawPostModal(true)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Cancel Submission</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</span>
            </div>

            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400' : ''}`} />
              <span>{currentLikes} helpful</span>
            </button>
          </div>
        )}
      </article>

      {/* Replies Thread Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Community Replies ({comments.length})
        </h2>

        {loadingComments ? (
          <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Loading replies...
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-sm space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-300">No replies yet.</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">Be the first to share your experience or practical advice.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comm) => {
              const isCommentClinician =
                comm.author.badgeLabel === 'Clinician Moderator' ||
                comm.author.anonymousHandle.includes('Dr. Seema');
              const isPending = comm.status === 'PENDING_MODERATION';
              const isAuthor = comm.author.anonymousHandle === currentUser.anonymousHandle;
              const isEditingThis = editingCommentId === comm.id;

              return (
                <div
                  key={comm.id}
                  className={`rounded-2xl p-4 sm:p-5 text-sm space-y-2.5 border transition ${
                    isCommentClinician
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                      : isPending
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <span>{comm.author.anonymousHandle}</span>
                      {isCommentClinician && (
                        <span className="text-xs text-[#002D72] dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#002D72] dark:text-blue-400" />
                          <span>Clinician</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          <span>Under Review by Dr. Seema</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(comm.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveComment(comm.id)}
                          disabled={isSavingComment || !editCommentText.trim()}
                          className="px-4 py-1.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          {isSavingComment ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line select-text">
                      {comm.content}
                    </p>
                  )}

                  {/* Actions for comments */}
                  {((isPending && isAuthor && !isEditingThis) ||
                    (isClinician && (post.allowUnmoderatedReplies || comm.status === 'APPROVED'))) && (
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        {post.allowUnmoderatedReplies && !isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Unmoderated reply</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Author actions on pending reply */}
                        {isPending && isAuthor && !isEditingThis && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(comm)}
                              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                            >
                              <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>Edit reply</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comm.id)}
                              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                              <span>Cancel reply</span>
                            </button>
                          </>
                        )}

                        {/* Clinician Moderator Remove Reply Button */}
                        {isClinician && (post.allowUnmoderatedReplies || comm.status === 'APPROVED') && (
                          <button
                            type="button"
                            onClick={() => handleOpenRemoveReplyModal(comm)}
                            disabled={deletingCommentId === comm.id}
                            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                            title="Remove inappropriate reply from discussion"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>Remove reply</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reply Composer Form with Clear Confirmation */}
        <form
          ref={replyFormRef}
          onSubmit={handleSendReply}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-xs transition-colors"
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Add your reply</span>
            <span>Replying as: <strong className="text-slate-800 dark:text-slate-200">{currentUser.anonymousHandle}</strong></span>
          </div>

          {/* Moderation Mode Info Callout */}
          {post.allowUnmoderatedReplies ? (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-3 flex items-start sm:items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Unmoderated replies enabled for this post:</strong> Your reply will be visible immediately to peer care partners without moderation delay.
              </span>
            </div>
          ) : (
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3 flex items-start sm:items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
              <ShieldCheck className="w-4 h-4 text-[#002D72] dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Moderated:</strong> New replies to this post are reviewed by Dr. Seema before being published.
              </span>
            </div>
          )}

          {/* Inline Error Notice */}
          {replyErrorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 p-3.5 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{replyErrorMessage}</span>
            </div>
          )}

          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share helpful advice, words of encouragement, or practical tips..."
            className="w-full p-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 font-sans leading-relaxed"
            required
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {post.allowUnmoderatedReplies ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Open discussion: replies appear immediately for everyone.</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#002D72] dark:text-blue-400 shrink-0" />
                <span>Reviewed by Dr. Seema to preserve privacy and clinical safety.</span>
              </span>
            )}
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Reply</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* MODAL: CONFIRM WITHDRAW QUESTION (With backdrop click to exit) */}
      {showWithdrawPostModal && (
        <div
          onClick={() => setShowWithdrawPostModal(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Withdraw Question?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will remove your question from clinical review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
              "{post.title}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowWithdrawPostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isWithdrawingPost}
                onClick={handleConfirmWithdrawPost}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isWithdrawingPost ? 'Withdrawing...' : 'Yes, Withdraw Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM REMOVE INAPPROPRIATE REPLY (Moderator) */}
      {commentToDelete && (
        <div
          onClick={() => setCommentToDelete(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Remove Inappropriate Reply?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  As clinician moderator, this reply will be removed from the discussion immediately.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-sans space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Author: {commentToDelete.author.anonymousHandle}
              </div>
              <p className="line-clamp-3 italic">"{commentToDelete.content}"</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Reply
              </button>
              <button
                type="button"
                disabled={deletingCommentId !== null}
                onClick={handleConfirmModeratorRemoveReply}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingCommentId ? 'Removing...' : 'Remove Reply'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
