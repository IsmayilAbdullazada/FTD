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
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'with',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'my',
  'your',
  'his',
  'her',
  'their',
  'our',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'all',
  'any',
  'both',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'can',
  'will',
  'just',
  'should',
  'now',
  'into',
  'onto',
  'from',
  'about',
  'need',
  'help',
  'want',
  'trying',
  'tried',
  'like',
  'i',
  'me',
  'we',
  'us',
  'you',
]);

/**
 * Extracts distinct sentence snippets around the matched substring with '...'
 * Separates beforeMatch, matchedText, and afterMatch for high-fidelity bolding.
 */
function extractSentenceSnippets(
  text: string,
  queryWord: string,
  maxSnippets = 2,
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
    while (
      sentenceEnd > matchIndex + queryLen &&
      /\s/.test(text[sentenceEnd - 1])
    ) {
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
 * Searches across all old posts' headlines, content, and replies in real time with 0ms latency.
 * Groups matches by post ID so each post appears only once under its title without duplicates.
 */
export function findRealtimeKeywordMatches(
  inputText: string,
  pool: DiscussionSearchItem[],
): RealtimeMatchItem[] {
  const trimmed = inputText.trim();
  if (trimmed.length < 4) return [];

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

  // 3. Current active word being typed (if >= 3 chars)
  const lastWordMatch = lowerInput.match(/([a-z0-9'-]+)$/);
  if (lastWordMatch && lastWordMatch[1].length >= 3) {
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
            group.score +=
              90 + (term === lowerInput ? 45 : 0) + term.length * 2;
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
    }),
  );

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}
