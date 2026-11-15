import { DeflectionMatch } from '@/types';

import { requestJson, safeFetchJson } from '@/shared/api/httpClient';

export const knowledgeApi = {
  // Pre-submission Typeahead Deflection
  deflectQuery: async (
    draftText: string,
  ): Promise<{ deflectionMatches: DeflectionMatch[] }> => {
    return safeFetchJson('/api/v1/knowledge/deflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftText }),
    });
  },

  // Keyword matching against existing community discussions & answers
  checkDiscussionMatches: async (payload: {
    title: string;
    content: string;
  }): Promise<{
    matches: {
      postId: string;
      title: string;
      snippet: string;
      authorHandle: string;
      replyCount: number;
      matchScore: number;
    }[];
  }> => {
    return safeFetchJson('/api/v1/deflection/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.title, content: payload.content }),
    });
  },

  // Instant discussion pool for real-time keystroke matching
  getAllDiscussionsPool: async (): Promise<{
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
    return safeFetchJson('/api/v1/deflection/discussions-pool', undefined);
  },

  // Closed-loop Assistant Grounded in Verified Institutional Care Guides
  chatWithAssistant: async (
    query: string,
    conversationHistory: Array<{
      role: string;
      content?: string;
      text?: string;
    }> = [],
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
    discussions?: {
      id: string;
      title: string;
      url: string;
      replyCount: number;
    }[];
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
    return requestJson(
      '/api/v1/knowledge/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversationHistory }),
      },
      (response) =>
        `Knowledge Assistant request failed: ${response.statusText || response.status}`,
    );
  },
};
