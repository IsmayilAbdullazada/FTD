import { useEffectEvent } from 'react';
import { reportError } from '@/shared/lib/logger';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { Comment, CurrentUser, Post, getProperGroupName } from '@/types';
import React, { useEffect, useRef, useState } from 'react';

export interface DiscussionDetailProps {
  post: Post;
  currentUser: CurrentUser;
  onBack: () => void;
  onPostUpdated?: (updatedPost: Post) => void;
}

export function useDiscussionDetail({
  post: initialPost,
  currentUser,
  onBack,
  onPostUpdated,
}: DiscussionDetailProps) {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(() => Boolean(initialPost.isUpvoted));
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(
    null,
  );
  const [replyErrorMessage, setReplyErrorMessage] = useState<string | null>(
    null,
  );

  // Discussion closing / reopening (Moderator control)
  const [showConfirmCloseModal, setShowConfirmCloseModal] = useState(false);
  const [isTogglingClose, setIsTogglingClose] = useState(false);

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
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);

  // Care partner private replies to moderators
  const [carePrivateReplyText, setCarePrivateReplyText] = useState('');
  const [isSendingCarePrivateReply, setIsSendingCarePrivateReply] =
    useState(false);
  const [showCarePrivateReplyBox, setShowCarePrivateReplyBox] = useState(false);

  const replyFormRef = useRef<HTMLFormElement | null>(null);
  const isClinician =
    currentUser.role === 'CLINICIAN_MODERATOR' ||
    currentUser.role === 'SYSTEM_ADMIN';
  const isMainPostPending = post.status === 'PENDING_MODERATION';
  const isMainPostAuthor =
    !isClinician &&
    (post.author.userId === currentUser.id ||
      post.author.anonymousHandle === currentUser.anonymousHandle);

  const regionName = getProperGroupName(post.assignedGroups[0]);
  const currentLikes = post.upvotes;

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await discussionApi.getPostDetails(post.id);
      setComments(res.comments || []);
      if (res.post) {
        setPost(res.post);
        setIsLiked(Boolean(res.post.isUpvoted));
      }
    } catch (err) {
      reportError('Failed to load discussion comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadCommentsEffect = useEffectEvent(() => loadComments());
  useEffect(() => {
    loadCommentsEffect();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post.id]);

  const handleSaveMainPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainPostTitle.trim() || !mainPostContent.trim()) return;

    setIsSavingMainPost(true);
    try {
      const res = await discussionApi.updatePost(post.id, {
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
      reportError('Failed to update question:', err);
      setReplyErrorMessage('Unable to update question. Please try again.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    } finally {
      setIsSavingMainPost(false);
    }
  };

  const handleConfirmWithdrawPost = async () => {
    setIsWithdrawingPost(true);
    try {
      await discussionApi.deletePost(post.id);
      setShowWithdrawPostModal(false);
      onBack();
    } catch (err) {
      reportError('Failed to withdraw question:', err);
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
      await discussionApi.updateComment(
        post.id,
        commId,
        editCommentText.trim(),
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === commId ? { ...c, content: editCommentText.trim() } : c,
        ),
      );
      setEditingCommentId(null);
      setReplySuccessMessage('Reply updated successfully.');
      setTimeout(() => setReplySuccessMessage(null), 3500);
    } catch (err) {
      reportError('Failed to update reply:', err);
      setReplyErrorMessage('Failed to update reply.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteComment = async (commId: string) => {
    // Store backup for rollback if network request fails
    const previousComments = [...comments];
    // Optimistic removal from display immediately
    setComments((prev) => prev.filter((c) => c.id !== commId));

    try {
      await discussionApi.deleteComment(post.id, commId);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentCount: Math.max(0, post.commentCount - 1),
        });
      }
      setReplySuccessMessage('Reply withdrawn successfully.');
      setTimeout(() => setReplySuccessMessage(null), 3500);
    } catch (err) {
      // Rollback to previous state on error
      setComments(previousComments);
      setReplyErrorMessage('Unable to withdraw reply. Please try again.');
      setTimeout(() => setReplyErrorMessage(null), 4000);
      reportError('Failed to delete comment:', err);
    }
  };

  const handleSendCarePrivateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carePrivateReplyText.trim() || isSendingCarePrivateReply) return;

    setIsSendingCarePrivateReply(true);
    try {
      const res = await moderationApi.sendPostPrivateNote(post.id, {
        message: carePrivateReplyText.trim(),
        action: 'KEEP_PENDING',
      });

      const updated = {
        ...post,
        moderatorPrivateNotes: [
          ...(post.moderatorPrivateNotes || []),
          res.note,
        ],
      };
      setPost(updated);
      if (onPostUpdated) onPostUpdated(updated);
      setCarePrivateReplyText('');
      setShowCarePrivateReplyBox(false);
      setReplySuccessMessage(
        'Your private reply has been sent to the moderator.',
      );
      setTimeout(() => setReplySuccessMessage(null), 3500);
    } catch (err: unknown) {
      reportError('Failed to send private reply:', err);
      setReplyErrorMessage('Unable to send private message.');
      setTimeout(() => setReplyErrorMessage(null), 3500);
    } finally {
      setIsSendingCarePrivateReply(false);
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
      const res = await discussionApi.togglePostUnmoderatedReplies(
        post.id,
        newAllowUnmoderated,
      );
      setReplySuccessMessage(
        res.message ||
          (newAllowUnmoderated
            ? 'Open replies enabled: Anyone can now reply without moderation.'
            : 'Moderated mode enabled: Replies now require clinical verification.'),
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
      reportError('Failed to update reply moderation policy:', err);
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
      await discussionApi.deleteComment(post.id, commId);
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
      reportError('Failed to remove inappropriate reply:', err);
      setReplyErrorMessage('Failed to remove reply.');
      setTimeout(() => setReplyErrorMessage(null), 4000);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Moderator close / reopen discussion (Preserves existing replies!)
  const handleToggleCloseDiscussion = async () => {
    if (!isClinician) return;
    setIsTogglingClose(true);
    const newClosed = !post.isClosed;

    try {
      const res = await discussionApi.closePost(post.id, newClosed);
      const updatedPost: Post = {
        ...post,
        isClosed: newClosed,
        closedAt: newClosed ? new Date().toISOString() : undefined,
        closedBy: newClosed ? currentUser.id : undefined,
      };
      setPost(updatedPost);
      if (onPostUpdated) onPostUpdated(updatedPost);
      setShowConfirmCloseModal(false);
      setReplySuccessMessage(
        res.message ||
          (newClosed
            ? 'Discussion closed to new replies. All existing replies remain preserved.'
            : 'Discussion reopened. Care partners can now post replies.'),
      );
      setTimeout(() => setReplySuccessMessage(null), 4000);
    } catch (err) {
      reportError('Failed to toggle discussion close status:', err);
      setReplyErrorMessage('Failed to update discussion status.');
      setTimeout(() => setReplyErrorMessage(null), 4000);
    } finally {
      setIsTogglingClose(false);
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
      const res = await discussionApi.addComment(
        post.id,
        submittedContent,
        replyTarget?.id,
      );
      setReplyText('');
      setReplyTarget(null);

      const confirmationText =
        isClinician || isUnmoderated
          ? 'Your reply has been published.'
          : 'Your reply was submitted and sent to the clinical moderation team for safety review.';

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
              status:
                isClinician || isUnmoderated
                  ? 'APPROVED'
                  : 'PENDING_MODERATION',
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
      reportError('Failed to send reply:', err);
      setReplyErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to submit your reply right now. Please try again.',
      );
      setTimeout(() => setReplyErrorMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    const wasLiked = isLiked;
    const newLiked = !wasLiked;
    setIsLiked(newLiked);
    const newUpvotes = Math.max(0, post.upvotes + (newLiked ? 1 : -1));
    const updatedPost = { ...post, upvotes: newUpvotes, isUpvoted: newLiked };
    setPost(updatedPost);
    if (onPostUpdated) onPostUpdated(updatedPost);

    try {
      const res = await discussionApi.togglePostUpvote(post.id);
      const syncedPost = {
        ...post,
        upvotes: res.upvotes,
        isUpvoted: res.isUpvoted,
      };
      setPost(syncedPost);
      setIsLiked(res.isUpvoted);
      if (onPostUpdated) onPostUpdated(syncedPost);
    } catch (err) {
      reportError('Failed to upvote post:', err);
    }
  };

  return {
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
  };
}
