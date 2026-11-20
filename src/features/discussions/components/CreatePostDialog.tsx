import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import {
  getProperGroupName,
  type Audience,
  type CommunityGroup,
} from '@/types';
import { X } from 'lucide-react';
import type { Dispatch, FormEventHandler, SetStateAction } from 'react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  title: string;
  onTitleChange: Dispatch<SetStateAction<string>>;
  content: string;
  onContentChange: Dispatch<SetStateAction<string>>;
  groupId: string;
  onGroupIdChange: Dispatch<SetStateAction<string>>;
  audience: Audience | '';
  onAudienceChange: Dispatch<SetStateAction<Audience | ''>>;
  submitting: boolean;
  cohorts: CommunityGroup[];
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function CreatePostDialog({
  open: showNewPostModal,
  onOpenChange: setShowNewPostModal,
  title: npTitle,
  onTitleChange: setNpTitle,
  content: npContent,
  onContentChange: setNpContent,
  groupId: npGroupId,
  onGroupIdChange: setNpGroupId,
  audience: npAudience,
  onAudienceChange: setNpAudience,
  submitting: isSubmittingPost,
  cohorts,
  onSubmit: handleCreatePost,
}: CreatePostDialogProps) {
  const dialogRef = useDialogFocus(showNewPostModal, () => {
    if (!isSubmittingPost) {
      setShowNewPostModal(false);
    }
  });
  return (
    <>
      {/* MODAL new post details */}
      {showNewPostModal && (
        <div
          onClick={() => setShowNewPostModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Create a post"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  New Post
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Published immediately, no review needed.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close create post dialog"
                onClick={() => setShowNewPostModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreatePost}
              className="p-4 sm:p-5 space-y-4 text-sm"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Title
                </label>
                <input
                  aria-label="Title"
                  value={npTitle}
                  onChange={(e) => setNpTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Post
                </label>
                <textarea
                  aria-label="Post"
                  rows={5}
                  value={npContent}
                  onChange={(e) => setNpContent(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Region / group
                </label>
                <select
                  aria-label="Region / group"
                  value={npGroupId}
                  onChange={(e) => setNpGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    Choose a group...
                  </option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getProperGroupName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Disease group
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['FTD', 'FTD only'],
                      ['AD', "Alzheimer's only"],
                      ['BOTH', 'Both groups'],
                    ] as [Audience, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNpAudience(value)}
                      className={`px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition cursor-pointer ${
                        npAudience === value
                          ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-3.5 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingPost ||
                    !npTitle.trim() ||
                    !npContent.trim() ||
                    !npGroupId ||
                    !npAudience
                  }
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  {isSubmittingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
