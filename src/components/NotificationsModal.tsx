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
  onNavigateToFeed?: () => void;
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
  onNavigateToFeed,
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
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white">
              Notifications
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm px-4 py-2.5 flex items-center justify-between">
            <span>{feedbackToast}</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* SECTION 1: PENDING SUBMISSIONS FOR CLINICIANS */}
          {isClinician && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Pending Submissions ({pendingQueue.length})
                </span>
                {onNavigateToConsole && pendingQueue.length > 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToConsole();
                    }}
                    className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {pendingQueue.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  No submissions currently waiting in the moderation queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingQueue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-xl p-4 text-xs sm:text-sm space-y-2.5"
                    >
                      {/* Submitter info */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
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
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {item.title}
                      </div>

                      {/* Snippet */}
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed font-sans">
                        {item.sanitizedContent || item.rawContent}
                      </p>

                      {/* Quick controls */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === item.id}
                          onClick={() => handleQuickApprove(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Quick Approve & Publish"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          disabled={processingId === item.id}
                          onClick={() => handleQuickReject(item)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
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
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
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
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      : 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      {msg.type === 'APPROVAL' && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {msg.type === 'REJECTION' && (
                        <X className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      )}
                      {msg.type !== 'APPROVAL' && msg.type !== 'REJECTION' && (
                        <Bell className="w-4 h-4 text-[#002D72] dark:text-blue-400 shrink-0" />
                      )}
                      <span className="text-slate-900 dark:text-white text-sm font-semibold">{msg.title}</span>
                    </div>
                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full bg-[#002D72] dark:bg-blue-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-sans">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!msg.read) handleMarkRead(msg.id);
                        onClose();
                        if (msg.type === 'APPROVAL' && onNavigateToFeed) {
                          onNavigateToFeed();
                        } else if (onNavigateToFeed) {
                          onNavigateToFeed();
                        }
                      }}
                      className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Open Discussions</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Hopkins Care Partner Connect
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-lg font-medium text-xs sm:text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
