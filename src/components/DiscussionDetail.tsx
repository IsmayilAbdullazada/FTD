import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Post, Comment, CurrentUser } from '../types';
import { api } from '../services/api';

interface DiscussionDetailProps {
  post: Post;
  currentUser: CurrentUser;
  onBack: () => void;
  onPostUpdated?: (updatedPost: Post) => void;
}

export const DiscussionDetail: React.FC<DiscussionDetailProps> = ({
  post,
  currentUser,
  onBack,
  onPostUpdated,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const regionName = post.assignedGroups[0]?.name.replace('Cohort', '').trim();
  const currentLikes = post.upvotes + (isLiked ? 1 : 0);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.getPostDetails(post.id, currentUser.role);
      setComments(res.comments || []);
    } catch (err) {
      console.error('Failed to load discussion comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post.id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.addComment(post.id, replyText.trim(), currentUser.id);
      setReplyText('');
      setFeedbackNotice(res.message);
      setTimeout(() => setFeedbackNotice(null), 3500);

      // Refresh comments
      await loadComments();

      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentCount: post.commentCount + 1,
        });
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Unable to submit reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>

        {regionName && (
          <span className="text-xs text-slate-500 font-medium">
            {regionName}
          </span>
        )}
      </div>

      {feedbackNotice && (
        <div className="bg-slate-100 border border-slate-200 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg text-center animate-in fade-in">
          {feedbackNotice}
        </div>
      )}

      {/* Main Discussion Post */}
      <article className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-3.5 shadow-2xs">
        {/* Author Metadata */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-slate-900 font-semibold">{post.author.anonymousHandle}</span>
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
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Post Title */}
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
          {post.title}
        </h1>

        {/* Full Post Content */}
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line select-text">
          {post.content}
        </p>

        {/* Bottom Actions Row */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <MessageSquare className="w-4 h-4" />
            <span>{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</span>
          </div>

          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
              isLiked
                ? 'bg-rose-50 border-rose-200 text-rose-600 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{currentLikes} helpful</span>
          </button>
        </div>
      </article>

      {/* Replies Thread Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Community Replies ({comments.length})
        </h2>

        {loadingComments ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Loading replies...
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-xs space-y-1">
            <p className="font-medium text-slate-700">No replies yet.</p>
            <p className="text-slate-400">Be the first to share your experience or practical advice.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {comments.map((comm) => {
              const isClinician = comm.author.badgeLabel === 'Clinician Moderator' || comm.author.anonymousHandle.includes('Dr. Seema');
              return (
                <div
                  key={comm.id}
                  className={`rounded-xl p-3.5 sm:p-4 text-xs space-y-2 border transition ${
                    isClinician
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span>{comm.author.anonymousHandle}</span>
                      {isClinician && (
                        <span className="text-[10px] text-[#002D72] bg-blue-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#002D72]" />
                          <span>Clinician</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comm.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line select-text">
                    {comm.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply Composer Form */}
        <form
          onSubmit={handleSendReply}
          className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Add your reply</span>
            <span>Replying as: <strong className="text-slate-800">{currentUser.anonymousHandle}</strong></span>
          </div>

          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share helpful advice, words of encouragement, or practical tips..."
            className="w-full p-3 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans leading-relaxed"
            required
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Reviewed by Dr. Seema to preserve privacy and safety.
            </span>
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Post Reply'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
