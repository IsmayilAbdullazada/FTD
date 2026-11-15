import { Eye, Search, X } from "lucide-react";
import React from "react";
import type { RealtimeMatchItem } from "../lib/discussionSearch";

/**
 * Highlights matching keywords directly in the post headline link.
 */
function highlightTitleText(
  title: string,
  matchedTerms: string[],
): React.ReactNode {
  if (!matchedTerms || matchedTerms.length === 0) {
    return <span>{title}</span>;
  }

  const validTerms = matchedTerms
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (validTerms.length === 0) {
    return <span>{title}</span>;
  }

  // Sort longest terms first to match full phrases before sub-words
  const escapedTerms = validTerms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);

  try {
    const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
    const parts = title.split(pattern);

    return (
      <span>
        {parts.map((part, index) => {
          if (!part) return null;
          const isMatch = validTerms.some(
            (term) => term.toLowerCase() === part.toLowerCase(),
          );
          if (isMatch) {
            return (
              <strong
                key={index}
                className="font-bold text-[#002D72] dark:text-amber-300 bg-amber-200/90 dark:bg-amber-950/80 px-1 py-0.5 rounded shadow-2xs mx-0.5"
              >
                {part}
              </strong>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  } catch {
    return <span>{title}</span>;
  }
}

interface SimilarDiscussionsBoxProps {
  matches: RealtimeMatchItem[];
  onDismiss: () => void;
  onOpenDiscussion: (postId: string) => void;
  onPreview: (postId: string) => void;
}

export const SimilarDiscussionsBox: React.FC<SimilarDiscussionsBoxProps> = ({
  matches,
  onDismiss,
  onOpenDiscussion,
  onPreview,
}) => {
  if (matches.length === 0) return null;

  return (
    <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/90 dark:border-blue-900/60 shadow-xs overflow-hidden animate-in fade-in duration-150 transition-colors">
      <div className="bg-slate-50/90 dark:bg-slate-800/90 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Posts that may be similar
          </span>
          <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 border border-transparent dark:border-blue-800/60 px-2 py-0.5 rounded-md">
            {matches.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 min-w-9 min-h-9 flex items-center justify-center rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
          title="Dismiss suggestions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
        {matches.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition text-left space-y-2 border border-slate-100 dark:border-slate-800/80 hover:border-blue-100 dark:hover:border-blue-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => onOpenDiscussion(item.postId)}
                className="text-base font-semibold text-[#002D72] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline text-left cursor-pointer transition min-w-0 flex-1 leading-snug py-1"
              >
                {highlightTitleText(item.postTitle, item.matchedTerms)}
              </button>

              <button
                type="button"
                onClick={() => onPreview(item.postId)}
                className="min-h-11 px-3.5 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer border border-slate-200/60 dark:border-slate-700"
                title="Preview discussion answers"
              >
                <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Preview</span>
              </button>
            </div>

            {/* If content or replies matched, show sentence snippet(s) with ... and bolding the matching substring */}
            {item.snippets.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                {item.snippets.map((snippet, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans"
                  >
                    {snippet.hasLeadingEllipsis && (
                      <span className="text-slate-400 dark:text-slate-500 font-bold">
                        ...{" "}
                      </span>
                    )}
                    <span>{snippet.beforeMatch}</span>
                    <strong className="font-bold text-[#002D72] dark:text-amber-200 bg-amber-200/90 dark:bg-amber-950/90 px-1 py-0.5 rounded shadow-2xs mx-0.5">
                      {snippet.matchedText}
                    </strong>
                    <span>{snippet.afterMatch}</span>
                    {snippet.hasTrailingEllipsis && (
                      <span className="text-slate-400 dark:text-slate-500 font-bold">
                        {" "}
                        ...
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans">
        <span>
          💡 Tip: Click any post headline above to read the discussion, or
          continue writing your question below.
        </span>
      </div>
    </div>
  );
};
