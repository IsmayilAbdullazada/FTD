import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Heart,
  Plus,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  X,
  Pencil,
  Trash2,
  Search,
  Lock,
  LockOpen,
  SlidersHorizontal,
  ChevronDown,
  Users,
  RotateCcw,
  ShieldCheck,
  Send,
  User,
  HelpCircle,
} from 'lucide-react';
import { Post, CommunityGroup, CurrentUser, getProperGroupName } from '../types';
import { api } from '../services/api';
import { DiscussionDetail } from './DiscussionDetail';
import { AudienceBadge } from './AudienceBadge';

interface CarePartnerFeedProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  resetKey?: number;
  targetDiscussionId?: string | null;
  onClearTargetDiscussion?: () => void;
  recentNotice?: string | null;
  onDismissNotice?: () => void;
  onOpenComposer: () => void;
  initialSection?: 'all' | 'my-posts';
  onSectionChange?: (section: 'all' | 'my-posts') => void;
}

export const CarePartnerFeed: React.FC<CarePartnerFeedProps> = ({
  currentUser,
  cohorts,
  resetKey,
  targetDiscussionId,
  onClearTargetDiscussion,
  recentNotice,
  onDismissNotice,
  onOpenComposer,
  initialSection,
  onSectionChange,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSection, setViewSection] = useState<'all' | 'my-posts'>(initialSection || 'all');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const POSTS_PER_PAGE = 5;
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Sync viewSection when initialSection prop changes (e.g. from header profile dropdown or post submit)
  useEffect(() => {
    if (initialSection) {
      setViewSection(initialSection);
      setCurrentPage(1);
    }
  }, [initialSection]);

  const handleSectionChange = (sec: 'all' | 'my-posts') => {
    setViewSection(sec);
    setCurrentPage(1);
    if (onSectionChange) onSectionChange(sec);
  };

  // Check user role
  const isStaff = currentUser.role !== 'CARE_PARTNER';
  const isCarePartner = currentUser.role === 'CARE_PARTNER';
  const [selectedCondition, setSelectedCondition] = useState<'all' | 'FTD' | 'AD'>('all');

  // Filter Popover Menu State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);

  // Close filter popover on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isFilterMenuOpen]);

  // Popstate listener to handle browser / phone back button navigation
  useEffect(() => {
    const handlePopState = async () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get('post');
      if (!postId) {
        setSelectedPost(null);
      } else if (selectedPost?.id !== postId) {
        const found = posts.find((p) => p.id === postId);
        if (found) {
          setSelectedPost(found);
        } else {
          try {
            const details = await api.getPostDetails(postId, currentUser.role, currentUser.id);
            if (details.post) {
              setSelectedPost(details.post);
            }
          } catch (err) {
            console.error('Failed to load deep-linked post:', err);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [posts, selectedPost, currentUser.role, currentUser.id]);

  // Deep-linking or target discussion navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPostId = params.get('post');
    const effectiveTargetId = targetDiscussionId || urlPostId;

    if (effectiveTargetId) {
      const match = posts.find((p) => p.id === effectiveTargetId);
      if (match) {
        setSelectedPost(match);
        if (onClearTargetDiscussion) onClearTargetDiscussion();
      } else if (!loading) {
        api.getPostDetails(effectiveTargetId, currentUser.role, currentUser.id)
          .then((res) => {
            if (res.post) {
              setSelectedPost(res.post);
              if (onClearTargetDiscussion) onClearTargetDiscussion();
            }
          })
          .catch((err) => console.error('Failed to load target post:', err));
      }
    } else if (!urlPostId && !targetDiscussionId) {
      setSelectedPost(null);
    }
  }, [targetDiscussionId, posts, loading, onClearTargetDiscussion, currentUser.role, currentUser.id]);

  // Editing pending post
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCohortId, setEditCohortId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // In-UI cancellation confirmation modal
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Care partner private replies to clinical moderators
  const [carePartnerReplyText, setCarePartnerReplyText] = useState<Record<string, string>>({});
  const [isSendingCareReply, setIsSendingCareReply] = useState<Record<string, boolean>>({});
  const [careReplyExpanded, setCareReplyExpanded] = useState<Record<string, boolean>>({});

  // Auto-fade action notice after 3.5 seconds
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => {
      setActionNotice(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  // If user clicks "Discussions" from navbar/bottom bar, return to feed list
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setSelectedPost(null);
    }
  }, [resetKey]);

  const handleOpenDiscussion = (post: Post) => {
    setSelectedPost(post);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'feed');
    url.searchParams.set('post', post.id);
    window.history.pushState({ tab: 'feed', post: post.id }, '', url.toString());
  };

  const handleBackToFeed = () => {
    setSelectedPost(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.pushState({ tab: 'feed', post: null }, '', url.toString());
    }
    if (onClearTargetDiscussion) onClearTargetDiscussion();
    loadFeed(selectedGroupTab);
  };

  const loadFeed = async (groupId?: string) => {
    setLoading(true);
    try {
      const res = await api.getPosts({
        role: currentUser.role,
        groupId: groupId === 'all' ? undefined : groupId,
        userId: currentUser.id,
        condition: isStaff && selectedCondition !== 'all' ? selectedCondition : undefined,
      });
      let feedPosts = res.posts || [];
      // Clinician moderators and admins only view published discussions in the discussions tab
      if (currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN') {
        feedPosts = feedPosts.filter((p) => p.status === 'APPROVED');
      }
      setPosts(feedPosts);

      // Sync upvote states from server
      const initialLikes: Record<string, boolean> = {};
      feedPosts.forEach((p) => {
        if (p.isUpvoted !== undefined) {
          initialLikes[p.id] = p.isUpvoted;
        }
      });
      setLikedPosts((prev) => ({ ...initialLikes, ...prev }));
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(selectedGroupTab);
  }, [selectedGroupTab, selectedCondition, currentUser.role, currentUser.id]);

  const handleToggleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const currentPost = posts.find((p) => p.id === postId);
    const wasLiked = likedPosts[postId] !== undefined ? likedPosts[postId] : Boolean(currentPost?.isUpvoted);
    const newLiked = !wasLiked;

    setLikedPosts((prev) => ({ ...prev, [postId]: newLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const delta = newLiked ? 1 : -1;
          return { ...p, upvotes: Math.max(0, p.upvotes + delta), isUpvoted: newLiked };
        }
        return p;
      })
    );

    try {
      const res = await api.togglePostUpvote(postId, currentUser.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, upvotes: res.upvotes, isUpvoted: res.isUpvoted } : p))
      );
      setLikedPosts((prev) => ({ ...prev, [postId]: res.isUpvoted }));
    } catch (err) {
      console.error('Failed to upvote post:', err);
    }
  };

  const handleStartEdit = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCohortId(post.assignedGroups[0]?.id || cohorts[0]?.id || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    setIsSavingEdit(true);
    try {
      await api.updatePost(editingPost.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        targetCohortId: editCohortId,
      });
      setEditingPost(null);
      if (onDismissNotice) onDismissNotice();
      setActionNotice('Your question was updated and remains under review.');
      await loadFeed(selectedGroupTab);
    } catch (err) {
      console.error('Failed to update post:', err);
      setActionNotice('Failed to update question. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!confirmDeletePost) return;

    const targetPostId = confirmDeletePost.id;
    setIsDeletingPost(true);

    // 1. Optimistic removal from display immediately
    setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
    setConfirmDeletePost(null);

    // 2. Clear any prior notices and show immediate confirmation toast
    if (onDismissNotice) onDismissNotice();
    setActionNotice('Your question has been withdrawn.');

    // 3. Delete on server
    try {
      await api.deletePost(targetPostId);
      await loadFeed(selectedGroupTab);
    } catch (err) {
      console.error('Failed to withdraw post:', err);
      setActionNotice('Unable to withdraw question. Please try again.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleSendPrivateCareReply = async (postId: string) => {
    const message = carePartnerReplyText[postId]?.trim();
    if (!message || isSendingCareReply[postId]) return;

    setIsSendingCareReply((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.sendPostPrivateNote(postId, {
        message,
        senderId: currentUser.id,
        action: 'KEEP_PENDING',
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                moderatorPrivateNotes: [...(p.moderatorPrivateNotes || []), res.note],
              }
            : p
        )
      );

      setCarePartnerReplyText((prev) => ({ ...prev, [postId]: '' }));
      setActionNotice('Your private reply was sent to the moderator.');
    } catch (err: any) {
      console.error('Failed to send private reply:', err);
      setActionNotice(err.message || 'Could not send reply. Please try again.');
    } finally {
      setIsSendingCareReply((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // If a post is selected, render the dedicated Discussion Detail page
  if (selectedPost) {
    return (
      <DiscussionDetail
        post={selectedPost}
        currentUser={currentUser}
        onBack={handleBackToFeed}
        onPostUpdated={(updatedPost) => {
          setSelectedPost(updatedPost);
          setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
        }}
      />
    );
  }

  const myPosts = posts.filter(
    (p) =>
      p.author.userId === currentUser.id ||
      p.author.anonymousHandle === currentUser.anonymousHandle ||
      (p.author as any).id === currentUser.id
  );
  const myPendingCount = myPosts.filter((p) => p.status === 'PENDING_MODERATION').length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* FLOATING TOP CONFIRMATION BANNER (Always on top of viewport, regardless of scroll) */}
      {(actionNotice || recentNotice) && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium leading-snug text-slate-100">
                {actionNotice || recentNotice}
              </span>
            </div>
            <button
              onClick={() => {
                setActionNotice(null);
                if (onDismissNotice) onDismissNotice();
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* "ASK QUESTION" PROMPT (Desktop/Tablet only; on mobile, the prominent '+' button is in the center of the bottom navigation tray) */}
      <div className="hidden md:flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 items-center justify-between gap-3 sm:gap-4 shadow-xs transition-colors">
        <button
          onClick={onOpenComposer}
          className="flex-1 text-left text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs sm:text-base bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition border border-slate-200/60 dark:border-slate-700 font-sans truncate cursor-pointer"
        >
          <span>Ask a question or share practical care advice with other caregivers...</span>
        </button>
        <button
          onClick={onOpenComposer}
          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition shrink-0 shadow-xs whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* REASSURING BANNER: For caregivers with posts under review */}
      {isCarePartner && myPendingCount > 0 && viewSection === 'all' && (
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
              You have {myPendingCount} post{myPendingCount > 1 ? 's' : ''} currently under review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSectionChange('my-posts')}
            className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>View My Posts</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MY POSTS DEDICATED HEADER */}
      {isCarePartner && viewSection === 'my-posts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleSectionChange('all')}
              className="text-xs sm:text-sm font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Discussions</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              {myPosts.length} Total {myPosts.length === 1 ? 'Post' : 'Posts'}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif font-semibold text-xl sm:text-2xl text-slate-900 dark:text-white">
              My Posts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              View and track all your submitted posts, review real-time moderation status, read private notes from the moderator, and edit or cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      {/* SEARCH AND UNIFIED FILTER BAR */}
      <div className="space-y-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={viewSection === 'my-posts' ? "Search your posts by title or keyword..." : "Search discussions by topic, symptoms, or keyword..."}
              className="w-full pl-9.5 pr-8 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unified Filter Button & Popover */}
          <div className="relative shrink-0" ref={filterPopoverRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              className={`min-h-11 px-3.5 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                selectedGroupTab !== 'all' || selectedStatusFilter !== 'all'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002D72] dark:border-blue-500 text-[#002D72] dark:text-blue-300'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              aria-label="Filter discussions"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Filters</span>
              {(selectedGroupTab !== 'all' || selectedStatusFilter !== 'all') && (
                <span className="w-5 h-5 rounded-full bg-[#002D72] dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {(selectedGroupTab !== 'all' ? 1 : 0) + (selectedStatusFilter !== 'all' ? 1 : 0)}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Popover Dropdown */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4 text-[#002D72] dark:text-blue-400" />
                    <span>Filter Discussions</span>
                  </div>
                  {(selectedGroupTab !== 'all' || selectedStatusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroupTab('all');
                        setSelectedStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Filter 1: Community Group */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Community Group
                  </label>
                  <select
                    value={selectedGroupTab}
                    onChange={(e) => {
                      setSelectedGroupTab(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition cursor-pointer min-h-11"
                  >
                    <option value="all">All Groups</option>
                    {cohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {getProperGroupName(cohort)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Filter 2: Condition (Staff Only) */}
                {isStaff && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Condition</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      {(['all', 'FTD', 'AD'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setSelectedCondition(opt); setCurrentPage(1); }}
                          className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] ${
                            selectedCondition === opt
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {opt === 'all' ? 'All' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter 3: Discussion Status */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Discussion Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] ${
                        selectedStatusFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('open');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        selectedStatusFilter === 'open'
                          ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('closed');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${
                        selectedStatusFilter === 'closed'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Closed</span>
                    </button>
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="min-h-11 px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(selectedGroupTab !== 'all' || selectedStatusFilter !== 'all' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-1">Active filters:</span>

            {/* Group chip */}
            {selectedGroupTab !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Group: {getProperGroupName(cohorts.find((c) => c.id === selectedGroupTab)) || 'Selected Group'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroupTab('all');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove group filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Status chip */}
            {selectedStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {selectedStatusFilter === 'closed' ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>Status: {selectedStatusFilter === 'closed' ? 'Closed Only' : 'Open Only'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove status filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[150px]">"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove search filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Clear all button */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroupTab('all');
                setSelectedStatusFilter('all');
                setCurrentPage(1);
              }}
              className="text-sm text-[#002D72] dark:text-blue-400 hover:underline font-semibold ml-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

        {/* Count & Reset Active Filters */}
        {(() => {
          // Filter by section (all community discussions vs my posts only), status, and search query
          const filteredPosts = posts.filter((post) => {
            if (viewSection === 'my-posts') {
              const isMine =
                post.author.userId === currentUser.id ||
                post.author.anonymousHandle === currentUser.anonymousHandle ||
                (post.author as any).id === currentUser.id;
              if (!isMine) return false;
            } else {
              // Community Discussions MUST only show published, approved posts
              if (post.status !== 'APPROVED') return false;
            }

            if (selectedStatusFilter === 'open' && post.isClosed) return false;
            if (selectedStatusFilter === 'closed' && !post.isClosed) return false;

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              const titleMatch = post.title.toLowerCase().includes(q);
              const contentMatch = post.content.toLowerCase().includes(q);
              const authorMatch = post.author.anonymousHandle.toLowerCase().includes(q);
              const groupMatch = post.assignedGroups.some(
                (g) =>
                  g.name.toLowerCase().includes(q) ||
                  (g.geographicRegion && g.geographicRegion.toLowerCase().includes(q))
              );
              if (!titleMatch && !contentMatch && !authorMatch && !groupMatch) {
                return false;
              }
            }

            return true;
          });

          // Sort logic: in My Posts, items Under Review (PENDING_MODERATION) MUST always be pinned to the top!
          const sortedPosts = [...filteredPosts].sort((a, b) => {
            if (viewSection === 'my-posts') {
              const aPending = a.status === 'PENDING_MODERATION';
              const bPending = b.status === 'PENDING_MODERATION';
              if (aPending && !bPending) return -1;
              if (!aPending && bPending) return 1;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          const totalFilteredCount = sortedPosts.length;
          const totalPages = Math.max(1, Math.ceil(totalFilteredCount / POSTS_PER_PAGE));
          const validCurrentPage = Math.min(currentPage, totalPages);
          const startIndex = (validCurrentPage - 1) * POSTS_PER_PAGE;
          const paginatedPosts = sortedPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

          return (
            <>
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 px-0.5 font-medium">
                <span>
                  {totalFilteredCount === 0
                    ? viewSection === 'my-posts'
                      ? '0 posts found'
                      : '0 discussions found'
                    : `Showing ${startIndex + 1}–${Math.min(startIndex + POSTS_PER_PAGE, totalFilteredCount)} of ${totalFilteredCount} ${
                        viewSection === 'my-posts' ? 'posts' : 'discussions'
                      }`}
                </span>
              </div>

              {/* POSTS LIST */}
              <div className="space-y-4 pt-1">
                {loading ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-base font-sans">
                    Loading discussions...
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center text-slate-500 dark:text-slate-400 text-base space-y-3 shadow-xs">
                    <div className="font-serif font-semibold text-lg sm:text-xl text-slate-800 dark:text-slate-200">
                      {searchQuery
                        ? `No ${viewSection === 'my-posts' ? 'posts' : 'discussions'} matching "${searchQuery}"`
                        : viewSection === 'my-posts'
                        ? "You haven't submitted any posts yet."
                        : 'No discussions found in this channel.'}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                      {searchQuery
                        ? 'Try adjusting your search terms or resetting filters.'
                        : viewSection === 'my-posts'
                        ? 'When you share a question or care advice, your post will appear here with its real-time review status and any private responses from the moderator.'
                        : 'You can start the first conversation or check the Guides for guidance.'}
                    </p>
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedStatusFilter('all');
                          setCurrentPage(1);
                        }}
                        className="text-[#002D72] dark:text-blue-400 font-semibold hover:underline text-sm inline-block pt-1 cursor-pointer"
                      >
                        Clear search
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenComposer}
                        className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{viewSection === 'my-posts' ? 'Create a Post' : 'Start the first discussion'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  paginatedPosts.map((post) => {
                    const isLiked = likedPosts[post.id] !== undefined ? likedPosts[post.id] : Boolean(post.isUpvoted);
                    const currentLikes = post.upvotes;
                    const regionName = getProperGroupName(post.assignedGroups[0]);
                    const isAuthor =
                      currentUser.role === 'CARE_PARTNER' &&
                      (post.author.userId === currentUser.id || post.author.anonymousHandle === currentUser.anonymousHandle);
                    const isPending = post.status === 'PENDING_MODERATION' && isAuthor;

                    return (
                      <article
                        key={post.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open discussion: ${post.title}`}
                        onClick={() => handleOpenDiscussion(post)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
                              return;
                            }
                            e.preventDefault();
                            handleOpenDiscussion(post);
                          }
                        }}
                        className={`rounded-2xl border p-5 sm:p-6 space-y-3.5 transition-all cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                          isPending
                            ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Author Metadata & Closed Badge */}
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2 font-medium min-w-0">
                            <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">
                              {post.author.anonymousHandle}
                            </span>
                            {regionName && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                                <span className="text-slate-500 dark:text-slate-400 truncate">{regionName}</span>
                              </>
                            )}
                            {isStaff && post.condition && post.condition !== 'BOTH' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                                <AudienceBadge condition={post.condition} />
                              </>
                            )}
                            {post.isClosed && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                                  <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Closed</span>
                                </span>
                              </>
                            )}
                            {viewSection === 'my-posts' && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                                {isPending ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/80 dark:border-amber-800/80 px-2.5 py-0.5 rounded-full">
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    <span>Under Review</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Published</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 text-sm shrink-0 pl-2">
                            {new Date(post.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="font-serif text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 group-focus-visible:text-[#002D72] dark:group-focus-visible:text-blue-400 transition">
                          {post.title}
                        </h2>

                        {/* Body Content Snippet */}
                        <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3">
                          {post.content}
                        </p>

                        {isPending && (
                          <div className="text-sm text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-900/60 leading-relaxed font-sans">
                            Your question was received and is currently under review before being shared with the community.
                          </div>
                        )}

                        {/* Confidential Moderator Guidance Card */}
                        {post.moderatorPrivateNotes && post.moderatorPrivateNotes.length > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 space-y-3 cursor-default shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-[#002D72] dark:text-blue-300">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Private Response from Moderator</span>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800">
                                Only visible to you
                              </span>
                            </div>

                            {/* Dialogue Messages */}
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {post.moderatorPrivateNotes.map((note) => {
                                const isFromCarePartner =
                                  note.senderRole !== 'CLINICIAN_MODERATOR' &&
                                  note.senderName !== 'Clinical Moderator' &&
                                  note.senderName !== 'Moderator' &&
                                  note.senderId !== 'user-clinician-1' &&
                                  note.senderId !== 'user-admin-1' &&
                                  (note.senderRole === 'CARE_PARTNER' || note.senderId === post.author.userId || note.senderId === currentUser.id);
                                return (
                                  <div
                                    key={note.id}
                                    className={`p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed ${
                                      isFromCarePartner
                                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 ml-4'
                                        : 'bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 mr-2 shadow-2xs'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                      <span className={isFromCarePartner ? 'text-amber-800 dark:text-amber-300 font-semibold' : 'text-[#002D72] dark:text-blue-300 font-semibold'}>
                                        {isFromCarePartner ? 'You (Care Partner)' : 'Moderator'}
                                      </span>
                                      <span>
                                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-line">{note.message}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reply directly back to moderator */}
                            <div className="pt-2 border-t border-blue-200/70 dark:border-blue-900/60">
                              {!careReplyExpanded[post.id] ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCareReplyExpanded((prev) => ({ ...prev, [post.id]: true }));
                                  }}
                                  className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Reply to Moderator</span>
                                </button>
                              ) : (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSendPrivateCareReply(post.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="space-y-2 pt-1"
                                >
                                  <textarea
                                    rows={2}
                                    value={carePartnerReplyText[post.id] || ''}
                                    onChange={(e) =>
                                      setCarePartnerReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))
                                    }
                                    placeholder="Write your response to the moderator..."
                                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCareReplyExpanded((prev) => ({ ...prev, [post.id]: false }))
                                      }
                                      className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={!carePartnerReplyText[post.id]?.trim() || isSendingCareReply[post.id]}
                                      className="px-3.5 py-1.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                    >
                                      {isSendingCareReply[post.id] ? (
                                        <span>Sending...</span>
                                      ) : (
                                        <>
                                          <Send className="w-3 h-3" />
                                          <span>Send Reply</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions Row */}
                        {isPending ? (
                          <div
                            className="pt-3 border-t border-amber-200/70 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-medium">
                              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>Under Review</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(post);
                                }}
                                className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold flex items-center gap-1.5 text-sm transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500"
                              >
                                <Pencil className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span>Edit Question</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeletePost(post);
                                }}
                                className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl font-semibold flex items-center gap-1.5 text-sm transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                <span>Cancel Submission</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#002D72] dark:group-hover:text-blue-400" />
                              <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
                              {post.allowUnmoderatedReplies && !post.isClosed && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/40">
                                  Open Replies
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(e, post.id)}
                              className={`min-h-11 flex items-center gap-1.5 transition py-2 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                                isLiked ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                              <span>{currentLikes} helpful</span>
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}

                {/* PAGINATION CONTROLS (Responsive on all mobile and tablet viewports) */}
                {!loading && totalPages > 1 && (
                  <nav
                    role="navigation"
                    aria-label="Discussions pagination"
                    className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 max-w-full overflow-hidden"
                  >
                    {/* Previous Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={validCurrentPage === 1}
                      aria-label="Previous Page"
                      className="min-h-11 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden inline">Prev</span>
                    </button>

                    {/* Mobile Compact Page Indicator (< sm) */}
                    <div className="flex sm:hidden items-center justify-center px-2 text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums select-none">
                      Page {validCurrentPage} of {totalPages}
                    </div>

                    {/* Desktop & Tablet Page Number Buttons (>= sm) */}
                    <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          aria-label={`Go to page ${page}`}
                          aria-current={validCurrentPage === page ? 'page' : undefined}
                          className={`min-w-11 h-11 px-3 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                            validCurrentPage === page
                              ? 'bg-[#002D72] dark:bg-blue-600 text-white shadow-2xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={validCurrentPage === totalPages}
                      aria-label="Next Page"
                      className="min-h-11 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 shrink-0"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden inline">Next</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  </nav>
                )}
              </div>
            </>
          );
        })()}

      {/* MODAL: EDIT PENDING QUESTION (With backdrop click to exit) */}
      {editingPost && (
        <div
          onClick={() => setEditingPost(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                Edit Question
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-11 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Details
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Target Group
                </label>
                <select
                  value={editCohortId}
                  onChange={(e) => setEditCohortId(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-11 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.properName || c.name.replace(/\s+Cohort$/i, '')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="min-h-11 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}
                  className="min-h-11 px-6 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM WITHDRAW QUESTION (With backdrop click to exit) */}
      {confirmDeletePost && (
        <div
          onClick={() => setConfirmDeletePost(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900 dark:text-white">
                  Withdraw Question?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This will remove your question from clinical review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
              "{confirmDeletePost.title}"
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                className="min-h-11 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmWithdraw}
                className="min-h-11 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingPost ? 'Withdrawing...' : 'Yes, Withdraw Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
