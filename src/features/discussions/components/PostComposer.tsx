import { reportError } from '@/shared/lib/logger';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import { knowledgeApi } from '@/features/knowledge/api/knowledgeApi';
import {
  Audience,
  CommunityGroup,
  CurrentUser,
  getProperGroupName,
} from '@/types';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  MessageCircleHeart,
  Phone,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  findRealtimeKeywordMatches,
  type DiscussionSearchItem,
} from '../lib/discussionSearch';
import { SimilarDiscussionsBox } from './SimilarDiscussionsBox';

interface PostComposerProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  initialTitle?: string;
  initialContent?: string;
  onPostSubmitted: () => void;
  onCancel: () => void;
  onOpenResource: (resourceId: string) => void;
  onOpenDiscussion: (postId: string) => void;
  onOpenAssistant: (query: string) => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  cohorts,
  initialTitle,
  initialContent,
  onPostSubmitted,
  onCancel,
  onOpenResource: _onOpenResource,
  onOpenDiscussion,
  onOpenAssistant,
}) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [content, setContent] = useState(initialContent || '');
  const [selectedCohortId, setSelectedCohortId] = useState(
    cohorts.find((c) => !c.isGeneralBoard)?.id || cohorts[0]?.id || '',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPostData, setSubmittedPostData] = useState<{
    title: string;
    cohortName: string;
  } | null>(null);

  useEffect(() => {
    setTitle(initialTitle || '');
    setContent(initialContent || '');
  }, [initialTitle, initialContent]);

  const canSeeClient = (user: CurrentUser, audience: Audience = 'FTD') =>
    user.role !== 'CARE_PARTNER' ||
    audience === 'BOTH' ||
    audience === user.condition;

  // Pool of all old discussions (seeded immediately from in-memory clinical store for 0ms startup)
  const [discussionsPool, setDiscussionsPool] = useState<
    DiscussionSearchItem[]
  >([]);

  // Load latest pool from backend to ensure any new posts/comments in session are included
  useEffect(() => {
    let isMounted = true;
    knowledgeApi
      .getAllDiscussionsPool(currentUser.id)
      .then((res) => {
        if (isMounted) setDiscussionsPool(res.pool ?? []);
      })
      .catch((err) => reportError('Could not fetch discussions pool:', err));
    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  // Debounced search query (300ms debounce across title & content, starting at 4 characters)
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const text =
      title.trim().length >= 4
        ? title.trim()
        : content.trim().length >= 4
          ? content.trim()
          : '';
    const timer = setTimeout(() => {
      setDebouncedQuery(text);
    }, 300);
    return () => clearTimeout(timer);
  }, [title, content]);

  const similarMatches = useMemo(() => {
    if (debouncedQuery.length < 4) return [];
    return findRealtimeKeywordMatches(debouncedQuery, discussionsPool);
  }, [debouncedQuery, discussionsPool]);

  // In-flow matching suggestions visibility
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [solvedByDeflection, setSolvedByDeflection] = useState(false);

  // audience state
  const isStaff = currentUser.role !== 'CARE_PARTNER';
  const [audience, setAudience] = useState<Audience>('BOTH');

  // Keyboard shortcut listener to dismiss suggestions on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSuggestionsDismissed(true);
        setPreviewPostId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const assignedCohort = cohorts.find((c) => c.id === selectedCohortId);
      await discussionApi.createPost({
        title: title.trim(),
        content: content.trim(),
        targetCohortId: selectedCohortId,
        authorId: currentUser.id,
        ...(isStaff ? { condition: audience } : {}),
      });

      setSubmittedPostData({
        title: title.trim(),
        cohortName: assignedCohort
          ? getProperGroupName(assignedCohort)
          : 'General Forum',
      });
    } catch (err) {
      reportError('Failed to submit post:', err);
      setSubmitError('Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardDraft = () => {
    setSolvedByDeflection(true);
    setTitle('');
    setContent('');
    setTimeout(() => {
      onCancel();
    }, 1500);
  };

  const activePreviewPost = useMemo(() => {
    if (!previewPostId) return null;
    return discussionsPool.find((p) => p.id === previewPostId) || null;
  }, [previewPostId, discussionsPool]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>
        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Posting as:{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            {currentUser.anonymousHandle}
          </strong>
        </span>
      </div>

      {submitError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm p-4 rounded-xl">
          {submitError}
        </div>
      )}

      {submittedPostData ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-9 text-center space-y-5 shadow-xs animate-in fade-in transition-colors">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Question Submitted for Review
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-md mx-auto leading-relaxed font-sans">
              Thank you, {currentUser.firstName}. Your question has been safely
              received and is now in review.
            </p>
          </div>

          {/* Submission Details Card */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 text-left max-w-lg mx-auto space-y-3 text-xs sm:text-sm font-sans">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-xs">
                Topic / Question:
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {submittedPostData.title}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <span>Assigned Group:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {submittedPostData.cohortName}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Personal details are verified and privacy protected before
                publishing
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>Standard review time: within 24 hours</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onPostSubmitted()}
              className="w-full sm:w-auto px-6 py-3 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>View in Discussions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSubmittedPostData(null);
                setTitle('');
                setContent('');
              }}
              className="w-full sm:w-auto px-5 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Ask Another Question
            </button>
          </div>
        </div>
      ) : solvedByDeflection ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2 shadow-xs animate-in fade-in transition-colors">
          <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
            Glad the existing discussion answers were helpful!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Returning you to discussions...
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-xs transition-colors"
        >
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Ask a Question
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Connect with fellow care partners and receive safe, verified
              guidance.
            </p>
          </div>

          {/* Safety notice */}
          <div className="space-y-3">
            {/* 911: first and most prominent */}
            <div
              role="alert"
              className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3"
            >
              <Phone className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-base sm:text-lg font-bold text-red-900 dark:text-red-200 leading-snug">
                For a life-threatening emergency, call{' '}
                <a
                  href="tel:911"
                  className="underline underline-offset-2 hover:text-red-950 dark:hover:text-red-100"
                >
                  911
                </a>{' '}
                right away.
              </p>
            </div>

            <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 rounded-xl p-4 space-y-2 text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>This platform is not for urgent messages</span>
              </div>
              <p className="text-sm leading-relaxed font-sans">
                This platform is not intended for urgent messages to your
                clinician. If you need to reach your clinician, please call your
                clinic at{' '}
                <a
                  href="tel:4109555147"
                  className="font-bold text-[#002D72] dark:text-sky-400 underline"
                >
                  (410) 955-5147, option 2
                </a>{' '}
                or send a message through EPIC.
              </p>
              <p className="text-sm leading-relaxed font-sans">
                Please do not share any confidential information through the
                portal. Submitted posts are reviewed once every 24 hours.
              </p>
            </div>
          </div>

          {/* Question or Topic Input with Debounced Real-Time Matching */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Question or Topic
              </label>
              {similarMatches.length > 0 && !suggestionsDismissed && (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {similarMatches.length} similar{' '}
                    {similarMatches.length === 1 ? 'discussion' : 'discussions'}{' '}
                    found
                  </span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSuggestionsDismissed(false);
              }}
              placeholder="e.g. Managing resistance when bathing"
              className="w-full px-4 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shadow-2xs"
              required
            />

            {/* Single Unified in-flow matching discussions box under Title */}
            {similarMatches.length > 0 && !suggestionsDismissed && (
              <SimilarDiscussionsBox
                matches={similarMatches}
                onDismiss={() => setSuggestionsDismissed(true)}
                onOpenDiscussion={onOpenDiscussion}
                onPreview={(id) => setPreviewPostId(id)}
              />
            )}
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Details
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSuggestionsDismissed(false);
              }}
              placeholder="Share what is happening, what strategies you've tried, or what advice would be helpful..."
              className="w-full p-4 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed font-sans transition shadow-2xs"
              required
            />
          </div>

          <aside
            aria-label="Try Care Companion before posting"
            className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-4"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <MessageCircleHeart
                aria-hidden="true"
                className="w-6 h-6 shrink-0 text-[#002D72] dark:text-sky-400 mt-0.5"
              />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-[#002D72] dark:text-sky-300">
                  Before you post, try Care Companion
                </h2>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Find guide pages and discussions that may help. Your post
                  draft will stay here while you look.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenAssistant(
                  [title.trim(), content.trim()]
                    .filter(Boolean)
                    .join(' — ')
                    .replace(/\s+/g, ' '),
                )
              }
              className="min-h-11 shrink-0 rounded-lg bg-[#002D72] dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Try Care Companion
            </button>
          </aside>

          {/* Audience selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Target Group
            </label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="w-full px-4 py-2.5 text-base min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition cursor-pointer"
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {getProperGroupName(c)}
                </option>
              ))}
            </select>
          </div>

          {isStaff ? (
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Who can see this post
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['FTD', 'FTD only'],
                    ['AD', 'AD only'],
                    ['BOTH', 'Both groups'],
                  ] as [Audience, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAudience(value)}
                    className={`min-h-11 px-3 py-2.5 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      audience === value
                        ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <></>
          )}

          {/* Clear, well-placed action button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="w-full min-h-12 py-3 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-base font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Question'}</span>
            </button>
          </div>
        </form>
      )}

      {/* QUICK PREVIEW MODAL FOR ANSWERED DISCUSSIONS */}
      {activePreviewPost && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Existing Answered Discussion"
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 text-slate-800 dark:text-slate-100"
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="space-y-0.5 min-w-0 pr-3">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Existing Answered Discussion</span>
                </span>
                <h3 className="font-serif font-semibold text-slate-900 dark:text-white text-base sm:text-lg truncate">
                  {activePreviewPost.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPostId(null)}
                className="min-w-9 min-h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>
                    Original question by{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {activePreviewPost.authorHandle}
                    </strong>
                  </span>
                  <span>{activePreviewPost.cohortName}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base">
                  {activePreviewPost.content}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Community & Moderator Guidance (
                    {activePreviewPost.replies.length})
                  </h4>
                </div>

                {activePreviewPost.replies.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    No replies yet for this question.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {activePreviewPost.replies.map((reply) => {
                      const isModerator =
                        reply.authorHandle.includes('Moderator') ||
                        reply.authorHandle.includes('Dr. Seema') ||
                        reply.authorBadge?.includes('Moderator') ||
                        reply.authorBadge?.includes('Clinician');
                      return (
                        <div
                          key={reply.id}
                          className={`p-3.5 rounded-xl border text-sm leading-relaxed space-y-1.5 ${
                            isModerator
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={`font-semibold ${isModerator ? 'text-[#002D72] dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                              {reply.authorHandle} {isModerator && '⭐'}
                            </span>
                            {reply.authorBadge && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
                                {reply.authorBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-sm sm:text-base leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="w-full sm:w-auto min-h-11 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>✓ This answers my question</span>
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewPostId(null)}
                  className="w-full sm:w-auto min-h-11 px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-semibold transition cursor-pointer"
                >
                  Keep Writing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = activePreviewPost.id;
                    setPreviewPostId(null);
                    onOpenDiscussion(id);
                  }}
                  className="w-full sm:w-auto min-h-11 px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Go to Full Discussion</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
