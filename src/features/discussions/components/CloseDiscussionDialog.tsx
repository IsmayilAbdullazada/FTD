import type { Dispatch, SetStateAction } from 'react';
import { Lock } from 'lucide-react';
import type { Post } from '@/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface CloseDiscussionDialogProps {
  post: Post | null;
  closing: boolean;
  onPostChange: Dispatch<SetStateAction<Post | null>>;
  onConfirm: (post: Post) => void;
}

export function CloseDiscussionDialog({
  post: postToClose,
  closing: isTogglingClose,
  onPostChange: setPostToClose,
  onConfirm: handleTogglePostClose,
}: CloseDiscussionDialogProps) {
  const dialogRef = useDialogFocus(Boolean(postToClose));
  return (
    <>
      {postToClose && (
        <div
          onClick={() => setPostToClose(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Close discussion"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Close Discussion?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Moderator Action
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                "{postToClose.title}"
              </p>
              <p>
                Closing this discussion will <strong>prevent new replies</strong> from being posted by care partners.
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                ✓ All {postToClose.commentCount} existing replies will be preserved and remain readable.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPostToClose(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Open
              </button>
              <button
                type="button"
                disabled={isTogglingClose}
                onClick={() => handleTogglePostClose(postToClose)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isTogglingClose ? 'Closing...' : 'Yes, Close Discussion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

