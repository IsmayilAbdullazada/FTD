import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import { Post, CommunityGroup, CurrentUser } from '../types';
import { api } from '../services/api';
import { DiscussionDetail } from './DiscussionDetail';

interface CarePartnerFeedProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  recentNotice?: string | null;
  onDismissNotice?: () => void;
  onOpenComposer: () => void;
  onOpenAssistant: () => void;
}

export const CarePartnerFeed: React.FC<CarePartnerFeedProps> = ({
  currentUser,
  cohorts,
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
      {/* RECENT SUBMISSION NOTICE BANNER */}
      {recentNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{recentNotice}</span>
          </div>
          {onDismissNotice && (
            <button
              onClick={onDismissNotice}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/50 transition"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-slate-900 font-semibold">{post.author.anonymousHandle}</span>
                    {regionName && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-slate-500">{regionName}</span>
                      </>
                    )}
                    {isPending && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Under Review by Dr. Seema</span>
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs sm:text-sm">
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
                  <div className="text-xs text-amber-800 bg-amber-50/80 rounded-lg p-2 border border-amber-100">
                    Your question was received and is awaiting clinical safety verification before being shared clinic-wide.
                  </div>
                )}

                {/* Actions Row */}
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
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
