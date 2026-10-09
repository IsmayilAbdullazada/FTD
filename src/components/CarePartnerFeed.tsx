import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Post, CommunityGroup, CurrentUser, getProperGroupName } from '../types';
import { api } from '../services/api';
import { DiscussionDetail } from './DiscussionDetail';

interface CarePartnerFeedProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  resetKey?: number;
  targetDiscussionId?: string | null;
  onClearTargetDiscussion?: () => void;
  recentNotice?: string | null;
  onDismissNotice?: () => void;
  onOpenComposer: () => void;
  onOpenAssistant: () => void;
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
  onOpenAssistant,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const POSTS_PER_PAGE = 5;
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // If directed to a specific discussion from deflection
  useEffect(() => {
    if (targetDiscussionId && posts.length > 0) {
      const match = posts.find((p) => p.id === targetDiscussionId);
      if (match) {
        setSelectedPost(match);
        if (onClearTargetDiscussion) onClearTargetDiscussion();
      }
    }
  }, [targetDiscussionId, posts, onClearTargetDiscussion]);

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

  const loadFeed = async (groupId?: string) => {
    setLoading(true);
    try {
      const res = await api.getPosts({
        role: currentUser.role,
        groupId: groupId === 'all' ? undefined : groupId,
        userId: currentUser.id,
      });
      let feedPosts = res.posts || [];
      // Clinician moderators and admins only view published discussions in the discussions tab
      if (currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN') {
        feedPosts = feedPosts.filter((p) => p.status === 'APPROVED');
      }
      setPosts(feedPosts);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(selectedGroupTab);
  }, [selectedGroupTab, currentUser.role, currentUser.id]);

  const handleToggleLike = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
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
      setActionNotice('Your question was updated and remains in clinical review.');
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
    setActionNotice('Your question has been withdrawn from clinical review.');

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

  // If a post is selected, render the dedicated Discussion Detail page
  if (selectedPost) {
    return (
      <DiscussionDetail
        post={selectedPost}
        currentUser={currentUser}
        onBack={() => {
          setSelectedPost(null);
          loadFeed(selectedGroupTab);
        }}
        onPostUpdated={(updatedPost) => {
          setSelectedPost(updatedPost);
          setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* FLOATING TOP CONFIRMATION BANNER (Always on top of viewport, regardless of scroll) */}
      {(actionNotice || recentNotice) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3 pointer-events-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-snug text-slate-100">
                {actionNotice || recentNotice}
              </span>
            </div>
            <button
              onClick={() => {
                setActionNotice(null);
                if (onDismissNotice) onDismissNotice();
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
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

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      {/* SEARCH AND FILTERING IN THE SAME LINE */}
      <div className="space-y-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search discussions by topic, symptoms, or keyword..."
              className="w-full pl-9.5 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Group and Status Filters situated on the same line */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              id="group-filter"
              value={selectedGroupTab}
              onChange={(e) => {
                setSelectedGroupTab(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shrink-0 cursor-pointer shadow-2xs"
            >
              <option value="all">All Groups</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {getProperGroupName(cohort)}
                </option>
              ))}
            </select>

            <select
              id="status-filter"
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value as 'all' | 'open' | 'closed');
                setCurrentPage(1);
              }}
              className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shrink-0 cursor-pointer shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open Only</option>
              <option value="closed">Closed Only</option>
            </select>
          </div>
        </div>

        {/* Count & Reset Active Filters */}
        {(() => {
          // Filter by status and search query
          const filteredPosts = posts.filter((post) => {
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

          const totalFilteredCount = filteredPosts.length;
          const totalPages = Math.max(1, Math.ceil(totalFilteredCount / POSTS_PER_PAGE));
          const validCurrentPage = Math.min(currentPage, totalPages);
          const startIndex = (validCurrentPage - 1) * POSTS_PER_PAGE;
          const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

          return (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
                <span>
                  {totalFilteredCount === 0
                    ? '0 discussions found'
                    : `Showing ${startIndex + 1}–${Math.min(startIndex + POSTS_PER_PAGE, totalFilteredCount)} of ${totalFilteredCount} discussions`}
                </span>
                {(searchQuery || selectedGroupTab !== 'all' || selectedStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGroupTab('all');
                      setSelectedStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    className="text-[#002D72] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {/* POSTS LIST */}
              <div className="space-y-4 pt-1">
                {loading ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-base font-sans">
                    Loading discussions...
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 text-base space-y-3 shadow-xs">
                    <div className="font-serif font-semibold text-lg text-slate-800 dark:text-slate-200">
                      {searchQuery
                        ? `No discussions matching "${searchQuery}"`
                        : 'No discussions found in this channel.'}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                      {searchQuery
                        ? 'Try adjusting your search terms or resetting filters.'
                        : 'You can start the first conversation or check the Clinical Guides for guidance.'}
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
                        className="text-[#002D72] dark:text-blue-400 font-semibold hover:underline text-sm inline-block pt-1 cursor-pointer"
                      >
                        Start the first discussion
                      </button>
                    )}
                  </div>
                ) : (
                  paginatedPosts.map((post) => {
                    const isLiked = !!likedPosts[post.id];
                    const currentLikes = post.upvotes + (isLiked ? 1 : 0);
                    const regionName = getProperGroupName(post.assignedGroups[0]);
                    const isAuthor =
                      currentUser.role === 'CARE_PARTNER' &&
                      (post.author.userId === currentUser.id || post.author.anonymousHandle === currentUser.anonymousHandle);
                    const isPending = post.status === 'PENDING_MODERATION' && isAuthor;

                    return (
                      <article
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`rounded-2xl border p-5 sm:p-6 space-y-3.5 transition-all cursor-pointer group text-left ${
                          isPending
                            ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Author Metadata & Closed Badge */}
                        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
                            {post.isClosed && (
                              <>
                                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-full">
                                  <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                  <span>Closed</span>
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 pl-2">
                            {new Date(post.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                          {post.title}
                        </h2>

                        {/* Body Content Snippet */}
                        <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3">
                          {post.content}
                        </p>

                        {isPending && (
                          <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-200/80 dark:border-amber-900/60 leading-relaxed font-sans">
                            Your question was received and is currently under clinical safety review by Dr. Seema before being shared clinic-wide.
                          </div>
                        )}

                        {/* Actions Row */}
                        {isPending ? (
                          <div
                            className="pt-3 border-t border-amber-200/70 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-medium">
                              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>Pending review by Dr. Seema</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(post);
                                }}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>Edit Question</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeletePost(post);
                                }}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Cancel Submission</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#002D72] dark:group-hover:text-blue-400" />
                              <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
                              {post.isClosed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  Closed
                                </span>
                              ) : post.allowUnmoderatedReplies ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/40">
                                  Open Replies
                                </span>
                              ) : null}
                              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleToggleLike(e, post.id)}
                              className={`flex items-center gap-1.5 transition py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm cursor-pointer ${
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

                {/* PAGINATION CONTROLS */}
                {!loading && totalPages > 1 && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={validCurrentPage === 1}
                      className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`min-w-8 h-8 px-2 text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center ${
                            validCurrentPage === page
                              ? 'bg-[#002D72] dark:bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={validCurrentPage === totalPages}
                      className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

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

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm font-sans">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Details
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Group
                </label>
                <select
                  value={editCohortId}
                  onChange={(e) => setEditCohortId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.properName || c.name.replace(/\s+Cohort$/i, '')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}
                  className="px-5 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will remove your question from clinical review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
              "{confirmDeletePost.title}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmWithdraw}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingPost ? 'Withdrawing...' : 'Yes, Withdraw Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
