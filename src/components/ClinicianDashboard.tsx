import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  Clock,
  Filter,
  Lock,
  LockOpen,
  Bot,
  BrainCircuit,
  FileText,
  UploadCloud,
  FileCode,
  Trash2,
  Eye,
  FileCheck,
  Copy,
  ToggleLeft,
  ToggleRight,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  CurrentUser,
  Audience,
  Condition,
  QueueItem,
  Post,
  CommunityGroup,
  RejectionReason,
  GroupMember,
  getProperGroupName,
  getFullGroupName,
  ChatbotGuideFile,
  ChatbotKnowledgeConfig,
  ChatbotKnowledgeSourceMode,
  ChatbotGuideTestResult,
} from '../types';
import { AudienceBadge } from './AudienceBadge';
import { api } from '../services/api';

interface ClinicianDashboardProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  onQueueUpdated: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
  onCohortCreated?: () => void;
  onOpenDiscussion?: (postId: string) => void;
}

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  currentUser,
  cohorts,
  onQueueUpdated,
  onOpenInvite,
  onOpenAudit,
  onCohortCreated,
  onOpenDiscussion,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'discussions' | 'cohorts' | 'members' | 'chatbot-knowledge'>('queue');
  const [audienceFilter, setAudienceFilter] = useState<'all' | Condition>('all');
  const [approveAudience, setApproveAudience] = useState<Audience>('FTD');

  // Review Queue State
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [sanitizedDraft, setSanitizedDraft] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [allowUnmoderatedReplies, setAllowUnmoderatedReplies] = useState(false);
  const [moderatorNotes, setModeratorNotes] = useState('');

  // Discussions & Reply Policy State
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchPostsQuery, setSearchPostsQuery] = useState('');
  const [postsPolicyFilter, setPostsPolicyFilter] = useState<'all' | 'moderated' | 'unmoderated' | 'closed'>('all');
  const [postToClose, setPostToClose] = useState<Post | null>(null);
  const [isTogglingClose, setIsTogglingClose] = useState(false);

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
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [npTitle, setNpTitle] = useState('');
  const [npContent, setNpContent] = useState('');
  const [npGroupId, setNpGroupId] = useState('');
  const [npAudience, setNpAudience] = useState<Audience | ''>('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Chatbot Knowledge Management State
  const [chatbotGuides, setChatbotGuides] = useState<ChatbotGuideFile[]>([]);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotKnowledgeConfig>({
    sourceMode: 'UPLOADED_GUIDES_ONLY',
    totalActiveGuides: 1,
    totalWords: 520,
  });
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guideSearchFilter, setGuideSearchFilter] = useState('');
  const [showUploadGuideModal, setShowUploadGuideModal] = useState(false);
  const [inspectGuideModal, setInspectGuideModal] = useState<ChatbotGuideFile | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<ChatbotGuideFile | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [isRestoringDefault, setIsRestoringDefault] = useState(false);

  // Upload Guide Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('GENERAL_CLINICAL_PROTOCOL');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploadingGuide, setIsUploadingGuide] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedPdfStats, setExtractedPdfStats] = useState<{ pages: number; words: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Chatbot Test Simulator State
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ChatbotGuideTestResult | null>(null);
  const [copiedInspect, setCopiedInspect] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const [queueRes, memberRes] = await Promise.all([
        api.getModerationQueue(),
        api.getGroupMembers(),
      ]);

      const items = queueRes.items || [];
      const filteredItems = audienceFilter === 'all'
        ? items
        : items.filter((item) => {
            const author = memberRes.find(
              (m) => m.userId === item.author.userId
            );
            return author?.condition === audienceFilter;
          });

      setQueueItems(filteredItems);
      setSelectedIndex(0);

      if (filteredItems.length > 0) {
        initItemState(filteredItems[0]);
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
      const filtered = audienceFilter === 'all'
        ? res
        : res.filter((member) => member.condition === audienceFilter);
      setMembers(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadPublishedPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await api.getPosts({
        role: currentUser.role,
        userId: currentUser.id,
        condition: audienceFilter === 'all' ? undefined : audienceFilter,
      });
      setPublishedPosts(res.posts || []);
    } catch (err) {
      console.error('Failed to load published posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadChatbotGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await api.getChatbotGuides();
      setChatbotGuides(res.guides || []);
      setChatbotConfig(res.config);
    } catch (err) {
      console.error('Failed to load chatbot guides:', err);
    } finally {
      setLoadingGuides(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadMembers();
    loadPublishedPosts();
    loadChatbotGuides();
  }, [audienceFilter]);

  useEffect(() => {
    loadPublishedPosts();
  }, [audienceFilter]);

  const handleToggleGuide = async (guide: ChatbotGuideFile) => {
    try {
      const res = await api.toggleChatbotGuide(guide.id);
      setChatbotGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? { ...g, isActive: res.guide.isActive } : g))
      );
      setActionSuccessNotice(
        res.guide.isActive
          ? `Guide "${guide.title}" activated. Assistant will now use this document.`
          : `Guide "${guide.title}" paused. Assistant will not use this document.`
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
      loadChatbotGuides();
    } catch (err) {
      console.error('Failed to toggle guide:', err);
      setActionSuccessNotice('Could not update guide status.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    }
  };

  const handleRequestDeleteGuide = (guide: ChatbotGuideFile) => {
    setGuideToDelete(guide);
  };

  const handleConfirmDeleteGuide = async () => {
    if (!guideToDelete || isDeletingGuide) return;
    setIsDeletingGuide(true);
    try {
      await api.deleteChatbotGuide(guideToDelete.id);
      setChatbotGuides((prev) => prev.filter((g) => g.id !== guideToDelete.id));
      setActionSuccessNotice(`Guide "${guideToDelete.title}" successfully removed.`);
      setTimeout(() => setActionSuccessNotice(null), 3500);
      setGuideToDelete(null);
      await loadChatbotGuides();
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to delete guide:', err);
      setActionSuccessNotice('Could not delete clinical guide. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } finally {
      setIsDeletingGuide(false);
    }
  };

  const handleRestoreDefaultGuide = async () => {
    setIsRestoringDefault(true);
    try {
      await api.restoreDefaultChatbotGuide();
      await loadChatbotGuides();
      setActionSuccessNotice('Restored benchmark Johns Hopkins FTD protocol.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to restore default guide:', err);
      setActionSuccessNotice('Failed to restore default guide.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } finally {
      setIsRestoringDefault(false);
    }
  };

  const handleProcessFile = (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    setUploadFileName(file.name);

    const cleanDefaultTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    if (!uploadTitle.trim()) {
      setUploadTitle(cleanDefaultTitle);
    }

    if (isPdf) {
      setIsExtractingPdf(true);
      setExtractedPdfStats(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          const chunkSize = 8192;
          for (let i = 0; i < len; i += chunkSize) {
            const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
            binary += String.fromCharCode.apply(null, sub as unknown as number[]);
          }
          const base64 = btoa(binary);

          const result = await api.extractPdfText({
            fileName: file.name,
            fileBase64: base64,
          });

          setUploadContent(result.text);
          if (result.suggestedTitle && !uploadTitle.trim()) {
            setUploadTitle(result.suggestedTitle);
          }
          if (result.suggestedCategory) {
            setUploadCategory(result.suggestedCategory);
          }
          setExtractedPdfStats({ pages: result.pageCount, words: result.wordCount });
          setActionSuccessNotice(`Processed ${result.wordCount.toLocaleString()} words from "${file.name}".`);
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } catch (err) {
          console.error('PDF extraction failed:', err);
          setActionSuccessNotice('Failed to extract PDF text. Please check the file.');
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } finally {
          setIsExtractingPdf(false);
        }
      };
      reader.onerror = () => {
        setIsExtractingPdf(false);
        setActionSuccessNotice('Could not read PDF file.');
        setTimeout(() => setActionSuccessNotice(null), 3500);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsExtractingPdf(false);
      setExtractedPdfStats(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        setUploadContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmitUploadGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim() || isUploadingGuide) return;
    setIsUploadingGuide(true);
    try {
      const res = await api.uploadChatbotGuide({
        title: uploadTitle.trim(),
        fileName: uploadFileName.trim() || `${uploadTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        category: uploadCategory,
        description: uploadDescription.trim(),
        content: uploadContent.trim(),
        mimeType: uploadFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain',
        uploadedBy: currentUser.id,
        uploadedByName: `${currentUser.firstName} ${currentUser.lastName}`,
      });
      setShowUploadGuideModal(false);
      setUploadTitle('');
      setUploadFileName('');
      setUploadDescription('');
      setUploadContent('');
      setActionSuccessNotice(`Clinical guide "${res.title}" uploaded! Dr. Seema's Assistant is now using this file.`);
      setTimeout(() => setActionSuccessNotice(null), 4500);
      loadChatbotGuides();
    } catch (err) {
      console.error('Failed to upload guide:', err);
      setActionSuccessNotice('Could not upload guide document. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsUploadingGuide(false);
    }
  };

  const handleRunTestQuery = async (queryToRun?: string) => {
    const q = (queryToRun ?? testQuery).trim();
    if (!q || isTesting) return;
    setTestQuery(q);
    setIsTesting(true);
    try {
      const res = await api.testChatbotGuideRetrieval(q);
      setTestResult(res);
    } catch (err) {
      console.error('Test query failed:', err);
      setActionSuccessNotice('Test query failed.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  const initItemState = (item: QueueItem) => {
    setApproveAudience(item.condition ?? 'FTD'); // default the approved audience to the author's group
    setSanitizedDraft(item.sanitizedContent || item.rawContent);
    setSelectedGroupIds(
      item.assignedGroupIds && item.assignedGroupIds.length > 0
        ? item.assignedGroupIds
        : cohorts.slice(0, 1).map((c) => c.id)
    );
    setAllowUnmoderatedReplies(item.allowUnmoderatedReplies ?? false);
    setModeratorNotes('');
  };

  const handleSelectItem = (idx: number) => {
    setSelectedIndex(idx);
    initItemState(queueItems[idx]);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!npTitle.trim() || !npContent.trim() || !npGroupId || !npAudience || isSubmittingPost) return;
    setIsSubmittingPost(true);
    try {
      await api.createPost({
        title: npTitle.trim(),
        content: npContent.trim(),
        targetCohortId: npGroupId,
        authorId: currentUser.id,
        condition: npAudience,
      });
      setShowNewPostModal(false);
      setNpTitle(''); setNpContent(''); setNpGroupId(''); setNpAudience('');
      setAudienceFilter('all');
      await loadPublishedPosts();
      setActiveTab('discussions');
      setActionSuccessNotice('Post published.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } catch (err) {
      console.error('Failed to create post:', err);
      setActionSuccessNotice('Could not publish post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsSubmittingPost(false);
    }
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
        condition: approveAudience,
        sanitizedContent: sanitizedDraft,
        allowUnmoderatedReplies,
        moderatorNotes,
      });

      setActionSuccessNotice(res.message || 'Post published.');
      setTimeout(() => setActionSuccessNotice(null), 3500);

      onQueueUpdated();
      await loadQueue();
      await loadPublishedPosts();
    } catch (err) {
      console.error('Failed to publish:', err);
      setActionSuccessNotice('Error publishing post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Toggle reply moderation policy for a post
  const handleTogglePostRepliesMode = async (post: Post) => {
    const newAllowUnmoderated = !post.allowUnmoderatedReplies;

    // Immediate state update so toggle switches immediately without waiting
    setPublishedPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, allowUnmoderatedReplies: newAllowUnmoderated } : p))
    );

    try {
      await api.togglePostUnmoderatedReplies(post.id, newAllowUnmoderated);
      setActionSuccessNotice(
        newAllowUnmoderated
          ? `Replies for "${post.title.slice(0, 32)}..." are now unmoderated (open to all).`
          : `Replies for "${post.title.slice(0, 32)}..." now require clinical moderation.`
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to update reply moderation policy:', err);
      // Revert if error
      setPublishedPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, allowUnmoderatedReplies: !newAllowUnmoderated } : p))
      );
      setActionSuccessNotice('Failed to update reply moderation policy.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  // Toggle discussion close state for a post
  const handleTogglePostClose = async (post: Post) => {
    setIsTogglingClose(true);
    const targetClosed = !post.isClosed;
    try {
      const res = await api.closePost(post.id, targetClosed, currentUser.id);
      setPublishedPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                isClosed: res.post.isClosed,
                closedAt: res.post.closedAt,
                closedBy: res.post.closedBy,
              }
            : p
        )
      );
      setActionSuccessNotice(
        targetClosed
          ? `Discussion "${post.title.slice(0, 32)}..." closed. New replies are now disabled.`
          : `Discussion "${post.title.slice(0, 32)}..." reopened. Care partners can reply again.`
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
      setPostToClose(null);
    } catch (err) {
      console.error('Failed to toggle post closed state:', err);
      setActionSuccessNotice('Failed to update discussion status.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsTogglingClose(false);
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

  // Helper to escape regex special characters
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Auto clean personal info
  const handleCleanPersonalInfo = () => {
    if (!activeItem) return;
    let cleaned = sanitizedDraft && sanitizedDraft.trim().length > 0 ? sanitizedDraft : activeItem.rawContent;
    if (activeItem.phiAlerts && activeItem.phiAlerts.length > 0) {
      activeItem.phiAlerts.forEach((alertItem) => {
        if (alertItem.text) {
          const escaped = escapeRegExp(alertItem.text.trim());
          cleaned = cleaned.replace(new RegExp(escaped, 'gi'), `[${alertItem.type} removed]`);
        }
      });
    }

    // Comprehensive fallback for phone numbers (e.g. (410) 555-9122, 410-555-9122) and emails
    const phonePattern = /(?:\+?1[-.\s]*)?(?:\(\d{3}\)|\b\d{3}\b)[-.\s]*\d{3}[-.\s]*\d{4}\b/g;
    cleaned = cleaned.replace(phonePattern, '[PHONE removed]');
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    cleaned = cleaned.replace(emailPattern, '[EMAIL removed]');

    setSanitizedDraft(cleaned);
    setActionSuccessNotice('Personal details removed from draft.');
    setTimeout(() => setActionSuccessNotice(null), 3000);
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
    const matchesCondition = audienceFilter === 'all' || m.condition === audienceFilter;
    return matchesSearch && matchesGroup && matchesCondition;
  });

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 space-y-4 sm:space-y-5 transition-colors">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowNewPostModal(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>New Post</span>
          </button>

          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>New Group</span>
          </button>

          <button
            onClick={onOpenInvite}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
            <span>Invite Member</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer"
          >
            Activity Log
          </button>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm px-3.5 py-2 sm:py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessNotice}</span>
          </div>
          <button onClick={() => setActionSuccessNotice(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      { /* Viewing Filter */ }
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-400">Viewing:</span>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg font-semibold">
          {(['all', 'FTD', 'AD'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAudienceFilter(opt)}
              className={`px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer text-xs ${
                audienceFilter === opt
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* 5 STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div
          onClick={() => setActiveTab('queue')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-1 ring-amber-300 dark:ring-amber-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Pending</span>
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{queueItems.length}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {queueItems.length === 1 ? 'review' : 'review'}
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('discussions')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'discussions'
              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-300 dark:ring-indigo-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Discussions</span>
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{publishedPosts.length}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">posts</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('cohorts')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'cohorts'
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Groups</span>
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#002D72] dark:text-blue-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{cohorts.length}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">regions</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('members')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-300 dark:ring-emerald-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Members</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{members.length}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">caregivers</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('chatbot-knowledge')}
          className={`col-span-2 sm:col-span-1 lg:col-span-1 p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'chatbot-knowledge'
              ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 ring-1 ring-purple-300 dark:ring-purple-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1">
              <span>Clinical Guides</span>
            </span>
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
              {chatbotGuides.filter((g) => g.isActive).length}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
              active
            </span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar flex-nowrap">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Pending Posts</span>
            {queueItems.length > 0 && (
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-amber-500 text-white text-[10px] sm:text-xs font-bold tabular-nums">
                {queueItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('discussions')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'discussions'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Discussions</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {publishedPosts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cohorts')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'cohorts'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Groups</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {cohorts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'members'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Members</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chatbot-knowledge')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'chatbot-knowledge'
                ? 'border-purple-600 dark:border-purple-400 text-purple-800 dark:text-purple-300 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <span>Clinical Guides</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {chatbotGuides.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING POSTS */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {loadingQueue ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-xs">
              Loading posts...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                No posts waiting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                All caregiver submissions have been reviewed and published.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Post list */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
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
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#002D72] dark:border-blue-500 ring-1 ring-[#002D72] dark:ring-blue-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.author.realName}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.title}
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                          {item.rawContent}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span>{item.author.anonymousHandle}</span>
                            <AudienceBadge condition={item.condition} />
                          </span>
                          {hasPhi && (
                            <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 font-medium px-1.5 py-0.5 rounded text-[10px]">
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
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 transition-colors">
                  {/* Author Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {activeItem.author.realName}{' '}
                        <span className="font-normal text-slate-500 dark:text-slate-400 text-xs">
                          (Shown as: {activeItem.author.anonymousHandle})
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>Phone: {activeItem.author.phone
                          ? <a href={`tel:${activeItem.author.phone.replace(/[^\d+]/g, '')}`} className="text-[#002D72] dark:text-blue-400 hover:underline">{activeItem.author.phone}</a>
                          : 'none'}</span>
                        <span>•</span>
                        <span>Email: <a href={`mailto:${activeItem.author.email}`} className="text-[#002D72] dark:text-blue-400 hover:underline">{activeItem.author.email}</a></span>
                      </div>
                    </div>
                    {activeItem.suggestedCohort && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{getFullGroupName(activeItem.suggestedCohort)}</span>
                      </div>
                    )}
                  </div>

                  {/* Original Question */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Original post
                    </label>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-750 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {activeItem.title}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                        {activeItem.rawContent}
                      </p>
                    </div>

                    {/* Personal info alert */}
                    {activeItem.phiAlerts && activeItem.phiAlerts.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            <span>Personal details detected ({activeItem.phiAlerts.length})</span>
                          </span>
                          <button
                            onClick={handleCleanPersonalInfo}
                            className="text-xs text-[#002D72] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Remove personal info</span>
                          </button>
                        </div>
                        <ul className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
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
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Public post text
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Community will see this text
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={sanitizedDraft}
                      onChange={(e) => setSanitizedDraft(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 leading-relaxed"
                    />
                  </div>

                  {/* Group */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Group
                    </label>
                    <select
                      value={selectedGroupIds[0] || cohorts[0]?.id}
                      onChange={(e) => setSelectedGroupIds([e.target.value])}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
                    >
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {getProperGroupName(cohort)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  { /* Approve-As Selector */ }
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Who can see this post</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['FTD', 'FTD only'], ['AD', 'AD only'], ['BOTH', 'Both groups']] as [Audience, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setApproveAudience(value)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            approveAudience === value
                              ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {approveAudience !== (activeItem.condition ?? 'FTD') && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Changed from the author's group ({activeItem.condition ?? 'FTD'}).
                      </p>
                    )}
                  </div>

                  {/* Reply Moderation Policy Toggle */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-750">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pr-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Allow everyone to reply without moderation</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={allowUnmoderatedReplies}
                          onChange={(e) => setAllowUnmoderatedReplies(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={handlePublish}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Publish</span>
                    </button>

                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: DISCUSSIONS & REPLY POLICIES */}
      {activeTab === 'discussions' && (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Header Description Card */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Discussions & Reply Policies
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {publishedPosts.length} published
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Manage reply moderation mode for discussions one by one. By default, all replies to posts are moderated. Turn on unmoderated mode to allow everyone to reply immediately, with moderator removal controls.
            </p>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="space-y-2">
            {/* Filter by Policy: Dedicated full-width bar with smooth horizontal scroll safety */}
            <div className="w-full overflow-x-auto no-scrollbar py-0.5">
              <div className="inline-flex w-full min-w-full sm:w-auto sm:min-w-0 items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('all')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">({publishedPosts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('moderated')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'moderated'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Moderated</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => !p.allowUnmoderatedReplies && !p.isClosed).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('unmoderated')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'unmoderated'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unmoderated</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => p.allowUnmoderatedReplies && !p.isClosed).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('closed')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'closed'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Closed</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => p.isClosed).length})
                  </span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPostsQuery}
                onChange={(e) => setSearchPostsQuery(e.target.value)}
                placeholder="Search discussions by title, author handle, or keywords..."
                className="w-full pl-8.5 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of discussions */}
          {loadingPosts ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              Loading discussions...
            </div>
          ) : (
            (() => {
              const filtered = publishedPosts.filter((p) => {
                if (postsPolicyFilter === 'moderated' && (p.allowUnmoderatedReplies || p.isClosed)) return false;
                if (postsPolicyFilter === 'unmoderated' && (!p.allowUnmoderatedReplies || p.isClosed)) return false;
                if (postsPolicyFilter === 'closed' && !p.isClosed) return false;
                if (searchPostsQuery.trim()) {
                  const q = searchPostsQuery.toLowerCase();
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.content.toLowerCase().includes(q) ||
                    p.author.anonymousHandle.toLowerCase().includes(q)
                  );
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No discussions match filter.</p>
                    <p>Try modifying your search or policy filter above.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filtered.map((post) => {
                    const isUnmoderated = post.allowUnmoderatedReplies === true;
                    const groupName = getProperGroupName(post.assignedGroups[0]);

                    return (
                      <div
                        key={post.id}
                        onClick={() => onOpenDiscussion?.(post.id)}
                        className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:border-[#002D72]/40 dark:hover:border-blue-500/50 hover:shadow-xs cursor-pointer"
                      >
                        <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {post.author.anonymousHandle}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] truncate">
                              {groupName}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <AudienceBadge condition={post.condition} />
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px]">
                              {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                            </span>
                          </div>

                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#002D72] dark:group-hover:text-blue-400 text-xs sm:text-sm leading-snug transition-colors">
                            {post.title}
                          </h3>

                          <p className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>

                          {/* Status Badge */}
                          <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2 text-xs">
                            {post.isClosed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>Discussion Closed</span>
                              </span>
                            ) : isUnmoderated ? (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Unmoderated</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Moderated</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions for this post: Toggle Allow open replies and Button below it for closing/reopening */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex flex-col items-stretch sm:items-end gap-1.5 sm:gap-2 w-full sm:w-auto"
                        >
                          <div
                            className={`inline-flex items-center justify-between sm:justify-start gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all ${
                              post.isClosed ? 'opacity-60' : ''
                            }`}
                          >
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto ${
                                post.isClosed ? 'cursor-not-allowed' : 'cursor-pointer'
                              } select-none`}
                            >
                              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                Allow open replies
                              </span>
                              <div className="relative inline-flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isUnmoderated}
                                  disabled={post.isClosed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleTogglePostRepliesMode(post);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 sm:w-9 sm:h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 sm:after:h-4 sm:after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                              </div>
                            </label>
                          </div>

                          {/* Button below Allow open replies: Close Discussion / Reopen Discussion */}
                          {post.isClosed ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePostClose(post);
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                              title="Reopen discussion to allow new replies"
                            >
                              <LockOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Reopen Discussion</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostToClose(post);
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                              title="Close discussion to prevent new replies while preserving existing comments"
                            >
                              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Close Discussion</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB: GROUPS */}
      {activeTab === 'cohorts' && (
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Community Groups
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Regional and clinic-wide support cohorts. Click any group card to view its enrolled members.
              </p>
            </div>

            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Group</span>
            </button>
          </div>

          {/* GROUPS CARDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">All Groups ({cohorts.length})</span>
              <span className="text-slate-400 dark:text-slate-500">Click a card to filter members</span>
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
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3.5 flex flex-col justify-between cursor-pointer group hover:border-[#002D72] dark:hover:border-blue-500 hover:shadow-xs transition-all text-left"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-serif font-semibold text-slate-900 dark:text-white text-base group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                          {getProperGroupName(cohort)}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {assignedCount} {assignedCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{getFullGroupName(cohort)}</span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {cohort.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Click to view members</span>
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Caregiver Members ({filteredMembers.length})
                  </h2>
                  {selectedCohortFilter !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-300 border border-blue-100 dark:border-blue-900/60 text-xs font-medium flex items-center gap-1">
                      <span>Group: {getProperGroupName(cohorts.find((c) => c.id === selectedCohortFilter))}</span>
                      <button
                        onClick={() => setSelectedCohortFilter('all')}
                        className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5 ml-0.5 cursor-pointer"
                        title="Clear group filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  />
                </div>

                <select
                  value={selectedCohortFilter}
                  onChange={(e) => setSelectedCohortFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
                >
                  <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All Groups</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {getProperGroupName(c)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingMembers ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                Loading members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-slate-500 dark:text-slate-400 text-xs">No members found matching your search or filter.</p>
                {selectedCohortFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedCohortFilter('all')}
                    className="text-xs text-[#002D72] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear group filter and show all
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs whitespace-nowrap">
                      <th className="py-2.5 px-3">Caregiver</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Assigned Group</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {filteredMembers.map((m) => (
                      <tr key={m.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">{m.realName}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{m.anonymousHandle}</div>
                          <div className="mt-1"><AudienceBadge condition={m.condition} /></div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {m.phone ? (
                            <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} className="text-[#002D72] dark:text-blue-400 hover:underline font-medium">
                              {m.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">No phone on file</span>
                          )}
                          <div>
                            <a href={`mailto:${m.email}`} className="text-xs text-[#002D72] dark:text-blue-400 hover:underline">
                              {m.email}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/60">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setReassigningUser(m);
                              setTargetNewGroupId(m.primaryGroupId);
                            }}
                            className="px-2.5 py-1 text-xs text-[#002D72] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold transition cursor-pointer"
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

      {/* TAB 5: CHATBOT KNOWLEDGE MANAGEMENT */}
      {activeTab === 'chatbot-knowledge' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002D72]/10 dark:bg-blue-900/30 text-[#002D72] dark:text-sky-300 flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Clinical Care Guides
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Upload institutional care protocols and guidelines (PDF). Dr. Seema's Assistant uses these verified documents to formulate grounded guidance for family care partners.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadGuideModal(true)}
              className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Care Guide</span>
            </button>
          </div>

          {/* Guide Files Management Table / List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                  Uploaded Clinical Guides ({chatbotGuides.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {chatbotGuides.filter((g) => g.isActive).length} active · {chatbotGuides.reduce((a, b) => a + (b.wordCount || 0), 0).toLocaleString()} words
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={guideSearchFilter}
                    onChange={(e) => setGuideSearchFilter(e.target.value)}
                    placeholder="Search guide documents..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {loadingGuides ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Loading clinical guide documents...
              </div>
            ) : chatbotGuides.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  No Guide Documents Uploaded
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Upload your clinical PDF guidelines so the assistant can use verified institutional instructions to answer family care partner questions.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowUploadGuideModal(true)}
                    className="px-4 py-2 bg-[#002D72] text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Care Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultGuide}
                    disabled={isRestoringDefault}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoringDefault ? 'animate-spin' : ''}`} />
                    <span>{isRestoringDefault ? 'Restoring...' : 'Restore Benchmark Protocol'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {chatbotGuides
                  .filter((g) => {
                    const q = guideSearchFilter.toLowerCase();
                    return !q || g.title.toLowerCase().includes(q) || g.fileName.toLowerCase().includes(q) || g.content.toLowerCase().includes(q);
                  })
                  .map((guide) => (
                    <div
                      key={guide.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                            {guide.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {guide.fileName} · {guide.category.replace(/_/g, ' ')} · {guide.wordCount?.toLocaleString() || '—'} words · Uploaded {new Date(guide.createdAt).toLocaleDateString()}
                          </p>

                          {guide.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                              {guide.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleGuide(guide)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            guide.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                          title={guide.isActive ? 'Active for assistant guidance' : 'Paused'}
                        >
                          {guide.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              <span>Paused</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectGuideModal(guide)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                          title="View Guide Content"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRequestDeleteGuide(guide)}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                          title="Delete Guide"
                          aria-label={`Delete ${guide.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Test Assistant Guidance */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-[#002D72] dark:text-sky-400 fill-current" />
                <span>Test Assistant Guidance</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type any caregiver inquiry to test how Dr. Seema's Assistant uses your uploaded clinical guides to generate answers.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunTestQuery();
                }}
                placeholder="e.g. Dad refuses to shower and becomes combative..."
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleRunTestQuery()}
                disabled={isTesting || !testQuery.trim()}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Test Guidance</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Query Output */}
            {testResult && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                {testResult.matchedGuide && (
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Grounded in: </span>
                      <span>{testResult.matchedGuide.title} ({testResult.matchedGuide.fileName})</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Section: {testResult.matchedGuide.sectionTitle}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assistant Response:
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {testResult.answer}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE GROUP */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden cursor-default transition-colors"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Create a Group
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Group name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Annapolis Area"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location or County
                </label>
                <input
                  type="text"
                  value={newGroupRegion}
                  onChange={(e) => setNewGroupRegion(e.target.value)}
                  placeholder="e.g. Anne Arundel County"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Local peer support for families in this area."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || !newGroupName.trim()}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
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
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-4 space-y-4 cursor-default transition-colors"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Move Member to Another Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Moving <strong className="text-slate-800 dark:text-slate-200">{reassigningUser.realName}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Group
              </label>
              <select
                value={targetNewGroupId}
                onChange={(e) => setTargetNewGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {getProperGroupName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReassigningUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
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
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-4 sm:p-5 space-y-4 cursor-default transition-colors"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Reject Post
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The author will receive a private explanation.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason
                </label>
                <select
                  value={rejectionCode}
                  onChange={(e) => setRejectionCode(e.target.value as RejectionReason)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium cursor-pointer"
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
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note to Author (optional)
                </label>
                <textarea
                  rows={3}
                  value={customRejectionText}
                  onChange={(e) => setCustomRejectionText(e.target.value)}
                  placeholder="Explain why this post could not be shared publicly..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Reject Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM CLOSE DISCUSSION (From Discussions tab) */}
      {postToClose && (
        <div
          onClick={() => setPostToClose(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Close Discussion?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Moderator Action
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                "{postToClose.title}"
              </p>
              <p>
                Closing this discussion will <strong>prevent new replies</strong> from being posted by care partners.
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                ✓ All {postToClose.commentCount} existing replies will be preserved and remain readable.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPostToClose(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Open
              </button>
              <button
                type="button"
                disabled={isTogglingClose}
                onClick={() => handleTogglePostClose(postToClose)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isTogglingClose ? 'Closing...' : 'Yes, Close Discussion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      { /* MODAL new post details */}
      {showNewPostModal && (
        <div
          onClick={() => setShowNewPostModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">New Post</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Published immediately, no review needed.</p>
              </div>
              <button onClick={() => setShowNewPostModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  value={npTitle}
                  onChange={(e) => setNpTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Post</label>
                <textarea
                  rows={5}
                  value={npContent}
                  onChange={(e) => setNpContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Region / group</label>
                <select
                  value={npGroupId}
                  onChange={(e) => setNpGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg cursor-pointer"
                  required
                >
                  <option value="" disabled>Choose a group...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{getProperGroupName(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Disease group</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['FTD', 'FTD only'], ['AD', "Alzheimer's only"], ['BOTH', 'Both groups']] as [Audience, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNpAudience(value)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        npAudience === value
                          ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowNewPostModal(false)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost || !npTitle.trim() || !npContent.trim() || !npGroupId || !npAudience}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  {isSubmittingPost ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD CHATBOT GUIDE FILE */}
      {showUploadGuideModal && (
        <div
          onClick={() => setShowUploadGuideModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden cursor-default transition-colors my-auto"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/50">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white">
                    Upload Clinical Care Guide
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload institutional guidelines for Dr. Seema's Assistant to guide family care partners
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadGuideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitUploadGuide} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Drag and Drop Upload Zone */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-4 ring-blue-400/20'
                    : uploadFileName
                    ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-850/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                />

                {isExtractingPdf ? (
                  <div className="py-4 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#002D72] dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Extracting text from PDF without formatting errors...
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Parsing clinical sections and normalizing document content
                    </span>
                  </div>
                ) : uploadFileName ? (
                  <div className="flex items-center gap-3 w-full justify-between px-3 py-1">
                    <div className="flex items-center gap-2.5 text-left min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate block">
                          {uploadFileName}
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {extractedPdfStats?.pages ? `${extractedPdfStats.pages} pages · ` : ''}
                          {uploadContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Drag and drop your clinical PDF guide here, or{' '}
                        <span className="text-[#002D72] dark:text-sky-400 underline">browse files</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Accepts PDF documents (.pdf), Clinical Guidelines, Protocols (.txt, .md)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Document Title (Full Width, File Name removed) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Johns Hopkins Shower & Hygiene Safety Protocol"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Category & Description Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Clinical Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="GENERAL_CLINICAL_PROTOCOL">General Clinical Protocol</option>
                    <option value="HYGIENE_BATHING">Hygiene, Bathing & Shower Safety</option>
                    <option value="NUTRITION_HYPERORALITY">Eating, Sweets & Hyperorality</option>
                    <option value="BEHAVIORAL_DISINHIBITION">Behavioral Disinhibition & Social Filter</option>
                    <option value="DRIVING_SAFETY">Driving Retirement & Safety</option>
                    <option value="SLEEP_WANDERING">Sleep, Sundowning & Wandering</option>
                    <option value="COMMUNICATION_PPA">Primary Progressive Aphasia (PPA)</option>
                    <option value="LEGAL_MEDICAID">Legal, Financial & Medicaid Planning</option>
                    <option value="CRISIS_DE_ESCALATION">Crisis De-escalation & Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Summary / Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of this protocol manual..."
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Guide Content Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    Extracted Guide Text <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Use <code className="font-mono text-blue-600 dark:text-blue-400">## Section Name</code> for individual protocol sections
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Extracted text from your clinical PDF will appear here for review..."
                  className="w-full px-3.5 py-2.5 font-mono text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  required
                />

                {/* Content Analysis Bar */}
                <div className="mt-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong>{uploadContent.trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</strong> words
                    </span>
                    <span>•</span>
                    <span>
                      <strong>{uploadContent.split(/(?=^##\s+)/m).filter(Boolean).length || (uploadContent.trim() ? 1 : 0)}</strong> sections detected
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadGuideModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingGuide || isExtractingPdf || !uploadTitle.trim() || !uploadContent.trim()}
                  className="px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isUploadingGuide ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Guide...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Save Clinical Guide</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT / VIEW GUIDE FILE */}
      {inspectGuideModal && (
        <div
          onClick={() => setInspectGuideModal(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden cursor-default transition-colors my-auto"
          >
            {/* Inspect Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                      {inspectGuideModal.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        inspectGuideModal.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {inspectGuideModal.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {inspectGuideModal.fileName} · {inspectGuideModal.category.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectGuideModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="px-5 py-3 bg-purple-50/40 dark:bg-purple-950/20 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
                <span>
                  <strong>{inspectGuideModal.wordCount?.toLocaleString() || inspectGuideModal.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</strong> words
                </span>
                <span>•</span>
                <span>
                  <strong>{inspectGuideModal.sectionCount || 1}</strong> sections
                </span>
                <span>•</span>
                <span>Uploaded by {inspectGuideModal.uploadedByName || 'Dr. Seema Gulyani'}</span>
                <span>•</span>
                <span>{new Date(inspectGuideModal.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectGuideModal.content);
                    setCopiedInspect(true);
                    setTimeout(() => setCopiedInspect(false), 2500);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedInspect ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleToggleGuide(inspectGuideModal);
                    setInspectGuideModal((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    inspectGuideModal.isActive
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {inspectGuideModal.isActive ? (
                    <>
                      <ToggleRight className="w-3.5 h-3.5" />
                      <span>Pause Guide</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-3.5 h-3.5" />
                      <span>Activate Guide</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = inspectGuideModal;
                    setInspectGuideModal(null);
                    handleRequestDeleteGuide(target);
                  }}
                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                  title="Delete Guide"
                  aria-label="Delete Guide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body Viewer */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {inspectGuideModal.description && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Summary: </span>
                  {inspectGuideModal.description}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text overflow-x-auto">
                {inspectGuideModal.content}
              </div>
            </div>

            {/* Inspect Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {inspectGuideModal.isActive
                  ? '✓ Dr. Seema\'s Assistant is currently using this document for caregiver queries'
                  : '⚠ This document is paused and not currently used by the chatbot'}
              </span>
              <button
                type="button"
                onClick={() => setInspectGuideModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CLINICAL GUIDE CONFIRMATION */}
      {guideToDelete && (
        <div
          onClick={() => !isDeletingGuide && setGuideToDelete(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-[70] flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default transition-colors my-auto"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Remove Clinical Guide?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Are you sure you want to delete this document from Dr. Seema's Assistant knowledge base?
                </p>
              </div>
            </div>

            {/* Document summary box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                {guideToDelete.title}
              </div>
              <div className="text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono">{guideToDelete.fileName}</span>
                <span>•</span>
                <span>{guideToDelete.wordCount?.toLocaleString() || '—'} words</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                  {guideToDelete.category.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Once removed, the assistant will immediately stop indexing this document or referencing its protocols when responding to caregiver queries. This deletion will be recorded in the audit trail.
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGuideToDelete(null)}
                disabled={isDeletingGuide}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGuide}
                disabled={isDeletingGuide}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isDeletingGuide ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Guide</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
