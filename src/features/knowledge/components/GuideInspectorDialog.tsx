import type { Dispatch, SetStateAction } from 'react';
import { Check, Copy, FileCode, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import type { ChatbotGuideFile } from '@/features/knowledge/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface GuideInspectorDialogProps {
  guide: ChatbotGuideFile | null;
  onGuideChange: Dispatch<SetStateAction<ChatbotGuideFile | null>>;
  copied: boolean;
  onCopiedChange: Dispatch<SetStateAction<boolean>>;
  onToggleGuide: (guide: ChatbotGuideFile) => void;
  onRequestDelete: (guide: ChatbotGuideFile) => void;
}

export function GuideInspectorDialog({
  guide: inspectGuideModal,
  onGuideChange: setInspectGuideModal,
  copied: copiedInspect,
  onCopiedChange: setCopiedInspect,
  onToggleGuide: handleToggleGuide,
  onRequestDelete: handleRequestDeleteGuide,
}: GuideInspectorDialogProps) {
  const dialogRef = useDialogFocus(Boolean(inspectGuideModal));
  return (
    <>
      {/* MODAL: INSPECT / VIEW GUIDE FILE */}
      {inspectGuideModal && (
        <div
          onClick={() => setInspectGuideModal(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Inspect guide"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden cursor-default transition-colors my-auto"
          >
            {/* Inspect Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-sky-300 shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                      {inspectGuideModal.title}
                    </h3>
                    <AudienceBadge condition={inspectGuideModal.condition || 'FTD'} />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inspectGuideModal.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {inspectGuideModal.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {inspectGuideModal.fileName}{inspectGuideModal.topicTag ? ` · #${inspectGuideModal.topicTag}` : inspectGuideModal.category ? ` · ${inspectGuideModal.category.replace(/_/g, ' ')}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectGuideModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
                <span>
                  <strong>{inspectGuideModal.wordCount?.toLocaleString() || inspectGuideModal.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</strong> words
                </span>
                <span>•</span>
                <span>
                  <strong>{inspectGuideModal.sectionCount || 1}</strong> sections
                </span>
                <span>•</span>
                <span>Uploaded by {inspectGuideModal.uploadedByName || 'Dr. Seema Gulyani'}</span>
                <span>•</span>
                <span>{new Date(inspectGuideModal.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectGuideModal.content);
                    setCopiedInspect(true);
                    setTimeout(() => setCopiedInspect(false), 2500);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedInspect ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleGuide(inspectGuideModal);
                    setInspectGuideModal((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    inspectGuideModal.isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {inspectGuideModal.isActive ? (
                    <>
                      <ToggleRight className="w-3.5 h-3.5" />
                      <span>Pause Guide</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-3.5 h-3.5" />
                      <span>Activate Guide</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = inspectGuideModal;
                    setInspectGuideModal(null);
                    handleRequestDeleteGuide(target);
                  }}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                  title="Delete Guide"
                  aria-label="Delete Guide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body Viewer */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {inspectGuideModal.description && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Summary: </span>
                  {inspectGuideModal.description}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                {inspectGuideModal.content}
              </div>
            </div>

            {/* Inspect Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {inspectGuideModal.isActive
                  ? '✓ Dr. Seema\'s Assistant is currently using this document for caregiver queries'
                  : '⚠ This document is paused and not currently used by the chatbot'}
              </span>
              <button
                type="button"
                onClick={() => setInspectGuideModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

