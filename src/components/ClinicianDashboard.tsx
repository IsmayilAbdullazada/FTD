import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Users,
  Search,
  Plus,
  Layers,
  MapPin,
  AlertTriangle,
  Phone,
  Check,
  X,
  Sparkles,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import {
  QueueItem,
  CommunityGroup,
  RejectionReason,
  GroupMember,
} from '../types';
import { api } from '../services/api';

interface ClinicianDashboardProps {
  cohorts: CommunityGroup[];
  onQueueUpdated: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
  onCohortCreated?: () => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  cohorts,
  onQueueUpdated,
  onOpenInvite,
  onOpenAudit,
  onCohortCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'cohorts' | 'members'>('queue');

  // Review Queue State
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

  // Groups and Members State
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [reassigningUser, setReassigningUser] = useState<GroupMember | null>(null);
  const [targetNewGroupId, setTargetNewGroupId] = useState('');

  // Create Group Modal State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRegion, setNewGroupRegion] = useState('');
  const [newGroupRadius, setNewGroupRadius] = useState('35');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

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

  useEffect(() => {
    loadQueue();
    loadMembers();
  }, []);

  const initItemState = (item: QueueItem) => {
    setSanitizedDraft(item.sanitizedContent || item.rawContent);
    setSelectedGroupIds(
      item.assignedGroupIds && item.assignedGroupIds.length > 0
        ? item.assignedGroupIds
        : cohorts.slice(0, 1).map((c) => c.id)
    );
    setModeratorNotes('');
  };

  const handleSelectItem = (idx: number) => {
    setSelectedIndex(idx);
    initItemState(queueItems[idx]);
  };

  // Publish post
  const handlePublish = async () => {
    if (!activeItem) return;

    try {
      const res = await api.performModerationAction({
        entityId: activeItem.id,
        entityType: 'POST',
        action: 'APPROVE',
        assignedGroupIds: selectedGroupIds,
        sanitizedContent: sanitizedDraft,
        moderatorNotes,
      });

      setActionSuccessNotice(res.message || 'Post published.');
      setTimeout(() => setActionSuccessNotice(null), 3500);

      onQueueUpdated();
      await loadQueue();
    } catch (err) {
      console.error('Failed to publish:', err);
      setActionSuccessNotice('Error publishing post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Reject
  const handleConfirmReject = async () => {
    if (!activeItem) return;

    try {
      const res = await api.performModerationAction({
        entityId: activeItem.id,
        entityType: 'POST',
        action: 'REJECT',
        rejectionCode,
        rejectionMessage:
          customRejectionText.trim() ||
          'Your post could not be shared publicly. Please review the note from Dr. Seema.',
        moderatorNotes,
      });

      setShowRejectModal(false);
      setCustomRejectionText('');
      setActionSuccessNotice(res.message || 'Post rejected.');
      setTimeout(() => setActionSuccessNotice(null), 3500);

      onQueueUpdated();
      await loadQueue();
    } catch (err) {
      console.error('Failed to reject:', err);
      setActionSuccessNotice('Error rejecting post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Redirect to Clinic Support Line
  const handleClinicRedirect = async () => {
    if (!activeItem) return;

    try {
      const res = await api.performModerationAction({
        entityId: activeItem.id,
        entityType: 'POST',
        action: 'CLINICAL_REDIRECT',
        moderatorNotes: 'Diverted to clinic phone support (410) 555-FTDC.',
      });

      setActionSuccessNotice('Caregiver notified to contact the clinic line.');
      setTimeout(() => setActionSuccessNotice(null), 4000);

      onQueueUpdated();
      await loadQueue();
    } catch (err) {
      console.error('Failed clinic redirect:', err);
      setActionSuccessNotice('Error updating post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Auto clean personal info
  const handleCleanPersonalInfo = () => {
    if (!activeItem) return;
    let cleaned = activeItem.rawContent;
    activeItem.phiAlerts.forEach((alertItem) => {
      cleaned = cleaned.replace(new RegExp(alertItem.text, 'gi'), `[${alertItem.type} removed]`);
    });
    setSanitizedDraft(cleaned);
  };

  // Reassign Group
  const handleConfirmReassign = async () => {
    if (!reassigningUser || !targetNewGroupId) return;
    try {
      await api.updateMemberGroup(reassigningUser.userId, targetNewGroupId);
      setReassigningUser(null);
      setTargetNewGroupId('');
      setActionSuccessNotice(`Member moved to new group.`);
      setTimeout(() => setActionSuccessNotice(null), 3000);
      loadMembers(selectedCohortFilter);
    } catch (err) {
      console.error(err);
      setActionSuccessNotice('Failed to update member group. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Create Group Handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isSubmittingGroup) return;

    setIsSubmittingGroup(true);
    try {
      const slug = newGroupName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      await api.createCohort({
        name: newGroupName.trim(),
        slug,
        description: newGroupDescription.trim() || `Local group for ${newGroupRegion.trim() || newGroupName.trim()} caregivers.`,
        geographicRegion: newGroupRegion.trim() || 'Local Area',
        radiusMiles: Number(newGroupRadius) || 35,
        tag: 'GEO_CUSTOM',
      });

      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupRegion('');
      setNewGroupDescription('');
      setActionSuccessNotice(`Group "${newGroupName}" created.`);
      setTimeout(() => setActionSuccessNotice(null), 4000);

      if (onCohortCreated) onCohortCreated();
      loadMembers();
    } catch (err) {
      console.error('Failed to create group:', err);
      setActionSuccessNotice('Could not create group. Please check inputs and try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchMemberQuery.toLowerCase();
    const matchesSearch =
      m.realName.toLowerCase().includes(q) ||
      m.anonymousHandle.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.phone || '').toLowerCase().includes(q);
    const matchesGroup =
      selectedCohortFilter === 'all' || m.primaryGroupId === selectedCohortFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </button>

          <button
            onClick={onOpenInvite}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>Invite Member</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap"
          >
            Activity Log
          </button>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div
          onClick={() => setActiveTab('queue')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Pending Posts</span>
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{queueItems.length}</span>
            <span className="text-xs sm:text-sm text-slate-500">
              {queueItems.length === 1 ? 'needs review' : 'need review'}
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('cohorts')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'cohorts'
              ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Groups</span>
            <Layers className="w-4 h-4 text-[#002D72]" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{cohorts.length}</span>
            <span className="text-xs sm:text-sm text-slate-500">active</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('members')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Members</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{members.length}</span>
            <span className="text-xs sm:text-sm text-slate-500">caregivers</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto no-scrollbar flex-nowrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'queue'
                ? 'border-[#002D72] text-[#002D72]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Pending Posts</span>
            {queueItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold tabular-nums">
                {queueItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cohorts')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'cohorts'
                ? 'border-[#002D72] text-[#002D72]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Groups</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tabular-nums">
              {cohorts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'members'
                ? 'border-[#002D72] text-[#002D72]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Members</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tabular-nums">
              {members.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING POSTS */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {loadingQueue ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Loading posts...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Check className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                No posts waiting
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All caregiver submissions have been reviewed and published.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Post list */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-semibold text-slate-600 px-1">
                  Posts to review ({queueItems.length})
                </div>

                <div className="space-y-2">
                  {queueItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const hasPhi = item.phiAlerts && item.phiAlerts.length > 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(idx)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition space-y-1.5 ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#002D72]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900">
                            {item.author.realName}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {item.title}
                        </div>

                        <p className="text-slate-500 line-clamp-2 text-[11px] leading-relaxed">
                          {item.rawContent}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>{item.author.anonymousHandle}</span>
                          {hasPhi && (
                            <span className="text-amber-700 bg-amber-100 font-medium px-1.5 py-0.5 rounded text-[10px]">
                              Personal info found
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Review details */}
              {activeItem && (
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-5">
                  {/* Author Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {activeItem.author.realName}{' '}
                        <span className="font-normal text-slate-500 text-xs">
                          (Shown as: {activeItem.author.anonymousHandle})
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>Phone: {activeItem.author.phone}</span>
                        <span>•</span>
                        <span>Email: {activeItem.author.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Original Question */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Original post
                    </label>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-900 text-sm">
                        {activeItem.title}
                      </div>
                      <p className="text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                        {activeItem.rawContent}
                      </p>
                    </div>

                    {/* Personal info alert */}
                    {activeItem.phiAlerts && activeItem.phiAlerts.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            <span>Personal details detected ({activeItem.phiAlerts.length})</span>
                          </span>
                          <button
                            onClick={handleCleanPersonalInfo}
                            className="text-xs text-[#002D72] font-semibold hover:underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Remove personal info</span>
                          </button>
                        </div>
                        <ul className="text-[11px] text-amber-800 space-y-1">
                          {activeItem.phiAlerts.map((alertItem, i) => (
                            <li key={i}>
                              • Found "{alertItem.text}" ({alertItem.type}) — {alertItem.explanation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Public Text to Publish */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700">
                        Public post text
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Community will see this text
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={sanitizedDraft}
                      onChange={(e) => setSanitizedDraft(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] leading-relaxed"
                    />
                  </div>

                  {/* Group */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Group
                    </label>
                    <select
                      value={selectedGroupIds[0] || cohorts[0]?.id}
                      onChange={(e) => setSelectedGroupIds([e.target.value])}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                    >
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.name} • {cohort.geographicRegion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Private note */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Private note (optional)
                    </label>
                    <input
                      type="text"
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                      placeholder="Visible only to clinic staff"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePublish}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Check className="w-4 h-4" />
                        <span>Publish</span>
                      </button>

                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>

                    <button
                      onClick={handleClinicRedirect}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-700" />
                      <span>Call Clinic Line</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUPS */}
      {activeTab === 'cohorts' && (
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Community Groups
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Regional and clinic-wide support cohorts. Click any group card to view its enrolled members.
              </p>
            </div>

            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Group</span>
            </button>
          </div>

          {/* GROUPS CARDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 px-1">
              <span className="font-semibold text-slate-700">All Groups ({cohorts.length})</span>
              <span className="text-slate-400">Click a card to filter members</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {cohorts.map((cohort) => {
                const assignedCount = members.filter((m) => m.primaryGroupId === cohort.id).length;
                return (
                  <div
                    key={cohort.id}
                    onClick={() => {
                      setSelectedCohortFilter(cohort.id);
                      setActiveTab('members');
                    }}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3.5 flex flex-col justify-between cursor-pointer group hover:border-[#002D72] hover:shadow-xs transition-all text-left"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-serif font-semibold text-slate-900 text-base group-hover:text-[#002D72] transition">
                          {cohort.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-slate-600">
                          {assignedCount} {assignedCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cohort.geographicRegion}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed font-sans">
                        {cohort.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-500 group-hover:text-[#002D72] transition">
                      <span className="text-xs text-slate-400">Click to view members</span>
                      <span className="font-semibold text-xs flex items-center gap-1">
                        <span>View members</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">
                    Caregiver Members ({filteredMembers.length})
                  </h2>
                  {selectedCohortFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#002D72] text-xs font-medium flex items-center gap-1">
                      <span>Group: {cohorts.find((c) => c.id === selectedCohortFilter)?.name || selectedCohortFilter}</span>
                      <button
                        onClick={() => setSelectedCohortFilter('all')}
                        className="hover:text-rose-600 p-0.5 ml-0.5"
                        title="Clear group filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified care partners enrolled across Johns Hopkins cohorts.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search by name, handle, or contact..."
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  />
                </div>

                <select
                  value={selectedCohortFilter}
                  onChange={(e) => setSelectedCohortFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                >
                  <option value="all">All Groups</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.replace(/\s+Cohort$/i, '')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingMembers ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-slate-500 text-xs">No members found matching your search or filter.</p>
                {selectedCohortFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedCohortFilter('all')}
                    className="text-xs text-[#002D72] hover:underline font-semibold"
                  >
                    Clear group filter and show all
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-xs whitespace-nowrap">
                      <th className="py-2.5 px-3">Caregiver</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Assigned Group</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMembers.map((m) => (
                      <tr key={m.userId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{m.realName}</div>
                          <div className="text-xs text-slate-400">{m.anonymousHandle}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <div>{m.phone}</div>
                          <div className="text-xs text-slate-400">{m.email}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-800 font-medium whitespace-nowrap">
                          {m.primaryGroupName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setReassigningUser(m);
                              setTargetNewGroupId(m.primaryGroupId);
                            }}
                            className="px-2.5 py-1 text-xs text-[#002D72] hover:bg-blue-50 border border-slate-200 rounded-lg font-semibold transition"
                          >
                            Move group
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE GROUP */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden cursor-default"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <h3 className="font-semibold text-sm text-slate-900">
                Create a Group
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Group name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Annapolis Area"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location or County
                </label>
                <input
                  type="text"
                  value={newGroupRegion}
                  onChange={(e) => setNewGroupRegion(e.target.value)}
                  placeholder="e.g. Anne Arundel County"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Local peer support for families in this area."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || !newGroupName.trim()}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-lg font-semibold transition"
                >
                  {isSubmittingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REASSIGN MEMBER */}
      {reassigningUser && (
        <div
          onClick={() => setReassigningUser(null)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-4 space-y-4 cursor-default"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Move Member to Another Group
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Moving <strong>{reassigningUser.realName}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Select Group
              </label>
              <select
                value={targetNewGroupId}
                onChange={(e) => setTargetNewGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} • {c.geographicRegion}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReassigningUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT POST */}
      {showRejectModal && activeItem && (
        <div
          onClick={() => setShowRejectModal(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-4 sm:p-5 space-y-4 cursor-default"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900">
                Reject Post
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The author will receive a private explanation.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason
                </label>
                <select
                  value={rejectionCode}
                  onChange={(e) => setRejectionCode(e.target.value as RejectionReason)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white font-medium"
                >
                  <option value="CLINICAL_MEDICATION_QUERY">
                    Prescription or Medication Question
                  </option>
                  <option value="ACUTE_SAFETY_EMERGENCY">
                    Emergency or Safety Concern
                  </option>
                  <option value="UNVERIFIED_MEDICAL_ADVICE">
                    Unverified Medical Claim
                  </option>
                  <option value="EXPLICIT_PII_UNRESOLVED">
                    Personal Information
                  </option>
                  <option value="COMMERCIAL_SOLICITATION">
                    Promotional or Spam
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Note to Author (optional)
                </label>
                <textarea
                  rows={3}
                  value={customRejectionText}
                  onChange={(e) => setCustomRejectionText(e.target.value)}
                  placeholder="Explain why this post could not be shared publicly..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Reject Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
