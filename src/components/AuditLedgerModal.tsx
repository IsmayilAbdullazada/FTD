import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ShieldAlert,
  Clock,
  User,
  X,
  RefreshCw,
} from 'lucide-react';
import { ModerationAuditEvent } from '../types';
import { api } from '../services/api';

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

  const loadAudit = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit ledger:', err);
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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default"
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-[#002D72]" />
            <div>
              <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900">
                Moderation Activity Ledger
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Record of clinician triage decisions and safety reviews.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAudit}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100 text-xs">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading audit records...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No audit events recorded yet.</div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="py-3.5 space-y-1.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                      evt.actionTaken === 'APPROVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.actionTaken === 'REJECT'
                        ? 'bg-rose-100 text-rose-800'
                        : evt.actionTaken === 'CLINICAL_REDIRECT'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {evt.actionTaken}
                    </span>
                    <span className="font-bold text-slate-800">
                      Entity: {evt.entityType} ({evt.entityId})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(evt.createdAt).toLocaleString()}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Moderator: <strong className="text-slate-700">{evt.moderatorName}</strong></span>
                  {evt.reason && (
                    <span className="text-slate-500 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                      Reason: {evt.reason}
                    </span>
                  )}
                </div>

                {evt.notes && (
                  <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans leading-relaxed">
                    {evt.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-medium transition"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
