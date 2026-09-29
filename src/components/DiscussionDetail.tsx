import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);
  const [replyErrorMessage, setReplyErrorMessage] = useState<string | null>(null);

  const replyFormRef = useRef<HTMLFormElement | null>(null);
  const isClinician =
    currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';
  const regionName = post.assignedGroups[0]?.name.replace('Cohort', '').trim();
  const currentLikes = post.upvotes + (isLiked ? 1 : 0);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.getPostDetails(post.id, currentUser.role, currentUser.id);
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

    const submittedContent = replyText.trim();
    setIsSubmitting(true);
    setReplyErrorMessage(null);

    try {
      const res = await api.addComment(post.id, submittedContent, currentUser.id);
      setReplyText('');

      const confirmationText = isClinician
        ? 'Your clinical response has been published.'
        : 'Your reply was submitted successfully and sent to Dr. Seema for clinical safety review.';

      setReplySuccessMessage(confirmationText);
      setTimeout(() => setReplySuccessMessage(null), 6000);

      // Optimistically insert user's comment if not yet returned
      if (res.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === res.comment.id)) return prev;
          return [
            ...prev,
            {
              ...res.comment,
              status: isClinician ? 'APPROVED' : 'PENDING_MODERATION',
            },
          ];
        });
      }

      // Refresh comments from server
      await loadComments();

      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          commentCount: post.commentCount + 1,
        });
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      setReplyErrorMessage('Unable to submit your reply right now. Please try again.');
      setTimeout(() => setReplyErrorMessage(null), 5000);
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
              const isCommentClinician =
                comm.author.badgeLabel === 'Clinician Moderator' ||
                comm.author.anonymousHandle.includes('Dr. Seema');
              const isPending = comm.status === 'PENDING_MODERATION';

              return (
                <div
                  key={comm.id}
                  className={`rounded-2xl p-4 sm:p-5 text-sm space-y-2.5 border transition ${
                    isCommentClinician
                      ? 'bg-blue-50/50 border-blue-200'
                      : isPending
                      ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                      : 'bg-white border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span>{comm.author.anonymousHandle}</span>
                      {isCommentClinician && (
                        <span className="text-xs text-[#002D72] bg-blue-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#002D72]" />
                          <span>Clinician</span>
                        </span>
                      )}
                      {isPending && (
                        <span className="text-xs text-amber-800 bg-amber-100 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Under Review by Dr. Seema</span>
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

        {/* Reply Composer Form with Clear Confirmation */}
        <form
          ref={replyFormRef}
          onSubmit={handleSendReply}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-xs"
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Add your reply</span>
            <span>Replying as: <strong className="text-slate-800">{currentUser.anonymousHandle}</strong></span>
          </div>

          {/* Inline Success Notice */}
          {replySuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-sm text-emerald-900">
                  {isClinician ? 'Reply Published' : 'Reply Submitted for Clinical Review'}
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed font-sans">
                  {replySuccessMessage}
                </p>
              </div>
            </div>
          )}

          {/* Inline Error Notice */}
          {replyErrorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{replyErrorMessage}</span>
            </div>
          )}

          <textarea
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Share helpful advice, words of encouragement, or practical tips..."
            className="w-full p-3.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans leading-relaxed"
            required
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <span className="text-xs text-slate-400">
              Reviewed by Dr. Seema to preserve privacy and clinical safety.
            </span>
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Reply</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
