import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { CheckCircle2, ExternalLink, FileText, X } from 'lucide-react';

import type {
  KnowledgeBaseExplorerProps,
  useKnowledgeResources,
} from '../hooks/useKnowledgeResources';

type Props = Pick<
  ReturnType<typeof useKnowledgeResources>,
  'activeResource' | 'setActiveResource' | 'isClinician' | 'categories'
> &
  Pick<KnowledgeBaseExplorerProps, 'onClearInitialResource'>;
export function ResourceInspectorDialogs({
  activeResource,
  setActiveResource,
  isClinician,
  categories,
  onClearInitialResource,
}: Props) {
  return (
    <>
      {/* ACTIVE RESOURCE MODAL */}
      {activeResource && (
        <div
          onClick={() => {
            setActiveResource(null);
            if (onClearInitialResource) onClearInitialResource();
          }}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-white dark:bg-slate-900">
              <div className="space-y-1.5">
                <span className="font-semibold text-[#002D72] dark:text-blue-400 flex items-center gap-2">
                  {categories.find((c) => c.key === activeResource.category)
                    ?.label || activeResource.category}
                  {isClinician && (
                    <AudienceBadge condition={activeResource.diseaseDomain} />
                  )}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug tracking-tight">
                  {activeResource.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 space-y-1.5">
                <div className="font-semibold text-[#002D72] dark:text-blue-400 text-xs uppercase tracking-wider">
                  Care Overview
                </div>
                <p className="leading-relaxed">{activeResource.summary}</p>
              </div>

              {/* Source Documents */}
              {(activeResource.fileAttachmentUrl ||
                activeResource.externalUrl ||
                activeResource.additionalLinks?.length) && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Source Documents
                  </div>

                  <div className="flex flex-col gap-2">
                    {activeResource.fileAttachmentUrl && (
                      <a
                        href={activeResource.fileAttachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-[#002D72] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <FileText className="w-5 h-5 shrink-0" />
                        <span className="font-medium">Open PDF guide</span>
                        <ExternalLink className="w-4 h-4 ml-auto shrink-0" />
                      </a>
                    )}

                    {activeResource.externalUrl && (
                      <a
                        href={activeResource.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-[#002D72] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-5 h-5 shrink-0" />
                        <span className="font-medium">
                          Visit source website
                        </span>
                      </a>
                    )}

                    {activeResource.additionalLinks?.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-[#002D72] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol Content */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Step-by-Step Care Strategies
                </div>
                <div className="whitespace-pre-line text-sm sm:text-[15px] font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200/80 dark:border-slate-750 leading-relaxed">
                  {activeResource.contentBody}
                </div>
              </div>

              {/* Key Takeaways */}
              {activeResource.keyTakeaways &&
                activeResource.keyTakeaways.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Key Care Recommendations
                    </div>
                    <ul className="space-y-2 text-sm">
                      {activeResource.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed text-slate-700 dark:text-slate-300">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs sm:text-sm">
              {activeResource.externalUrl ? (
                <a
                  href={activeResource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#002D72] dark:text-blue-400 hover:underline font-semibold flex items-center gap-1.5"
                >
                  <span>View original source</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  Resource details
                </span>
              )}

              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold transition cursor-pointer"
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
