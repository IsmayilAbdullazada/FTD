import type { GoogleGenAI } from '@google/genai';
import { calculateLexicalScore, verifyRelevantChunks, type RankedChunk } from './rag.ts';

type SearchPost = {
  id: string; title: string; authorId: string; status: string;
  assignedGroupIds: string[]; condition?: 'FTD' | 'AD' | 'BOTH';
};
type SearchReply = { id: string; postId: string; status: string; sanitizedContent?: string; rawContent: string };
type SearchUser = { id: string; role: string; condition?: 'FTD' | 'AD' };

export async function findDiscussionAnswers(
  query: string, posts: SearchPost[], replies: SearchReply[],
  user: SearchUser | undefined, allowedGroupIds: string[], ai?: GoogleGenAI | null
) {
  if (!user) return [];
  const visible = posts.filter((post) => post.status === 'APPROVED' && (
    user.role !== 'CARE_PARTNER' || (
      (post.condition === 'BOTH' || (post.condition ?? 'FTD') === user.condition) &&
      (post.authorId === user.id || post.assignedGroupIds.some((id) => allowedGroupIds.includes(id)))
    )
  ));
  const candidates: RankedChunk[] = [];
  for (const post of visible) {
    // Match the answer itself, never a repeated unanswered question or private notes.
    for (const reply of replies.filter((r) => r.postId === post.id && r.status === 'APPROVED')) {
      const chunk = {
        id: reply.id, guideId: post.id, title: post.title,
        condition: 'GENERAL' as const, fileName: '', page: 1,
        content: reply.sanitizedContent ?? reply.rawContent, embedding: [],
      };
      const score = calculateLexicalScore(query, chunk);
      if (score > 0.35) candidates.push({ chunk, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const matched = await verifyRelevantChunks(query, candidates.slice(0, 8), ai);
  const ids = [...new Set(matched.map(({ chunk }) => chunk.guideId))].slice(0, 3);
  return ids.map((id) => {
    const post = visible.find((p) => p.id === id)!;
    return {
      id, title: post.title, url: `/?tab=feed&post=${encodeURIComponent(id)}`,
      replyCount: replies.filter((r) => r.postId === id && r.status === 'APPROVED').length,
    };
  });
}
