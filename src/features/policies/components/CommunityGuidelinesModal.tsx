import { useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';

interface CommunityGuidelinesModalProps {
  onClose: () => void;
}

export function CommunityGuidelinesModal({
  onClose,
}: CommunityGuidelinesModalProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-guidelines-modal-title"
        className="relative z-10 flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-[#002D72] dark:bg-blue-950 dark:text-blue-300">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Community Safety & Guidelines
              </p>
              <h2
                id="community-guidelines-modal-title"
                className="font-semibold text-slate-900 dark:text-white"
              >
                Community Guidelines
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Community Guidelines"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <CommunityGuidelines variant="embedded" />
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Care Partner Connect
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#002D72] px-5 py-2 text-sm font-semibold text-white hover:bg-[#001D4A]"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}