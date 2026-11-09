import type { Dispatch, SetStateAction } from 'react';
import type { QueueItem, RejectionReason } from '@/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface RejectPostDialogProps {
  open: boolean;
  item: QueueItem | null;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  rejectionCode: RejectionReason;
  onRejectionCodeChange: Dispatch<SetStateAction<RejectionReason>>;
  rejectionText: string;
  onRejectionTextChange: Dispatch<SetStateAction<string>>;
  onConfirm: () => void;
}

export function RejectPostDialog({
  open: showRejectModal,
  item: activeItem,
  onOpenChange: setShowRejectModal,
  rejectionCode,
  onRejectionCodeChange: setRejectionCode,
  rejectionText: customRejectionText,
  onRejectionTextChange: setCustomRejectionText,
  onConfirm: handleConfirmReject,
}: RejectPostDialogProps) {
  const dialogRef = useDialogFocus(showRejectModal && Boolean(activeItem));
  return (
    <>
      {/* MODAL: REJECT POST */}
      {showRejectModal && activeItem && (
        <div
          onClick={() => setShowRejectModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reject submission"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-4 sm:p-5 space-y-4 cursor-default transition-colors"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Reject {activeItem.type === 'COMMENT' ? 'Reply' : 'Post'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The author will receive a private explanation.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason
                </label>
                <select
                  value={rejectionCode}
                  onChange={(e) => setRejectionCode(e.target.value as RejectionReason)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="CLINICAL_MEDICATION_QUERY">
                    Prescription or Medication Question
                  </option>
                  <option value="ACUTE_SAFETY_EMERGENCY">
                    Emergency or Safety Concern
                  </option>
                  <option value="UNVERIFIED_MEDICAL_ADVICE">
                    Unverified Medical Claim
                  </option>
                  <option value="EXPLICIT_PII_UNRESOLVED">
                    Personal Information
                  </option>
                  <option value="COMMERCIAL_SOLICITATION">
                    Promotional or Spam
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note to Author (optional)
                </label>
                <textarea
                  rows={3}
                  value={customRejectionText}
                  onChange={(e) => setCustomRejectionText(e.target.value)}
                  placeholder="Explain why this post could not be shared publicly..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Reject {activeItem.type === 'COMMENT' ? 'Reply' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

