import { DeflectionMatch } from '@/types';
import {
  communityFallbackStore,
  contentFallbackStore,
} from '@/shared/dev/devFallbackStore';
import { apiFetch, safeFetchJson } from '@/shared/api/httpClient';

const {
  posts: localPosts,
  comments: localComments,
} = communityFallbackStore;

export const knowledgeApi = {
  // Pre-submission Typeahead Deflection
  deflectQuery: async (draftText: string, userId: string): Promise<{ deflectionMatches: DeflectionMatch[] }> => {
    return safeFetchJson(
      '/api/v1/knowledge/deflect',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftText }),
      },
      () => {
        const text = draftText.toLowerCase();
        const matches: DeflectionMatch[] = [];

        contentFallbackStore.resources.forEach((res) => {
          const combined = `${res.title} ${res.summary} ${res.contentBody}`.toLowerCase();
          const words = text.split(/\s+/).filter((w) => w.length > 3);
          const score = words.filter((w) => combined.includes(w)).length;
          if (score >= 1) {
            matches.push({
              sourceType: 'RESOURCE',
              id: res.id,
              title: res.title,
              category: res.category,
              snippet: res.summary,
              url: res.externalUrl,
              confidenceScore: Math.min(0.95, 0.6 + score * 0.1),
            });
          }
        });

        return { deflectionMatches: matches.slice(0, 3) };
      }
    );
  },

  // Keyword matching against existing community discussions & answers
  checkDiscussionMatches: async (payload: { title: string; content: string; userId: string }): Promise<{
    matches: {
      postId: string;
      title: string;
      snippet: string;
      authorHandle: string;
      replyCount: number;
      matchScore: number;
    }[];
  }> => {
    return safeFetchJson(
      '/api/v1/deflection/discussions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, content: payload.content }),
      },
      () => {
        const rawText = `${payload.title} ${payload.content}`.toLowerCase();
        const stopWords = new Set([
          'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'what', 'when',
          'where', 'who', 'how', 'why', 'are', 'was', 'were', 'will', 'would', 'could',
          'should', 'can', 'about', 'just', 'some', 'any', 'not', 'you', 'your', 'our',
          'their', 'they', 'them', 'she', 'her', 'his', 'him', 'does', 'did', 'been',
        ]);
        const queryWords = rawText
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !stopWords.has(w));

        if (queryWords.length === 0) return { matches: [] };

        const matches: {
          postId: string;
          title: string;
          snippet: string;
          authorHandle: string;
          replyCount: number;
          matchScore: number;
        }[] = [];
        const approvedPosts = localPosts.filter((p) => p.status === 'APPROVED');

        for (const post of approvedPosts) {
          const postComments = localComments.filter((c) => c.postId === post.id);
          let bestScore = 0;
          let bestSnippet = post.content;

          const titleLower = post.title.toLowerCase();
          const titleMatches = queryWords.filter((w) => titleLower.includes(w)).length;
          if (titleMatches > 0) bestScore += titleMatches * 3;

          const contentLower = post.content.toLowerCase();
          const contentMatches = queryWords.filter((w) => contentLower.includes(w)).length;
          if (contentMatches > 0) bestScore += contentMatches * 1.5;

          for (const comm of postComments) {
            const commLower = comm.content.toLowerCase();
            const commMatches = queryWords.filter((w) => commLower.includes(w)).length;
            if (commMatches > 0) {
              const commScore = commMatches * 2;
              if (commScore > bestScore) {
                bestScore = commScore;
                bestSnippet = comm.content;
              }
            }
          }

          if (bestScore >= 2) {
            matches.push({
              postId: post.id,
              title: post.title,
              snippet: bestSnippet.slice(0, 160) + (bestSnippet.length > 160 ? '...' : ''),
              authorHandle: post.author.anonymousHandle,
              replyCount: postComments.length,
              matchScore: bestScore,
            });
          }
        }

        matches.sort((a, b) => b.matchScore - a.matchScore);
        return { matches: matches.slice(0, 2) };
      }
    );
  },

  // Instant discussion pool for real-time keystroke matching
  getAllDiscussionsPool: async (userId: string): Promise<{
    pool: {
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
    }[];
  }> => {
    return safeFetchJson(
      '/api/v1/deflection/discussions-pool',
      undefined,
      () => {
        const approvedPosts = localPosts.filter((p) => p.status === 'APPROVED');
        const pool = approvedPosts.map((p) => {
          const postComments = localComments.filter((c) => c.postId === p.id && (c.status === 'APPROVED' || !c.status));
          const cohort = p.assignedGroups?.[0];
          return {
            id: p.id,
            title: p.title,
            content: p.content,
            authorHandle: p.author.anonymousHandle,
            authorBadge: p.author.badgeLabel,
            cohortName: cohort?.properName || cohort?.name || 'General Forum',
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
        return { pool };
      }
    );
  },

  // Closed-loop Assistant Grounded in Verified Institutional Care Guides
  chatWithAssistant: async (
    query: string,
    userId: string = 'anonymous',
    conversationHistory: Array<{ role: string; content?: string; text?: string }> = []
  ): Promise<{
    answer: string;
    retrievedChunks?: Array<{
      guideTitle: string;
      fileName: string;
      page: number;
      content: string;
      score: number;
    }>;
    isOffline?: boolean;
    isDisabled?: boolean;
    isMedicationRefusal?: boolean;
    discussionDraft?: { title: string; content: string };
    discussions?: { id: string; title: string; url: string; replyCount: number }[];
    citedResources?: Array<{
      id: string;
      title: string;
      fileName?: string;
      page?: number;
      url: string;
    }>;
    suggestedQuestions?: string[];
    isUploadedGuideSourced?: boolean;
    matchedGuide?: {
      id: string;
      title: string;
      fileName: string;
      page?: number;
      sectionTitle?: string;
    };
  }> => {
    const res = await apiFetch('/api/v1/knowledge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversationHistory }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Knowledge Assistant request failed: ${res.statusText || res.status}`);
    }
    return res.json();
  },
};
