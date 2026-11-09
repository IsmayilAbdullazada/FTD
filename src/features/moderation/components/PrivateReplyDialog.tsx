import type { Dispatch, SetStateAction } from 'react';
import { Send, ShieldCheck, X } from 'lucide-react';
import type { QueueItem } from '@/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

type PrivateReplyAction = 'KEEP_PENDING' | 'PUBLISH';

interface PrivateReplyDialogProps {
  open: boolean;
  item: QueueItem | null;
  sending: boolean;
  message: string;
  action: PrivateReplyAction;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onMessageChange: Dispatch<SetStateAction<string>>;
  onActionChange: Dispatch<SetStateAction<PrivateReplyAction>>;
  onSend: () => void;
}

export function PrivateReplyDialog({
  open: showPrivateReplyModal,
  item: activeItem,
  sending: isSendingPrivateReply,
  message: privateReplyMessage,
  action: privateReplyAction,
  onOpenChange: setShowPrivateReplyModal,
  onMessageChange: setPrivateReplyMessage,
  onActionChange: setPrivateReplyAction,
  onSend: handleSendPrivateReply,
}: PrivateReplyDialogProps) {
  const dialogRef = useDialogFocus(showPrivateReplyModal && Boolean(activeItem));
  return (
    <>
      {/* MODAL: PRIVATE REPLY TO AUTHOR */}
      {showPrivateReplyModal && activeItem && (
        <div
          onClick={() => !isSendingPrivateReply && setShowPrivateReplyModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Reply privately to author"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 space-y-4 cursor-default transition-colors my-auto animate-in fade-in zoom-in-95"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                    Reply Privately to Author
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    To {activeItem.author.realName} ({activeItem.author.anonymousHandle})
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close private reply dialog"
                onClick={() => setShowPrivateReplyModal(false)}
                disabled={isSendingPrivateReply}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confidential Clinical Communication</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-blue-800 dark:text-blue-300">
                This message is delivered directly to the author's post card in their feed with an unmistakable private badge. Only the author and clinical moderators can view this conversation.
              </p>
            </div>

            {/* Post Snippet */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Regarding Post</span>
              <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{activeItem.title}</div>
              <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px]">{activeItem.rawContent}</p>
            </div>

            {/* Action selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Queue Status After Sending
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrivateReplyAction('KEEP_PENDING')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    privateReplyAction === 'KEEP_PENDING'
                      ? 'border-[#002D72] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-[#002D72] dark:text-blue-300 font-semibold ring-1 ring-[#002D72] dark:ring-blue-500'
                      : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="font-semibold">Keep in Review</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Hold pending while awaiting clarification
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivateReplyAction('PUBLISH')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    privateReplyAction === 'PUBLISH'
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-600 dark:ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="font-semibold">Publish Post Now</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    Approve for community & send private guidance
                  </div>
                </button>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Private Message to Care Partner <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={privateReplyMessage}
                onChange={(e) => setPrivateReplyMessage(e.target.value)}
                placeholder="Write your private message or clinical guidance here. The care partner will be able to read this on their post and reply back directly..."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPrivateReplyModal(false)}
                disabled={isSendingPrivateReply}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPrivateReply}
                disabled={!privateReplyMessage.trim() || isSendingPrivateReply}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingPrivateReply ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Private Reply</span>
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

