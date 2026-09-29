import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  Clock,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { DirectMessage, QueueItem, CurrentUser } from '../types';
import { api } from '../services/api';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  notifications: DirectMessage[];
  pendingQueue: QueueItem[];
  onRefreshNotifications: () => void;
  onQueueUpdated: () => void;
  onNavigateToConsole?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  pendingQueue,
  onRefreshNotifications,
  onQueueUpdated,
  onNavigateToConsole,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const isClinician = currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Approve directly from notification
  const handleQuickApprove = async (item: QueueItem) => {
    setProcessingId(item.id);
    try {
      await api.performModerationAction({
        entityId: item.id,
        entityType: 'POST',
        action: 'APPROVE',
        assignedGroupIds: item.assignedGroupIds,
        sanitizedContent: item.sanitizedContent || item.rawContent,
      });
      setFeedbackToast(`Approved "${item.title}"`);
      setTimeout(() => setFeedbackToast(null), 3000);
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to quick approve:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Reject directly from notification
  const handleQuickReject = async (item: QueueItem) => {
    setProcessingId(item.id);
    try {
      await api.performModerationAction({
        entityId: item.id,
        entityType: 'POST',
        action: 'REJECT',
        rejectionCode: 'CLINICAL_MEDICATION_QUERY',
        rejectionMessage:
          'This query contains prescription medication or medical dosing questions that must be handled by Dr. Seema’s clinic team.',
      });
      setFeedbackToast(`Rejected "${item.title}"`);
      setTimeout(() => setFeedbackToast(null), 3000);
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to quick reject:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-slate-700" />
            <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900">
              Notifications
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between">
            <span>{feedbackToast}</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* SECTION 1: PENDING SUBMISSIONS FOR CLINICIANS */}
          {isClinician && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-800">
                  Pending Submissions ({pendingQueue.length})
                </span>
                {onNavigateToConsole && pendingQueue.length > 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToConsole();
                    }}
                    className="text-xs font-semibold text-[#002D72] hover:underline flex items-center gap-1"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {pendingQueue.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs sm:text-sm text-slate-500">
                  No submissions currently waiting in the moderation queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingQueue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs sm:text-sm space-y-2.5"
                    >
                      {/* Submitter info */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {item.author.realName} · {item.author.anonymousHandle}
                        </span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="font-semibold text-slate-900 text-sm">
                        {item.title}
                      </div>

                      {/* Snippet */}
                      <p className="text-slate-600 text-xs sm:text-sm line-clamp-2 leading-relaxed font-sans">
                        {item.sanitizedContent || item.rawContent}
                      </p>

                      {/* Quick controls */}
                      <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === item.id}
                          onClick={() => handleQuickApprove(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition"
                          title="Quick Approve & Publish"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          disabled={processingId === item.id}
                          onClick={() => handleQuickReject(item)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-medium text-xs flex items-center gap-1.5 transition"
                          title="Quick Reject"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: DIRECT NOTIFICATIONS & UPDATES */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              !isClinician && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No notifications in your inbox.
                </div>
              )
            ) : (
              notifications.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => !msg.read && handleMarkRead(msg.id)}
                  className={`p-4 rounded-xl border text-sm space-y-2 cursor-pointer transition ${
                    msg.read
                      ? 'bg-white border-slate-200 text-slate-600'
                      : 'bg-blue-50/40 border-blue-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      {msg.type === 'APPROVAL' && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {msg.type === 'REJECTION' && (
                        <X className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      {msg.type !== 'APPROVAL' && msg.type !== 'REJECTION' && (
                        <Bell className="w-4 h-4 text-[#002D72] shrink-0" />
                      )}
                      <span className="text-slate-900 text-sm font-semibold">{msg.title}</span>
                    </div>
                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full bg-[#002D72] shrink-0" />
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700 font-sans">
                    {msg.message}
                  </p>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500">
            Johns Hopkins FTD Care Partner Circle
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs sm:text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
