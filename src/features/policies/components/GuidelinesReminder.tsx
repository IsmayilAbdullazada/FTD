import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { CommunityGuidelinesModal } from './CommunityGuidelinesModal';

interface GuidelinesReminderProps {
  compact?: boolean;
}

export function GuidelinesReminder({
  compact = false,
}: GuidelinesReminderProps) {
  const [showGuidelines, setShowGuidelines] = useState(false);

  return (
    <>
      {compact ? (
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-[11px] dark:border-blue-900/60 dark:bg-blue-950/30">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#002D72] dark:text-blue-400" />

          <span className="text-slate-600 dark:text-slate-300">
            By signing in, please follow our
          </span>

          <button
            type="button"
            onClick={() => setShowGuidelines(true)}
            className="inline-flex min-h-11 items-center gap-0.5 font-semibold text-[#002D72] hover:underline dark:text-blue-300"
          >
            Community Guidelines
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <aside className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#002D72] dark:text-blue-400" />

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-[#002D72] dark:text-blue-300">
              Before you post
            </h3>

            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Please be respectful, stay on topic, and avoid sharing personal
              information.{' '}
              <button
                type="button"
                onClick={() => setShowGuidelines(true)}
                className="inline-flex min-h-11 items-center font-semibold text-[#002D72] underline hover:text-blue-700 dark:text-blue-300"
              >
                Read Community Guidelines
              </button>
            </p>
          </div>
        </aside>
      )}

      {showGuidelines && (
        <CommunityGuidelinesModal onClose={() => setShowGuidelines(false)} />
      )}
    </>
  );
}
