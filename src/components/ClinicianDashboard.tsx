import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Send,
  User,
  Clock,
  Shield,
  MessageSquare,
  Users,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  QueueItem,
  CommunityGroup,
  RejectionReason,
  GroupMember,
  PrivateConversationMessage,
} from '../types';
import { api } from '../services/api';

interface ClinicianDashboardProps {
  cohorts: CommunityGroup[];
  onQueueUpdated: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  cohorts,
  onQueueUpdated,
  onOpenInvite,
  onOpenAudit,
}) => {
  // Main dashboard sub-tabs: 'queue' | 'members' | 'messages'
  const [activeTab, setActiveTab] = useState<'queue' | 'members' | 'messages'>('queue');

  // ----------------------------------------------------
  // TAB 1: PENDING QUEUE & REVIEW
  // ----------------------------------------------------
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [sanitizedDraft, setSanitizedDraft] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [moderatorNotes, setModeratorNotes] = useState('');

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionCode, setRejectionCode] = useState<RejectionReason>('CLINICAL_MEDICATION_QUERY');
  const [customRejectionText, setCustomRejectionText] = useState('');
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const activeItem = queueItems[selectedIndex] || null;

  // ----------------------------------------------------
  // TAB 2: GROUPS & MEMBERS MANAGEMENT
  // ----------------------------------------------------
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reassigningUser, setReassigningUser] = useState<GroupMember | null>(null);
  const [targetNewGroupId, setTargetNewGroupId] = useState('');

  // ----------------------------------------------------
  // TAB 3: PRIVATE 1-ON-1 CHAT WITH CAREGIVERS
  // ----------------------------------------------------
  const [activeChatCaregiverId, setActiveChatCaregiverId] = useState<string>('user-care-1');
  const [chatMessages, setChatMessages] = useState<PrivateConversationMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Load Queue
  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.getModerationQueue();
      setQueueItems(res.items || []);
      if (res.items && res.items.length > 0) {
        setSelectedIndex(0);
        initItemState(res.items[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Load Members
  const loadMembers = async (groupId?: string) => {
    setLoadingMembers(true);
    try {
      const res = await api.getGroupMembers(groupId);
      setMembers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Load Chat Messages
  const loadChat = async (caregiverId: string) => {
    setLoadingChat(true);
    try {
      const msgs = await api.getPrivateChat(caregiverId);
      setChatMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadMembers();
    loadChat(activeChatCaregiverId);
  }, []);

  const initItemState = (item: QueueItem) => {
    setSanitizedDraft(item.sanitizedContent || item.rawContent);
    const defaultGroups = [item.suggestedCohort.id];
    const general = cohorts.find((c) => c.isGeneralBoard);
    if (general && !defaultGroups.includes(general.id)) {
      defaultGroups.push(general.id);
    }
    setSelectedGroupIds(defaultGroups);
    setModeratorNotes('');
  };

  useEffect(() => {
    if (activeItem) {
      initItemState(activeItem);
    }
  }, [selectedIndex, activeItem?.id]);

  useEffect(() => {
    loadChat(activeChatCaregiverId);
  }, [activeChatCaregiverId]);

  const cannedTemplates: Record<RejectionReason, string> = {
    CLINICAL_MEDICATION_QUERY:
      'Prescription medications and drug dosages cannot be evaluated on this peer forum. Dr. Seema’s clinical team has been notified. For urgent issues, please call the Clinic Caregiver Support Line at (410) 555-FTDC.',
    UNVERIFIED_TREATMENT:
      'To safeguard vulnerable caregivers from misinformation and financial exploitation, our clinic only approves scientifically verified clinical protocols.',
    POTENTIAL_PHI_EXPOSURE:
      'Your post contains sensitive personal identifying information (e.g. personal telephone, street address, or full patient legal name) which breaches privacy policies.',
    FAMILY_DYNAMICS_OUT_OF_SCOPE:
      'This discussion centers on acute personal family disputes outside the scope of dementia clinical management.',
    INAPPROPRIATE_LANGUAGE:
      'This post contains language that does not meet our community standards for a compassionate, supportive care partner environment.',
    OTHER:
      'Your submission could not be approved at this time. Please contact Dr. Seema’s team for additional clarification.',
  };

  const handleAutoRedactPii = () => {
    if (!activeItem || !activeItem.phiAlerts) return;
    let redacted = activeItem.rawContent;
    redacted = redacted.replace(/(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g, '[Phone Redacted]');
    redacted = redacted.replace(/\b\d+\s+([A-Za-z0-9\s]+)?(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/gi, '[Local Address Redacted]');
    redacted = redacted.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g, '[Email Redacted]');
    redacted = redacted.replace(/\b(my husband|my wife|my father|my mother)\s+([A-Z][a-z]+)\b/gi, '$1 [Name Redacted]');

    setSanitizedDraft(redacted);
    setActionSuccessNotice('Flagged personal details sanitized.');
    setTimeout(() => setActionSuccessNotice(null), 3000);
  };

  const handleApprove = async () => {
    if (!activeItem) return;
    try {
      await api.performModerationAction({
        entityId: activeItem.id,
        entityType: 'POST',
        action: 'APPROVE',
        assignedGroupIds: selectedGroupIds,
        sanitizedContent: sanitizedDraft,
        moderatorNotes,
      });

      setActionSuccessNotice(`Post "${activeItem.title}" approved & published.`);
      setTimeout(() => setActionSuccessNotice(null), 3000);
      onQueueUpdated();
      loadQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to approve post');
    }
  };

  const handleConfirmReject = async () => {
    if (!activeItem) return;
    const msg = customRejectionText || cannedTemplates[rejectionCode];

    try {
      await api.performModerationAction({
        entityId: activeItem.id,
        entityType: 'POST',
        action: 'REJECT',
        rejectionCode,
        rejectionMessage: msg,
        moderatorNotes,
      });

      setShowRejectModal(false);
      setActionSuccessNotice('Post rejected. Private explanation delivered to author.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
      onQueueUpdated();
      loadQueue();
    } catch (err) {
      console.error(err);
      alert('Failed to reject post');
    }
  };

  // Direct private outreach from review card
  const handleOpenPrivateChatFromPost = () => {
    if (!activeItem) return;
    setActiveChatCaregiverId(activeItem.author.userId);
    setActiveTab('messages');
  };

  // Send private chat message
  const handleSendPrivateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    try {
      await api.sendPrivateChatMessage({
        caregiverId: activeChatCaregiverId,
        senderId: 'user-clinician-1',
        content: chatInputText.trim(),
      });
      setChatInputText('');
      loadChat(activeChatCaregiverId);
    } catch (err) {
      console.error(err);
    }
  };

  // Reassign member cohort
  const handleReassignGroup = async () => {
    if (!reassigningUser || !targetNewGroupId) return;

    try {
      await api.updateMemberGroup(reassigningUser.userId, targetNewGroupId);
      const newGroupName = cohorts.find((c) => c.id === targetNewGroupId)?.name || targetNewGroupId;
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === reassigningUser.userId
            ? { ...m, primaryGroupId: targetNewGroupId, primaryGroupName: newGroupName }
            : m
        )
      );
      setReassigningUser(null);
      setActionSuccessNotice(`Reassigned member to ${newGroupName}`);
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeChatMember = members.find((m) => m.userId === activeChatCaregiverId) || {
    userId: activeChatCaregiverId,
    realName: 'Sarah Smith',
    anonymousHandle: 'CarePartner-882',
    primaryGroupName: 'Baltimore Metro Cohort',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Dr. Seema's Moderation Console
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Clinical review, regional cohort management, and private caregiver support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInvite}
            className="px-3 py-1.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite Caregiver</span>
          </button>
          <button
            onClick={onOpenAudit}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            Audit Log
          </button>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between animate-in fade-in">
          <span>{actionSuccessNotice}</span>
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
      )}

      {/* DASHBOARD TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'border-[#002D72] text-[#002D72]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Pending Review</span>
          {queueItems.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {queueItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'border-[#002D72] text-[#002D72]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Groups & Members</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-2 px-1 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'messages'
              ? 'border-[#002D72] text-[#002D72]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Private Messages</span>
        </button>
      </div>

      {/* ------------------------------------------------- */}
      {/* TAB 1: PENDING QUEUE & REVIEW */}
      {/* ------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {loadingQueue ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading pending items...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              <div className="font-semibold text-slate-800 text-sm">All caught up!</div>
              <p className="text-slate-400">No submissions are waiting in the moderation queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Column: Queue List (4 cols) */}
              <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="p-3 bg-slate-50 text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Pending Submissions</span>
                  <button onClick={loadQueue} className="text-slate-400 hover:text-slate-600">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                  {queueItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3 transition space-y-1 ${
                        idx === selectedIndex ? 'bg-blue-50/70 border-l-4 border-l-[#002D72]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900 truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{item.author.realName}</span>
                        <span className="font-mono text-[10px] text-[#002D72]">{item.author.clinicPatientId}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.suggestedCohort.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Review & Action Panel (8 cols) */}
              <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
                {activeItem ? (
                  <>
                    {/* Author Medical Info */}
                    <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1 border border-slate-100">
                      <div className="font-semibold text-slate-900 text-sm">{activeItem.title}</div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                        <div>Caregiver: <strong>{activeItem.author.realName}</strong></div>
                        <div>Clinic ID: <strong className="font-mono text-[#002D72]">{activeItem.author.clinicPatientId}</strong></div>
                        <div>Handle: <span className="font-mono">{activeItem.author.anonymousHandle}</span></div>
                        <div>Phone: <span>{activeItem.author.phone}</span></div>
                      </div>
                    </div>

                    {/* PII Alert Warning if detected */}
                    {activeItem.phiAlerts && activeItem.phiAlerts.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1 text-amber-900">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            <span>{activeItem.phiAlerts.length} Flagged Privacy Details</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoRedactPii}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold"
                          >
                            Redact Details
                          </button>
                        </div>
                        <div className="text-[11px] text-amber-800 space-y-0.5">
                          {activeItem.phiAlerts.map((a, i) => (
                            <div key={i}>• "{a.text}" ({a.explanation})</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Original Submitted Text */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Submitted Text
                      </label>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans">
                        {activeItem.rawContent}
                      </div>
                    </div>

                    {/* Editable Sanitized Text */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-[#002D72] uppercase tracking-wider">
                        Sanitized Text for Community
                      </label>
                      <textarea
                        rows={3}
                        value={sanitizedDraft}
                        onChange={(e) => setSanitizedDraft(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg border border-blue-200 bg-blue-50/20 focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans"
                      />
                    </div>

                    {/* Target Group Assignment */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        Post to Cohort:
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {cohorts.map((c) => {
                          const isSelected = selectedGroupIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedGroupIds(selectedGroupIds.filter((id) => id !== c.id));
                                } else {
                                  setSelectedGroupIds([...selectedGroupIds, c.id]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-md border text-xs transition ${
                                isSelected
                                  ? 'bg-[#002D72] text-white border-[#002D72] font-medium'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve & Publish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowRejectModal(true)}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenPrivateChatFromPost}
                        className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Message Privately</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* TAB 2: GROUPS & MEMBERS MANAGEMENT */}
      {/* ------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Care Partner Community Members
              </h3>
              <p className="text-xs text-slate-500">
                Manage caregiver cohort assignments and access.
              </p>
            </div>

            {/* Filter by group */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="member-cohort-filter" className="text-xs text-slate-500 whitespace-nowrap">Cohort:</label>
              <select
                id="member-cohort-filter"
                value={selectedGroupFilter}
                onChange={(e) => {
                  setSelectedGroupFilter(e.target.value);
                  loadMembers(e.target.value);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="all">All Regional Cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Caregiver</th>
                  <th className="p-3">Public Handle</th>
                  <th className="p-3">Clinic Patient ID</th>
                  <th className="p-3">Primary Cohort</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.userId} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{m.realName}</div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {m.anonymousHandle}
                    </td>
                    <td className="p-3 font-mono text-[#002D72]">
                      {m.clinicPatientId || 'JHM-ON-FILE'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {m.primaryGroupName}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setReassigningUser(m);
                          setTargetNewGroupId(m.primaryGroupId);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-white"
                      >
                        Reassign Group
                      </button>
                      <button
                        onClick={() => {
                          setActiveChatCaregiverId(m.userId);
                          setActiveTab('messages');
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-[#002D72] hover:bg-blue-50 border border-blue-200 rounded"
                      >
                        Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reassign Modal */}
          {reassigningUser && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-3">
                <h4 className="font-semibold text-sm text-slate-900">
                  Reassign {reassigningUser.realName}
                </h4>
                <p className="text-xs text-slate-500">
                  Select new primary geographic cohort for this care partner:
                </p>

                <select
                  value={targetNewGroupId}
                  onChange={(e) => setTargetNewGroupId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isGeneralBoard ? '(Global)' : `(${c.geographicRegion})`}
                    </option>
                  ))}
                </select>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReassigningUser(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassignGroup}
                    className="px-3.5 py-1.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Save Assignment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------- */}
      {/* TAB 3: PRIVATE 1-ON-1 CHAT WITH CAREGIVERS */}
      {/* ------------------------------------------------- */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 min-h-[500px] overflow-hidden">
          {/* Caregivers List (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-200 divide-y divide-slate-100 flex flex-col">
            <div className="p-3 bg-slate-50 text-xs font-semibold text-slate-600">
              Caregiver Conversations
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {members.map((m) => {
                const isSelected = m.userId === activeChatCaregiverId;
                return (
                  <button
                    key={m.userId}
                    onClick={() => setActiveChatCaregiverId(m.userId)}
                    className={`w-full text-left p-3 transition space-y-0.5 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-l-[#002D72]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
                      <span>{m.realName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{m.anonymousHandle}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {m.primaryGroupName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Stream & Input (8 cols) */}
          <div className="md:col-span-8 flex flex-col h-[500px]">
            {/* Chat header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="font-semibold text-xs text-slate-900">
                  {activeChatMember.realName} ({activeChatMember.anonymousHandle})
                </div>
                <div className="text-[11px] text-slate-500">
                  Confidential Clinician Direct Channel • Dr. Seema Gulyani
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  No previous messages. Send a message to start private communication.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isClinician = msg.senderRole === 'CLINICIAN_MODERATOR';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClinician ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                          isClinician
                            ? 'bg-[#002D72] text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        <div className="font-semibold text-[10px] pb-1 opacity-80">
                          {msg.senderName}
                        </div>
                        <div className="whitespace-pre-line font-sans">{msg.content}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 px-2 mt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendPrivateChat} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder={`Send private clinical message to ${activeChatMember.realName}...`}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
              />
              <button
                type="submit"
                disabled={!chatInputText.trim()}
                className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CANNED REJECTION MODAL */}
      {showRejectModal && activeItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-3.5">
            <h3 className="font-semibold text-sm text-slate-900">
              Reject Caregiver Submission
            </h3>

            <select
              value={rejectionCode}
              onChange={(e) => {
                const code = e.target.value as RejectionReason;
                setRejectionCode(code);
                setCustomRejectionText(cannedTemplates[code]);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
            >
              <option value="CLINICAL_MEDICATION_QUERY">Prescription / Medication Question</option>
              <option value="UNVERIFIED_TREATMENT">Unproven Supplement / Treatment</option>
              <option value="POTENTIAL_PHI_EXPOSURE">Potential PHI Exposure</option>
              <option value="FAMILY_DYNAMICS_OUT_OF_SCOPE">Family Dispute Out of Scope</option>
              <option value="INAPPROPRIATE_LANGUAGE">Inappropriate Language</option>
              <option value="OTHER">Other Clinical Reason</option>
            </select>

            <textarea
              rows={3}
              value={customRejectionText || cannedTemplates[rejectionCode]}
              onChange={(e) => setCustomRejectionText(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 font-sans"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
