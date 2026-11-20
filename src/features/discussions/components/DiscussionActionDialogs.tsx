import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { Lock, Trash2 } from 'lucide-react';

import type { useDiscussionDetail } from '../hooks/useDiscussionDetail';

type Props = Pick<
  ReturnType<typeof useDiscussionDetail>,
  | 'post'
  | 'comments'
  | 'showConfirmCloseModal'
  | 'setShowConfirmCloseModal'
  | 'isTogglingClose'
  | 'showWithdrawPostModal'
  | 'setShowWithdrawPostModal'
  | 'isWithdrawingPost'
  | 'deletingCommentId'
  | 'commentToDelete'
  | 'setCommentToDelete'
  | 'handleConfirmWithdrawPost'
  | 'handleConfirmModeratorRemoveReply'
  | 'handleToggleCloseDiscussion'
>;

export function DiscussionActionDialogs({
  post,
  comments,
  showConfirmCloseModal,
  setShowConfirmCloseModal,
  isTogglingClose,
  showWithdrawPostModal,
  setShowWithdrawPostModal,
  isWithdrawingPost,
  deletingCommentId,
  commentToDelete,
  setCommentToDelete,
  handleConfirmWithdrawPost,
  handleConfirmModeratorRemoveReply,
  handleToggleCloseDiscussion,
}: Props) {
  const closeDialogRef = useDialogFocus(showConfirmCloseModal, () => {
    if (!isTogglingClose) setShowConfirmCloseModal(false);
  });
  const withdrawDialogRef = useDialogFocus(showWithdrawPostModal, () => {
    if (!isWithdrawingPost) setShowWithdrawPostModal(false);
  });
  const deleteCommentDialogRef = useDialogFocus(
    Boolean(commentToDelete),
    () => {
      if (deletingCommentId === null) setCommentToDelete(null);
    },
  );

  return (
    <>
      {/* MODAL: CONFIRM CLOSE DISCUSSION (Moderator) */}
      {showConfirmCloseModal && (
        <div
          onClick={() => !isTogglingClose && setShowConfirmCloseModal(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={closeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Close Discussion Confirmation"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Close Discussion?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Moderator Action
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <p>
                Closing this discussion will{' '}
                <strong>prevent new replies</strong> from being posted by care
                partners.
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                ✓ All {comments.length} existing replies will be preserved and
                remain readable.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmCloseModal(false)}
                className="min-h-11 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Open
              </button>
              <button
                type="button"
                disabled={isTogglingClose}
                onClick={handleToggleCloseDiscussion}
                className="min-h-11 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isTogglingClose ? 'Closing...' : 'Yes, Close Discussion'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM WITHDRAW QUESTION (With backdrop click to exit) */}
      {showWithdrawPostModal && (
        <div
          onClick={() => setShowWithdrawPostModal(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={withdrawDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Withdraw Question Confirmation"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Withdraw Question?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  This will remove your question from review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
              "{post.title}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowWithdrawPostModal(false)}
                className="min-h-11 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isWithdrawingPost}
                onClick={handleConfirmWithdrawPost}
                className="min-h-11 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isWithdrawingPost
                    ? 'Withdrawing...'
                    : 'Yes, Withdraw Question'}
                </span>
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
            ref={deleteCommentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Remove Inappropriate Reply Confirmation"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100 outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Remove Inappropriate Reply?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  As moderator, this reply will be removed from the discussion
                  immediately.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 font-sans space-y-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Author: {commentToDelete.author.anonymousHandle}
              </div>
              <p className="line-clamp-3 italic">"{commentToDelete.content}"</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="min-h-11 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Reply
              </button>
              <button
                type="button"
                disabled={deletingCommentId !== null}
                onClick={handleConfirmModeratorRemoveReply}
                className="min-h-11 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deletingCommentId ? 'Removing...' : 'Remove Reply'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
