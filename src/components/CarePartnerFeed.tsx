import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Post, CommunityGroup, CurrentUser } from '../types';
import { api } from '../services/api';
import { DiscussionDetail } from './DiscussionDetail';

interface CarePartnerFeedProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  onOpenComposer: () => void;
  onOpenAssistant: () => void;
}

export const CarePartnerFeed: React.FC<CarePartnerFeedProps> = ({
  currentUser,
  cohorts,
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
  }, [selectedGroupTab, currentUser.role]);

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
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* "ASK QUESTION" PROMPT */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xs">
        <button
          onClick={onOpenComposer}
          className="flex-1 text-left text-slate-400 hover:text-slate-600 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2.5 transition"
        >
          Ask a question or share advice with other caregivers...
        </button>
        <button
          onClick={onOpenComposer}
          className="px-3.5 py-2.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <label htmlFor="group-filter" className="text-xs font-medium text-slate-500 shrink-0">
          Group:
        </label>
        <select
          id="group-filter"
          value={selectedGroupTab}
          onChange={(e) => setSelectedGroupTab(e.target.value)}
          className="w-full sm:w-auto min-w-0 max-w-full sm:max-w-xs px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72] truncate"
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
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading discussions...
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
            <div>No discussions found in this channel.</div>
            <button
              onClick={onOpenComposer}
              className="text-[#002D72] font-semibold hover:underline"
            >
              Start the first discussion
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = !!likedPosts[post.id];
            const currentLikes = post.upvotes + (isLiked ? 1 : 0);
            const regionName = post.assignedGroups[0]?.name.replace('Cohort', '').trim();

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-2.5 hover:border-slate-300 hover:shadow-2xs transition cursor-pointer group"
              >
                {/* Author Metadata */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-800 font-semibold">{post.author.anonymousHandle}</span>
                    {regionName && (
                      <>
                        <span>•</span>
                        <span>{regionName}</span>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(post.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug group-hover:text-[#002D72] transition">
                  {post.title}
                </h2>

                {/* Body Content Snippet */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans line-clamp-3">
                  {post.content}
                </p>

                {/* Actions Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium group-hover:text-[#002D72] transition">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(e, post.id)}
                    className={`flex items-center gap-1 transition py-1 px-2 rounded hover:bg-slate-50 ${
                      isLiked ? 'text-rose-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
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
