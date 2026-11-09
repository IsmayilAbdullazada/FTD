import type { Dispatch, SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import type { ChatbotGuideFile } from '@/features/knowledge/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface DeleteGuideDialogProps {
  guide: ChatbotGuideFile | null;
  deleting: boolean;
  onGuideChange: Dispatch<SetStateAction<ChatbotGuideFile | null>>;
  onConfirm: () => void;
}

export function DeleteGuideDialog({
  guide: guideToDelete,
  deleting: isDeletingGuide,
  onGuideChange: setGuideToDelete,
  onConfirm: handleConfirmDeleteGuide,
}: DeleteGuideDialogProps) {
  const dialogRef = useDialogFocus(Boolean(guideToDelete));
  return (
    <>
      {/* MODAL: DELETE GUIDE CONFIRMATION */}
      {guideToDelete && (
        <div
          onClick={() => !isDeletingGuide && setGuideToDelete(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-[70] flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Remove guide"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default transition-colors my-auto"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Remove Guide?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Are you sure you want to delete this document from Dr. Seema's Assistant knowledge base?
                </p>
              </div>
            </div>

            {/* Document summary box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                {guideToDelete.title}
              </div>
              <div className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono">{guideToDelete.fileName}</span>
                <span>•</span>
                <span>{guideToDelete.wordCount?.toLocaleString() || '—'} words</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                  {(guideToDelete.topicTag || guideToDelete.category || guideToDelete.condition || 'General Guide').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Once removed, the assistant will immediately stop indexing this document or referencing its protocols when responding to caregiver queries. This deletion will be recorded in the audit trail.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGuideToDelete(null)}
                disabled={isDeletingGuide}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGuide}
                disabled={isDeletingGuide}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isDeletingGuide ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Guide</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

