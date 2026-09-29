import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  X,
  PhoneCall,
  Check,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
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
  onOpenPrivateChatWithCaregiver?: (caregiverId: string) => void;
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
  onOpenPrivateChatWithCaregiver,
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
          'This query contains prescription medication or medical dosing questions that must be handled privately by Dr. Seema’s clinic team.',
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

  // Quick Reply Privately directly from notification
  const handleQuickReply = (item: QueueItem) => {
    onClose();
    if (onOpenPrivateChatWithCaregiver) {
      onOpenPrivateChatWithCaregiver(item.author.userId);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700" />
            <h3 className="font-semibold text-sm text-slate-900">
              {isClinician ? 'Clinician Triage & Notifications' : 'Your Messages & Notifications'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedbackToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs px-4 py-2 flex items-center justify-between">
            <span>{feedbackToast}</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* SECTION 1: PENDING SUBMISSIONS FOR DR. SEEMA (Quick Controls) */}
          {isClinician && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Submissions Pending Review ({pendingQueue.length})</span>
                </span>
                {onNavigateToConsole && pendingQueue.length > 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToConsole();
                    }}
                    className="text-[11px] font-semibold text-[#002D72] hover:underline flex items-center gap-0.5"
                  >
                    <span>Full Console</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {pendingQueue.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No submissions currently waiting in the moderation queue.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingQueue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 text-xs space-y-2 shadow-2xs"
                    >
                      {/* Submitter info */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="font-semibold text-slate-900">
                          {item.author.realName} <span className="font-normal text-slate-500">({item.author.anonymousHandle})</span>
                        </div>
                        <span className="font-mono text-[#002D72] font-semibold text-[10px]">
                          {item.author.clinicPatientId}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="font-semibold text-slate-900 text-xs">
                        {item.title}
                      </div>

                      {/* Snippet */}
                      <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                        {item.sanitizedContent || item.rawContent}
                      </p>

                      {/* QUICK CONTROL ACTIONS */}
                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={processingId === item.id}
                            onClick={() => handleQuickApprove(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Quick Approve & Publish"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={processingId === item.id}
                            onClick={() => handleQuickReject(item)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Quick Reject"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickReply(item)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-semibold text-[11px] flex items-center gap-1 transition"
                          title="Message Caregiver Privately"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Reply Privately</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: DIRECT NOTIFICATIONS & UPDATES */}
          <div className="space-y-2">
            {isClinician && (
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-2">
                System & Clinic Alerts
              </div>
            )}

            {notifications.length === 0 ? (
              !isClinician && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No notifications in your private inbox.
                </div>
              )
            ) : (
              notifications.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => !msg.read && handleMarkRead(msg.id)}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 cursor-pointer transition ${
                    msg.read
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      {msg.type === 'APPROVAL' && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      {msg.type === 'REJECTION' && (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      {msg.type === 'CLINICAL_ESCALATION' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-slate-900">{msg.title}</span>
                    </div>
                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-700 font-sans">
                    {msg.message}
                  </p>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          {isClinician && onNavigateToConsole ? (
            <button
              onClick={() => {
                onClose();
                onNavigateToConsole();
              }}
              className="text-[#002D72] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Go to Moderator Console</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              Johns Hopkins FTD Care Partner Circle
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
