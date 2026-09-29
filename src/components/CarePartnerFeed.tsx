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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* "ASK QUESTION" PROMPT */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
        <button
          onClick={onOpenComposer}
          className="flex-1 text-left text-slate-500 hover:text-slate-700 text-sm sm:text-base bg-slate-50/80 hover:bg-slate-100 rounded-xl px-4 py-3 transition border border-slate-200/60 font-sans"
        >
          Ask a question or share practical care advice with other caregivers...
        </button>
        <button
          onClick={onOpenComposer}
          className="px-5 py-3 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>
      </div>

      {/* INTUITIVE COMPACT GROUP SELECTOR */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <span>Viewing:</span>
          <span className="font-semibold text-slate-900">
            {selectedGroupTab === 'all'
              ? 'All Clinic Discussions'
              : cohorts.find((c) => c.id === selectedGroupTab)?.name || 'Cohort'}
          </span>
        </div>

        <select
          id="group-filter"
          value={selectedGroupTab}
          onChange={(e) => setSelectedGroupTab(e.target.value)}
          className="w-auto px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72] transition"
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

            return (
              <article
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-3.5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group text-left"
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
