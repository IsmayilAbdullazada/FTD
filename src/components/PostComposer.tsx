import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Search,
  X,
  Eye,
  Check,
} from 'lucide-react';
import { CurrentUser, CommunityGroup, DeflectionMatch, getProperGroupName } from '../types';
import { api } from '../services/api';
import { INITIAL_POSTS, INITIAL_COMMENTS } from '../data/clinicalStore';

interface PostComposerProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  onPostSubmitted: () => void;
  onCancel: () => void;
  onOpenResource: (resourceId: string) => void;
  onOpenDiscussion: (postId: string) => void;
}

export interface DiscussionSearchItem {
  id: string;
  title: string;
  content: string;
  authorHandle: string;
  authorBadge?: string;
  cohortName?: string;
  createdAt: string;
  replies: {
    id: string;
    content: string;
    authorHandle: string;
    authorBadge?: string;
    createdAt?: string;
  }[];
}

export interface RealtimeSnippetItem {
  beforeMatch: string;
  matchedText: string;
  afterMatch: string;
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
  signature: string;
}

export interface RealtimeMatchItem {
  id: string;
  postId: string;
  postTitle: string;
  matchedTerms: string[];
  titleMatched: boolean;
  snippets: RealtimeSnippetItem[];
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'that', 'this', 'these', 'those', 'it', 'its', 'my', 'your', 'his', 'her', 'their', 'our',
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'into', 'onto', 'from', 'about',
  'need', 'help', 'want', 'trying', 'tried', 'like', 'i', 'me', 'we', 'us', 'you',
]);

/**
 * Extracts distinct sentence snippets around the matched substring with '...'
 * Separates beforeMatch, matchedText, and afterMatch for high-fidelity bolding.
 */
function extractSentenceSnippets(
  text: string,
  queryWord: string,
  maxSnippets = 2
): RealtimeSnippetItem[] {
  if (!text || !queryWord) return [];
  const lowerText = text.toLowerCase();
  const lowerQuery = queryWord.toLowerCase();
  const queryLen = queryWord.length;

  const results: RealtimeSnippetItem[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length && results.length < maxSnippets) {
    const matchIndex = lowerText.indexOf(lowerQuery, searchFrom);
    if (matchIndex === -1) break;

    // Search sentence boundaries around matchIndex (. ! ? or newline)
    let sentenceStart = 0;
    for (let i = matchIndex - 1; i >= 0; i--) {
      const char = text[i];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        sentenceStart = i + 1;
        break;
      }
    }

    let sentenceEnd = text.length;
    for (let i = matchIndex + queryLen; i < text.length; i++) {
      const char = text[i];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        sentenceEnd = i + 1;
        break;
      }
    }

    // Clean whitespace around boundaries
    while (sentenceStart < matchIndex && /\s/.test(text[sentenceStart])) {
      sentenceStart++;
    }
    while (sentenceEnd > matchIndex + queryLen && /\s/.test(text[sentenceEnd - 1])) {
      sentenceEnd--;
    }

    let snippetStart = sentenceStart;
    let snippetEnd = sentenceEnd;

    // If snippet is longer than 110 characters, create a focused window around match
    if (snippetEnd - snippetStart > 110) {
      let windowStart = Math.max(sentenceStart, matchIndex - 35);
      let windowEnd = Math.min(sentenceEnd, matchIndex + queryLen + 45);

      if (windowStart > sentenceStart) {
        const spaceIdx = text.indexOf(' ', windowStart);
        if (spaceIdx !== -1 && spaceIdx < matchIndex) {
          windowStart = spaceIdx + 1;
        }
      }

      if (windowEnd < sentenceEnd) {
        const spaceIdx = text.lastIndexOf(' ', windowEnd);
        if (spaceIdx !== -1 && spaceIdx > matchIndex + queryLen) {
          windowEnd = spaceIdx;
        }
      }

      snippetStart = windowStart;
      snippetEnd = windowEnd;
    }

    const beforeMatch = text.substring(snippetStart, matchIndex);
    const matchedText = text.substring(matchIndex, matchIndex + queryLen);
    const afterMatch = text.substring(matchIndex + queryLen, snippetEnd);

    const hasLeadingEllipsis = snippetStart > 0;
    const hasTrailingEllipsis = snippetEnd < text.length;

    const signature = `${beforeMatch.trim()}|${matchedText.toLowerCase()}|${afterMatch.trim()}`;
    if (!results.some((r) => r.signature === signature)) {
      results.push({
        beforeMatch,
        matchedText,
        afterMatch,
        hasLeadingEllipsis,
        hasTrailingEllipsis,
        signature,
      });
    }

    searchFrom = Math.max(matchIndex + queryLen, sentenceEnd);
  }

  return results;
}

/**
 * Highlights matching keywords directly in the post headline link.
 */
function highlightTitleText(
  title: string,
  matchedTerms: string[]
): React.ReactNode {
  if (!matchedTerms || matchedTerms.length === 0) {
    return <span>{title}</span>;
  }

  const validTerms = matchedTerms
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  if (validTerms.length === 0) {
    return <span>{title}</span>;
  }

  // Sort longest terms first to match full phrases before sub-words
  const escapedTerms = validTerms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);

  try {
    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = title.split(pattern);

    return (
      <span>
        {parts.map((part, index) => {
          if (!part) return null;
          const isMatch = validTerms.some(
            (term) => term.toLowerCase() === part.toLowerCase()
          );
          if (isMatch) {
            return (
              <strong
                key={index}
                className="font-bold text-[#002D72] dark:text-amber-300 bg-amber-200/90 dark:bg-amber-950/80 px-1 py-0.5 rounded shadow-2xs mx-0.5"
              >
                {part}
              </strong>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  } catch {
    return <span>{title}</span>;
  }
}

/**
 * Searches across all old posts' headlines, content, and replies in real time with 0ms latency.
 * Groups matches by post ID so each post appears only once under its title without duplicates.
 */
function findRealtimeKeywordMatches(
  inputText: string,
  pool: DiscussionSearchItem[]
): RealtimeMatchItem[] {
  const trimmed = inputText.trim();
  if (trimmed.length < 2) return [];

  const lowerInput = trimmed.toLowerCase();
  const candidateTerms: string[] = [];

  // 1. Full phrase if <= 40 chars
  if (trimmed.length <= 40) {
    candidateTerms.push(lowerInput);
  }

  // 2. Meaningful keywords >= 3 chars
  const words = lowerInput
    .replace(/[^a-z0-9'-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  words.forEach((w) => {
    if (!candidateTerms.includes(w)) {
      candidateTerms.push(w);
    }
  });

  // 3. Current active word being typed (even 2 chars like 'ftd')
  const lastWordMatch = lowerInput.match(/([a-z0-9'-]+)$/);
  if (lastWordMatch && lastWordMatch[1].length >= 2) {
    const lastWord = lastWordMatch[1];
    if (!STOP_WORDS.has(lastWord) && !candidateTerms.includes(lastWord)) {
      candidateTerms.push(lastWord);
    }
  }

  if (candidateTerms.length === 0) return [];

  // Group matches by post ID so each post appears only once
  const postGroupMap = new Map<
    string,
    {
      postId: string;
      postTitle: string;
      matchedTerms: Set<string>;
      titleMatched: boolean;
      snippets: RealtimeSnippetItem[];
      score: number;
    }
  >();

  for (const post of pool) {
    for (const term of candidateTerms) {
      // 1. Check Headline (Title) - highlights directly in title, avoids repeating title below
      if (post.title.toLowerCase().includes(term)) {
        let group = postGroupMap.get(post.id);
        if (!group) {
          group = {
            postId: post.id,
            postTitle: post.title,
            matchedTerms: new Set<string>(),
            titleMatched: true,
            snippets: [],
            score: 0,
          };
          postGroupMap.set(post.id, group);
        }
        group.titleMatched = true;
        group.matchedTerms.add(term);
        group.score += 120 + (term === lowerInput ? 60 : 0) + term.length * 3;
      }

      // 2. Check Post Content
      if (post.content.toLowerCase().includes(term)) {
        const extracted = extractSentenceSnippets(post.content, term, 2);
        if (extracted.length > 0) {
          let group = postGroupMap.get(post.id);
          if (!group) {
            group = {
              postId: post.id,
              postTitle: post.title,
              matchedTerms: new Set<string>(),
              titleMatched: false,
              snippets: [],
              score: 0,
            };
            postGroupMap.set(post.id, group);
          }
          group.matchedTerms.add(term);
          group.score += 80 + (term === lowerInput ? 40 : 0) + term.length * 2;
          for (const snip of extracted) {
            if (!group.snippets.some((s) => s.signature === snip.signature)) {
              if (group.snippets.length < 3) {
                group.snippets.push(snip);
              }
            }
          }
        }
      }

      // 3. Check Replies (Comments)
      for (const reply of post.replies) {
        if (reply.content.toLowerCase().includes(term)) {
          const extracted = extractSentenceSnippets(reply.content, term, 1);
          if (extracted.length > 0) {
            let group = postGroupMap.get(post.id);
            if (!group) {
              group = {
                postId: post.id,
                postTitle: post.title,
                matchedTerms: new Set<string>(),
                titleMatched: false,
                snippets: [],
                score: 0,
              };
              postGroupMap.set(post.id, group);
            }
            group.matchedTerms.add(term);
            group.score += 90 + (term === lowerInput ? 45 : 0) + term.length * 2;
            for (const snip of extracted) {
              if (!group.snippets.some((s) => s.signature === snip.signature)) {
                if (group.snippets.length < 3) {
                  group.snippets.push(snip);
                }
              }
            }
          }
        }
      }
    }
  }

  const results: RealtimeMatchItem[] = Array.from(postGroupMap.values()).map(
    (g) => ({
      id: `match-group-${g.postId}`,
      postId: g.postId,
      postTitle: g.postTitle,
      matchedTerms: Array.from(g.matchedTerms),
      titleMatched: g.titleMatched,
      snippets: g.snippets,
      score: g.score,
    })
  );

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

interface SimilarDiscussionsBoxProps {
  matches: RealtimeMatchItem[];
  onDismiss: () => void;
  onOpenDiscussion: (postId: string) => void;
  onPreview: (postId: string) => void;
}

const SimilarDiscussionsBox: React.FC<SimilarDiscussionsBoxProps> = ({
  matches,
  onDismiss,
  onOpenDiscussion,
  onPreview,
}) => {
  if (matches.length === 0) return null;

  return (
    <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200/90 dark:border-blue-900/60 shadow-xs overflow-hidden animate-in fade-in duration-150 transition-colors">
      <div className="bg-slate-50/90 dark:bg-slate-800/90 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Posts that may be similar</span>
          <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 border border-transparent dark:border-blue-800/60 px-2 py-0.5 rounded-full">
            {matches.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
          title="Dismiss suggestions"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
        {matches.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition text-left space-y-2 border border-slate-100 dark:border-slate-800/80 hover:border-blue-100 dark:hover:border-blue-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Clickable headline of post - NO arrow sign ->, NO quotes, NO 'Open Discussion' button */}
              <button
                type="button"
                onClick={() => onOpenDiscussion(item.postId)}
                className="text-sm sm:text-base font-semibold text-[#002D72] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline text-left cursor-pointer transition min-w-0 flex-1 leading-snug"
              >
                {highlightTitleText(item.postTitle, item.matchedTerms)}
              </button>

              <button
                type="button"
                onClick={() => onPreview(item.postId)}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition font-medium flex items-center gap-1 shrink-0 cursor-pointer border border-slate-200/60 dark:border-slate-700"
                title="Preview discussion answers"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Preview</span>
              </button>
            </div>

            {/* If content or replies matched, show sentence snippet(s) with ... and bolding the matching substring */}
            {/* If only title matched, snippets is empty so the title is not repeated below itself */}
            {item.snippets.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                {item.snippets.map((snippet, sIdx) => (
                  <div
                    key={sIdx}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-lg p-2.5 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans"
                  >
                    {snippet.hasLeadingEllipsis && <span className="text-slate-400 dark:text-slate-500 font-bold">... </span>}
                    <span>{snippet.beforeMatch}</span>
                    <strong className="font-bold text-[#002D72] dark:text-amber-200 bg-amber-200/90 dark:bg-amber-950/90 px-1 py-0.5 rounded shadow-2xs mx-0.5">
                      {snippet.matchedText}
                    </strong>
                    <span>{snippet.afterMatch}</span>
                    {snippet.hasTrailingEllipsis && <span className="text-slate-400 dark:text-slate-500 font-bold"> ...</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/90 px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-sans">
        <span>💡 Tip: Click any post headline above to read the discussion, or continue writing your question below.</span>
      </div>
    </div>
  );
};

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  cohorts,
  onPostSubmitted,
  onCancel,
  onOpenResource,
  onOpenDiscussion,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState(
    cohorts.find((c) => !c.isGeneralBoard)?.id || cohorts[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPostData, setSubmittedPostData] = useState<{
    title: string;
    cohortName: string;
  } | null>(null);

  // Pool of all old discussions (seeded immediately from in-memory clinical store for 0ms startup)
  const [discussionsPool, setDiscussionsPool] = useState<DiscussionSearchItem[]>(() => {
    return INITIAL_POSTS.filter((p) => p.status === 'APPROVED').map((p) => {
      const postComments = INITIAL_COMMENTS.filter(
        (c) => c.postId === p.id && (c.status === 'APPROVED' || !c.status)
      );
      const cohort = p.assignedGroups?.[0];
      return {
        id: p.id,
        title: p.title,
        content: p.content,
        authorHandle: p.author.anonymousHandle,
        authorBadge: p.author.badgeLabel,
        cohortName: cohort?.properName || cohort?.name || 'General Clinic Forum',
        createdAt: p.createdAt,
        replies: postComments.map((c) => ({
          id: c.id,
          content: c.content,
          authorHandle: c.author.anonymousHandle,
          authorBadge: c.author.badgeLabel,
          createdAt: c.createdAt,
        })),
      };
    });
  });

  // Load latest pool from backend to ensure any new posts/comments in session are included
  useEffect(() => {
    let isMounted = true;
    api.getAllDiscussionsPool()
      .then((res) => {
        if (isMounted && res.pool && res.pool.length > 0) {
          setDiscussionsPool(res.pool);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch external discussions pool, using in-memory store:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time keyword matching: computed synchronously on every keystroke
  const titleMatches = useMemo(() => {
    return findRealtimeKeywordMatches(title, discussionsPool);
  }, [title, discussionsPool]);

  const contentMatches = useMemo(() => {
    return findRealtimeKeywordMatches(content, discussionsPool);
  }, [content, discussionsPool]);

  // In-flow matching suggestions visibility
  const [titleDismissed, setTitleDismissed] = useState(false);
  const [contentDismissed, setContentDismissed] = useState(false);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [solvedByDeflection, setSolvedByDeflection] = useState(false);

  // Keyboard shortcut listener to dismiss suggestions on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTitleDismissed(true);
        setContentDismissed(true);
        setPreviewPostId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto fadeout confirmation after 3.5 seconds
  useEffect(() => {
    if (!submittedPostData) return;

    const timer = setTimeout(() => {
      onPostSubmitted();
    }, 3500);

    return () => clearTimeout(timer);
  }, [submittedPostData, onPostSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const assignedCohort = cohorts.find((c) => c.id === selectedCohortId);
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        targetCohortId: selectedCohortId,
        authorId: currentUser.id,
      });

      setSubmittedPostData({
        title: title.trim(),
        cohortName: assignedCohort
          ? getProperGroupName(assignedCohort)
          : 'General Clinic Forum',
      });
    } catch (err) {
      console.error('Failed to submit post:', err);
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
          Posting as: <strong className="text-slate-800 dark:text-slate-200">{currentUser.anonymousHandle}</strong>
        </span>
      </div>

      {submitError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm p-4 rounded-xl">
          {submitError}
        </div>
      )}

      {submittedPostData ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-9 text-center space-y-5 shadow-xs animate-in fade-in transition-colors">
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Question Submitted for Clinical Review
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-md mx-auto leading-relaxed font-sans">
              Thank you, {currentUser.firstName}. Your question has been safely received by Dr. Seema Gulyani.
            </p>
          </div>

          {/* Submission Details Card */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 text-left max-w-lg mx-auto space-y-3 text-xs sm:text-sm font-sans">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-xs">Topic / Question:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {submittedPostData.title}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <span>Assigned Group:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{submittedPostData.cohortName}</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Personal details are automatically verified & clinical safety checked</span>
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

          <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
            Returning to discussions automatically in 3 seconds...
          </p>
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-xs transition-colors">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Ask a Question
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Connect with fellow care partners and receive guidance verified by Dr. Seema Gulyani.
            </p>
          </div>

          {/* Question or Topic Input with Real-Time Keystroke Matching */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Question or Topic
              </label>
              {title.trim().length >= 2 && titleMatches.length > 0 && !titleDismissed && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{titleMatches.length} similar {titleMatches.length === 1 ? 'discussion' : 'discussions'} found</span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleDismissed(false);
              }}
              placeholder="e.g. Managing resistance when bathing"
              className="w-full px-4 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shadow-2xs"
              required
            />

            {/* In-flow matching discussions box for Question/Topic - shifts elements below down */}
            {title.trim().length >= 2 && titleMatches.length > 0 && !titleDismissed && (
              <SimilarDiscussionsBox
                matches={titleMatches}
                onDismiss={() => setTitleDismissed(true)}
                onOpenDiscussion={onOpenDiscussion}
                onPreview={(id) => setPreviewPostId(id)}
              />
            )}
          </div>

          {/* Description Textarea with Real-Time Keystroke Matching */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Details
              </label>
              {content.trim().length >= 2 && contentMatches.length > 0 && !contentDismissed && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>{contentMatches.length} similar {contentMatches.length === 1 ? 'discussion' : 'discussions'} found</span>
                </span>
              )}
            </div>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setContentDismissed(false);
              }}
              placeholder="Share what is happening, what strategies you've tried, or what advice would be helpful..."
              className="w-full p-4 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 leading-relaxed font-sans transition shadow-2xs"
              required
            />

            {/* In-flow matching discussions box for Details - shifts elements below down */}
            {content.trim().length >= 3 && contentMatches.length > 0 && !contentDismissed && (
              <SimilarDiscussionsBox
                matches={contentMatches}
                onDismiss={() => setContentDismissed(true)}
                onOpenDiscussion={onOpenDiscussion}
                onPreview={(id) => setPreviewPostId(id)}
              />
            )}
          </div>

          {/* Audience selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              Target Group
            </label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition"
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {getProperGroupName(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Urgent messaging clinical warning - placed just before submit question, only once */}
          <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 rounded-xl p-4 text-amber-950 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-amber-950 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>This platform is not intended for urgent messaging</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-300/90 leading-relaxed font-sans">
              For urgent questions or clinical needs, please call the clinic phone number at{' '}
              <a href="tel:4109555147" className="font-bold text-[#002D72] dark:text-sky-400 underline hover:text-blue-900 dark:hover:text-sky-300">
                (410) 955-5147, option 2
              </a>{' '}
              or the care partner support line at{' '}
              <a href="tel:4105024163" className="font-bold text-emerald-800 dark:text-emerald-400 underline hover:text-emerald-950 dark:hover:text-emerald-300">
                (410) 502-4163
              </a>
              . For life-threatening emergencies, call <strong>911</strong>.
            </p>
          </div>

          {/* Clear, well-placed action button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="w-full py-3 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
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
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Original question by <strong className="text-slate-800 dark:text-slate-200">{activePreviewPost.authorHandle}</strong></span>
                  <span>{activePreviewPost.cohortName}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activePreviewPost.content}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Community & Clinical Guidance ({activePreviewPost.replies.length})
                  </h4>
                </div>

                {activePreviewPost.replies.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No replies yet for this question.</p>
                ) : (
                  <div className="space-y-2.5">
                    {activePreviewPost.replies.map((reply) => {
                      const isDrSeema = reply.authorHandle.includes('Dr. Seema') || reply.authorBadge?.includes('Clinician');
                      return (
                        <div
                          key={reply.id}
                          className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                            isDrSeema
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-semibold ${isDrSeema ? 'text-[#002D72] dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {reply.authorHandle} {isDrSeema && '⭐'}
                            </span>
                            {reply.authorBadge && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {reply.authorBadge}
                              </span>
                            )}
                          </div>
                          <p>{reply.content}</p>
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
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>✓ This answers my question</span>
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewPostId(null)}
                  className="w-full sm:w-auto px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-medium transition cursor-pointer"
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
                  className="w-full sm:w-auto px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Go to Full Discussion</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
