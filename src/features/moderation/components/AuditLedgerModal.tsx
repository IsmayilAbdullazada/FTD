import { reportError } from '@/shared/lib/logger';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  FileCheck,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { ModerationAuditEvent } from '@/types';

interface AuditLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [events, setEvents] = useState<ModerationAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogFocus(isOpen, onClose);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await moderationApi.getAuditEvents();
      setEvents(data);
    } catch (err) {
      reportError('Failed to load audit ledger:', err);
      setError('Could not load activity log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Moderation Activity Ledger"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors outline-none"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-[#002D72] dark:text-blue-400" />
            <div>
              <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white">
                Moderation Activity Ledger
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Record of clinician triage decisions and safety reviews.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAudit}
              aria-label="Refresh activity log"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Close activity log"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-label="Moderation activity records"
          className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 text-sm"
        >
          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              Loading audit records...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="my-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={loadAudit}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              No audit events recorded yet.
            </div>
          ) : (
            events.map((evt) => {
              const formatLabel = (raw: string) =>
                raw
                  .toLowerCase()
                  .split('_')
                  .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
                  .join(' ');
              const shortEntityId =
                evt.entityId.length > 18
                  ? `${evt.entityId.slice(0, 14)}…`
                  : evt.entityId;
              return (
                <div
                  key={evt.id}
                  className="py-3.5 space-y-1.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded tracking-wide ${
                          evt.actionTaken === 'APPROVE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : evt.actionTaken === 'REJECT'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              : evt.actionTaken === 'CLINICAL_REDIRECT'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {formatLabel(evt.actionTaken)}
                      </span>
                      <span
                        className="font-semibold text-slate-800 dark:text-slate-200"
                        title={evt.entityId}
                      >
                        {formatLabel(evt.entityType)}{' '}
                        <span className="font-mono text-xs font-normal text-slate-500 dark:text-slate-400">
                          ({shortEntityId})
                        </span>
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(evt.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Moderator:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {evt.moderatorName}
                      </strong>
                    </span>
                    {evt.reason && (
                      <span className="text-slate-600 dark:text-slate-300 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Reason: {formatLabel(evt.reason)}
                      </span>
                    )}
                  </div>

                  {evt.notes && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750 font-sans leading-relaxed">
                      {evt.notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
