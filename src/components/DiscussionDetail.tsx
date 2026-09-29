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
      setFeedbackNotice('Unable to submit reply. Please try again.');
      setTimeout(() => setFeedbackNotice(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>

        {regionName && (
          <span className="text-xs sm:text-sm text-slate-500 font-medium">
            {regionName}
          </span>
        )}
      </div>

      {feedbackNotice && (
        <div className="bg-slate-100 border border-slate-200 text-slate-800 text-sm px-4 py-3 rounded-xl text-center animate-in fade-in">
          {feedbackNotice}
        </div>
      )}

      {/* Main Discussion Post */}
      <article className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 space-y-4 shadow-xs">
        {/* Author Metadata */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-900 font-semibold">{post.author.anonymousHandle}</span>
            {regionName && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{regionName}</span>
              </>
            )}
          </div>
          <span className="text-slate-400 text-xs">
            {new Date(post.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Post Title */}
        <h1 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 leading-snug tracking-tight">
          {post.title}
        </h1>

        {/* Full Post Content */}
        <p className="text-base sm:text-[17px] text-slate-700 leading-relaxed font-sans whitespace-pre-line select-text">
          {post.content}
        </p>

        {/* Bottom Actions Row */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <MessageSquare className="w-4 h-4 text-slate-400" />
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
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{currentLikes} helpful</span>
          </button>
        </div>
      </article>

      {/* Replies Thread Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">
          Community Replies ({comments.length})
        </h2>

        {loadingComments ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            Loading replies...
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm space-y-1">
            <p className="font-medium text-slate-700">No replies yet.</p>
            <p className="text-slate-400 text-xs sm:text-sm">Be the first to share your experience or practical advice.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comm) => {
              const isClinician = comm.author.badgeLabel === 'Clinician Moderator' || comm.author.anonymousHandle.includes('Dr. Seema');
              return (
                <div
                  key={comm.id}
                  className={`rounded-2xl p-4 sm:p-5 text-sm space-y-2.5 border transition ${
                    isClinician
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-white border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span>{comm.author.anonymousHandle}</span>
                      {isClinician && (
                        <span className="text-xs text-[#002D72] bg-blue-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#002D72]" />
                          <span>Clinician</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(comm.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed font-sans whitespace-pre-line select-text">
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
          className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Add your reply</span>
            <span>Replying as: <strong className="text-slate-800">{currentUser.anonymousHandle}</strong></span>
          </div>

          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share helpful advice, words of encouragement, or practical tips..."
            className="w-full p-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans leading-relaxed"
            required
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs text-slate-400">
              Reviewed by Dr. Seema to preserve privacy and clinical safety.
            </span>
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Post Reply'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
