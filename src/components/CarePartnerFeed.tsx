import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Post, CommunityGroup, CurrentUser } from '../types';
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
      setPosts(res.posts || []);
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

      {/* "ASK QUESTION" PROMPT */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <button
          onClick={onOpenComposer}
          className="flex-1 text-left text-slate-500 hover:text-slate-700 text-xs sm:text-base bg-slate-50/80 hover:bg-slate-100 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 transition border border-slate-200/60 font-sans truncate"
        >
          <span className="hidden sm:inline">Ask a question or share practical care advice with other caregivers...</span>
          <span className="sm:hidden">Ask a question or share care advice...</span>
        </button>
        <button
          onClick={onOpenComposer}
          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 transition shrink-0 shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium min-w-0">
          <span className="shrink-0">Viewing:</span>
          <span className="font-semibold text-slate-900 truncate">
            {selectedGroupTab === 'all'
              ? 'All Clinic Discussions'
              : cohorts.find((c) => c.id === selectedGroupTab)?.name || 'Cohort'}
          </span>
        </div>

        <select
          id="group-filter"
          value={selectedGroupTab}
          onChange={(e) => setSelectedGroupTab(e.target.value)}
          className="w-auto px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72] transition shrink-0"
        >
          <option value="all">All Groups</option>
          {cohorts.map((cohort) => {
            const shortName = cohort.name.replace(/\s+Cohort$/i, '');
            return (
              <option key={cohort.id} value={cohort.id}>
                {shortName}
              </option>
            );
          })}
        </select>
      </div>

      {/* POSTS LIST (Clean, tap-to-open discussions) */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-base font-sans">
            Loading discussions...
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-base space-y-3 shadow-xs">
            <div className="font-serif font-semibold text-lg text-slate-800">No discussions found in this channel yet.</div>
            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
              You can start the first conversation or check the Clinical Guides for guidance.
            </p>
            <button
              onClick={onOpenComposer}
              className="text-[#002D72] font-semibold hover:underline text-sm inline-block pt-1"
            >
              Start the first discussion
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = !!likedPosts[post.id];
            const currentLikes = post.upvotes + (isLiked ? 1 : 0);
            const regionName = post.assignedGroups[0]?.name.replace('Cohort', '').trim();
            const isPending = post.status === 'PENDING_MODERATION';

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`rounded-2xl border p-5 sm:p-6 space-y-3.5 transition-all cursor-pointer group text-left ${
                  isPending
                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Author Metadata */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                  <div className="flex items-center gap-2 font-medium min-w-0">
                    <span className="text-slate-900 font-semibold truncate">{post.author.anonymousHandle}</span>
                    {regionName && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 shrink-0">·</span>
                        <span className="text-slate-500 truncate">{regionName}</span>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs shrink-0 pl-2">
                    {new Date(post.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug group-hover:text-[#002D72] transition">
                  {post.title}
                </h2>

                {/* Body Content Snippet */}
                <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed font-sans line-clamp-3">
                  {post.content}
                </p>

                {isPending && (
                  <div className="text-xs text-amber-900 bg-amber-50/80 rounded-xl p-3 border border-amber-200/80 leading-relaxed font-sans">
                    Your question was received and is currently under clinical safety review by Dr. Seema before being shared clinic-wide.
                  </div>
                )}

                {/* Actions Row */}
                {isPending ? (
                  <div
                    className="pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Pending review by Dr. Seema</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(post);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-amber-100/60 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit Question</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeletePost(post);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Submission</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium group-hover:text-[#002D72] transition">
                      <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-[#002D72]" />
                      <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(e, post.id)}
                      className={`flex items-center gap-1.5 transition py-1.5 px-3 rounded-lg hover:bg-slate-50 text-xs sm:text-sm ${
                        isLiked ? 'text-rose-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600' : ''}`} />
                      <span>{currentLikes} helpful</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* MODAL: EDIT PENDING QUESTION (With backdrop click to exit) */}
      {editingPost && (
        <div
          onClick={() => setEditingPost(null)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-serif font-semibold text-lg text-slate-900">
                Edit Question
              </h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-sm font-sans">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Topic / Question Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Details
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Group
                </label>
                <select
                  value={editCohortId}
                  onChange={(e) => setEditCohortId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.replace(/\s+Cohort$/i, '')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}
                  className="px-5 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition"
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-lg text-slate-900">
                  Withdraw Question?
                </h3>
                <p className="text-xs text-slate-500">
                  This will remove your question from clinical review.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs sm:text-sm text-slate-700 font-medium line-clamp-2">
              "{confirmDeletePost.title}"
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Keep Question
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmWithdraw}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
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
