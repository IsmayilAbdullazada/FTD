import { Trash2, X } from "lucide-react";

import type {
  CarePartnerFeedProps,
  useCarePartnerFeed,
} from "../hooks/useCarePartnerFeed";

type Props = Pick<
  ReturnType<typeof useCarePartnerFeed>,
  | "editingPost"
  | "setEditingPost"
  | "editTitle"
  | "setEditTitle"
  | "editContent"
  | "setEditContent"
  | "editCohortId"
  | "setEditCohortId"
  | "isSavingEdit"
  | "confirmDeletePost"
  | "setConfirmDeletePost"
  | "isDeletingPost"
  | "handleSaveEdit"
  | "handleConfirmWithdraw"
> &
  Pick<CarePartnerFeedProps, "cohorts">;

export function FeedPostDialogs({
  editingPost,
  setEditingPost,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  editCohortId,
  setEditCohortId,
  isSavingEdit,
  confirmDeletePost,
  setConfirmDeletePost,
  isDeletingPost,
  handleSaveEdit,
  handleConfirmWithdraw,
  cohorts,
}: Props) {
  return (
    <>
      {/* MODAL: EDIT PENDING QUESTION (With backdrop click to exit) */}
      {editingPost && (
        <div
          onClick={() => setEditingPost(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                Edit Question
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-11 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Details
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Target Group
                </label>
                <select
                  value={editCohortId}
                  onChange={(e) => setEditCohortId(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-11 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.properName || c.name.replace(/\s+Cohort$/i, "")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="min-h-11 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingEdit || !editTitle.trim() || !editContent.trim()
                  }
                  className="min-h-11 px-6 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                >
                  {isSavingEdit ? "Saving..." : "Save Updates"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM WITHDRAW QUESTION (With backdrop click to exit) */}
      {confirmDeletePost && (
        <div
          onClick={() => setConfirmDeletePost(null)}
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This will remove your question from clinical review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
              "{confirmDeletePost.title}"
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                className="min-h-11 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmWithdraw}
                className="min-h-11 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingPost ? "Withdrawing..." : "Yes, Withdraw Question"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
