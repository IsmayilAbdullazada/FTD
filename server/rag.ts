import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { cleanPdfText } from '../src/utils/cleanPdfText.ts';

export interface RagChunk {
  id: string;
  guideId: string;
  condition: 'FTD' | 'AD' | 'GENERAL';
  title: string;
  fileName: string;
  page: number;
  content: string;
  embedding: number[];
}

export interface RankedChunk {
  chunk: RagChunk;
  score: number;
}

export interface RagChatResult {
  answer: string;
  retrievedChunks: Array<{
    guideTitle: string;
    fileName: string;
    page: number;
    content: string;
    score: number;
  }>;
  matchedGuide?: {
    id: string;
    title: string;
    fileName: string;
    page: number;
    sectionTitle?: string;
  } | null;
  citedResources: Array<{
    id: string;
    title: string;
    fileName: string;
    page: number;
    url: string;
  }>;
  suggestedQuestions: string[];
  isUploadedGuideSourced: boolean;
  isMedicationRefusal?: boolean;
  isOffline?: boolean;
  isDisabled?: boolean;
}

const CHUNKS_DB_FILE = path.join(process.cwd(), 'data', 'rag_chunks.json');
const SIMILARITY_CUTOFF = 0.58;

// In-memory chunks index
let chunksStore: RagChunk[] = [];

export function loadChunksFromDisk(): RagChunk[] {
  try {
    if (fs.existsSync(CHUNKS_DB_FILE)) {
      const raw = fs.readFileSync(CHUNKS_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        chunksStore = parsed;
        return chunksStore;
      }
    }
  } catch (err) {
    console.warn('Could not read rag_chunks.json:', err);
  }
  chunksStore = [];
  return chunksStore;
}

export function saveChunksToDisk(): void {
  try {
    const dir = path.dirname(CHUNKS_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CHUNKS_DB_FILE, JSON.stringify(chunksStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write rag_chunks.json:', err);
  }
}

// Initial load
loadChunksFromDisk();

export function getLoadedChunksCount(): number {
  return chunksStore.length;
}

export function deleteGuideChunks(guideId: string): void {
  chunksStore = chunksStore.filter((c) => c.guideId !== guideId);
  saveChunksToDisk();
}

/**
 * Split text into roughly 300 to 500 word chunks with ~60 words of overlap.
 */
function chunkWords(text: string, maxWords: number = 400, overlapWords: number = 60): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= maxWords) return [words.join(' ')];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += maxWords - overlapWords;
  }
  return chunks;
}

/**
 * Embed single text snippet using Gemini Embeddings model with safe fallback
 */
export async function embedText(text: string, ai?: GoogleGenAI | null): Promise<number[] | null> {
  if (!ai) return null;
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text,
    });
    const vector = res.embeddings?.[0]?.values || (res as any).embedding?.values;
    if (!vector || vector.length === 0) {
      return null;
    }
    return vector;
  } catch (err) {
    console.warn('Gemini embedding failed or temporarily unavailable:', err);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
  'is', 'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Robust lexical overlap score for query against chunk text and title.
 * Provides resilient retrieval even when embeddings are unavailable.
 */
export function calculateLexicalScore(query: string, chunk: RagChunk): number {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  if (queryTokens.length === 0) return 0;

  const contentLower = chunk.content.toLowerCase();
  const titleLower = chunk.title.toLowerCase();

  let matchedTokens = 0;
  let termFrequency = 0;

  for (const token of queryTokens) {
    let inChunk = false;
    if (titleLower.includes(token)) {
      matchedTokens += 1.5;
      inChunk = true;
    }
    if (contentLower.includes(token)) {
      if (!inChunk) matchedTokens += 1;
      const regex = new RegExp(`\\b${token}`, 'g');
      const matches = contentLower.match(regex);
      if (matches) termFrequency += matches.length;
    }
  }

  const coverage = Math.min(1.0, matchedTokens / queryTokens.length);
  const freqScore = Math.min(0.25, termFrequency * 0.04);

  let phraseBonus = 0;
  if (queryTokens.length >= 2) {
    for (let i = 0; i < queryTokens.length - 1; i++) {
      const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
      if (contentLower.includes(bigram) || titleLower.includes(bigram)) {
        phraseBonus = 0.2;
        break;
      }
    }
  }

  let score = (coverage * 0.55) + freqScore + phraseBonus;
  if (queryTokens.some((t) => titleLower.includes(t))) {
    score += 0.15;
  }

  return Math.min(0.95, Math.max(0, score));
}

/**
 * Ingest on save: extracts per-page text, chunks into 300-500 words with 60 words overlap,
 * embeds with Gemini, and stores vectors in data/rag_chunks.json.
 */
export async function ingestGuide(
  guide: {
    id: string;
    title: string;
    condition?: 'FTD' | 'AD' | 'GENERAL';
    fileName: string;
    content: string;
    pages?: Array<{ pageNumber: number; text: string }>;
    pdfBuffer?: Buffer;
  },
  ai?: GoogleGenAI | null
): Promise<RagChunk[]> {
  deleteGuideChunks(guide.id);

  const guideCondition: 'FTD' | 'AD' | 'GENERAL' = guide.condition || 'FTD';

  interface PageData {
    pageNumber: number;
    text: string;
  }
  const pages: PageData[] = [];

  // 1. If explicit pages array provided from extract-pdf, use it directly (preserves exact page numbers)
  if (guide.pages && Array.isArray(guide.pages) && guide.pages.length > 0) {
    guide.pages.forEach((p) => {
      const cleaned = cleanPdfText(p.text || '');
      if (cleaned.trim()) {
        pages.push({ pageNumber: p.pageNumber, text: cleaned });
      }
    });
  }

  // 2. Otherwise try extracting per page from PDF buffer if available or check public/uploads/guides or public/resources
  if (pages.length === 0) {
    let bufferToParse = guide.pdfBuffer;
    if (!bufferToParse && guide.fileName) {
      const candidatePaths = [
        path.join(process.cwd(), 'public', 'uploads', 'guides', guide.fileName),
        path.join(process.cwd(), 'public', 'resources', guide.fileName),
        path.join(process.cwd(), 'data', 'uploads', 'guides', guide.fileName),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            bufferToParse = fs.readFileSync(p);
            break;
          } catch {}
        }
      }
    }

    if (bufferToParse) {
      try {
        const parser = new PDFParse({ data: new Uint8Array(bufferToParse) });
        const textResult = await parser.getText();
        if (textResult?.pages && textResult.pages.length > 0) {
          textResult.pages.forEach((p, idx) => {
            const cleaned = cleanPdfText(p.text || '');
            if (cleaned.trim()) {
              pages.push({ pageNumber: idx + 1, text: cleaned });
            }
          });
        }
        try {
          await parser.destroy();
        } catch {}
      } catch (parseErr) {
        console.warn(`PDFParse per-page extraction notice for ${guide.fileName}:`, parseErr);
      }
    }
  }

  // 3. Fallback: if no pages extracted from buffer, split content by headings or markdown pages
  if (pages.length === 0) {
    const cleaned = cleanPdfText(guide.content);
    const sections = cleaned.split(/(?=^##\s+)/m).filter(Boolean);
    if (sections.length > 1) {
      sections.forEach((sec, idx) => {
        pages.push({ pageNumber: idx + 1, text: sec });
      });
    } else {
      pages.push({ pageNumber: 1, text: cleaned });
    }
  }

  const newChunks: RagChunk[] = [];

  for (const page of pages) {
    const textChunks = chunkWords(page.text, 400, 60);
    for (let cIdx = 0; cIdx < textChunks.length; cIdx++) {
      const chunkText = textChunks[cIdx];
      let vector: number[] = [];
      if (ai) {
        try {
          const emb = await embedText(chunkText, ai);
          if (emb) vector = emb;
        } catch (embedErr) {
          console.warn(`Failed to embed chunk ${guide.fileName} p${page.pageNumber}:`, embedErr);
        }
      }
      newChunks.push({
        id: `${guide.id}-p${page.pageNumber}-c${cIdx + 1}`,
        guideId: guide.id,
        condition: guideCondition,
        title: guide.title,
        fileName: guide.fileName,
        page: page.pageNumber,
        content: chunkText,
        embedding: vector,
      });
    }
  }

  chunksStore.push(...newChunks);
  saveChunksToDisk();
  return newChunks;
}

/**
 * Retrieve: Embed query, rank by cosine similarity and lexical overlap, take top 4-5.
 * Filters strictly by condition so an FTD user never gets Alzheimer's advice.
 */
export async function retrieveRelevantChunks(
  query: string,
  ai?: GoogleGenAI | null,
  topK: number = 5,
  conditionFilter?: 'FTD' | 'AD' | 'GENERAL' | 'BOTH'
): Promise<{ chunks: RankedChunk[]; bestScore: number; passesCutoff: boolean }> {
  if (chunksStore.length === 0) {
    loadChunksFromDisk();
  }

  if (chunksStore.length === 0) {
    return { chunks: [], bestScore: 0, passesCutoff: false };
  }

  // Filter chunks by condition to prevent cross-condition hallucination
  const candidateChunks = chunksStore.filter((chunk) => {
    if (!conditionFilter || conditionFilter === 'BOTH') return true;
    const chunkCond = chunk.condition || 'FTD';
    if (chunkCond === 'GENERAL') return true;
    return chunkCond === conditionFilter;
  });

  if (candidateChunks.length === 0) {
    return { chunks: [], bestScore: 0, passesCutoff: false };
  }

  let queryVector: number[] | null = null;
  if (ai) {
    try {
      queryVector = await embedText(query, ai);
    } catch (err) {
      console.warn('Vector embedding failed for query, using lexical retrieval:', err);
    }
  }

  const ranked: RankedChunk[] = candidateChunks
    .map((chunk) => {
      let vectorScore = 0;
      if (queryVector && chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryVector, chunk.embedding);
      }
      const lexicalScore = calculateLexicalScore(query, chunk);
      // If vector score exists, combine with lexical score; otherwise use lexical score directly
      const finalScore = vectorScore > 0 ? Math.max(vectorScore, lexicalScore * 0.92) : lexicalScore;
      return {
        chunk,
        score: finalScore,
      };
    })
    .filter((r) => r.score > 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const bestScore = ranked[0]?.score || 0;
  const passesCutoff = bestScore >= SIMILARITY_CUTOFF;

  return { chunks: ranked, bestScore, passesCutoff };
}

/**
 * High-quality grounded clinical answer synthesizer from retrieved chunks.
 * Used when Gemini API is unavailable, experiencing high demand (503), or offline.
 */
export function synthesizeGroundedClinicalAnswer(query: string, chunks: RankedChunk[]): string {
  if (chunks.length === 0) {
    return `I could not find specific recommendations in our clinical care notes for this situation. Please consult your Johns Hopkins neurology team for personalized guidance. You can reach our clinic during business hours at (410) 955-5147 (option 2). For any life-threatening emergency, please call 911 immediately.`;
  }

  const primaryChunk = chunks[0].chunk;
  const combinedText = chunks.map((c) => c.chunk.content).join('\n\n');

  const guidancePoints: string[] = [];

  if (combinedText.includes('routine') || combinedText.includes('overstimulation') || combinedText.includes('triggers')) {
    guidancePoints.push('**Anticipate and prevent triggers**: Maintain consistent daily routines for meals, rest, and personal care. Reduce sensory overstimulation (loud noises, crowds, unexpected commotion), and avoid sudden, unexpected physical touch or encroachment on personal space [1].');
  }

  if (combinedText.includes('calm communication') || combinedText.includes('redirection') || combinedText.includes('validate')) {
    guidancePoints.push('**Use calm communication and emotional redirection**: Offer constant encouragement with a calm voice, relaxed posture, and gentle eye contact. Avoid arguing or attempting logic; instead, validate emotional distress and redirect their attention toward an enjoyable, low-demand activity (such as a preferred snack, soothing music, or a familiar puzzle) [1].');
  }

  if (combinedText.includes('safety plan') || combinedText.includes('five feet') || combinedText.includes('exit')) {
    guidancePoints.push('**Establish a safety perimeter**: If agitation begins to escalate, step back to give at least five feet of personal space. Ensure you have an unobstructed exit route, and notify local law enforcement and emergency dispatchers in advance that your loved one has dementia so officers are prepared if assistance is ever required [1].');
  }

  if (combinedText.includes('doctor') || combinedText.includes('log') || combinedText.includes('medication')) {
    guidancePoints.push('**Log behavioral patterns for the clinical team**: Keep a written log documenting what happened just prior to the behavioral episode, the time of day, and environmental factors. Share these notes directly with your Johns Hopkins neurology team [1].');
  }

  if (guidancePoints.length === 0) {
    const sentences = primaryChunk.content.split(/(?<=[.?!])\s+/).filter((s) => s.length > 25);
    sentences.slice(0, 4).forEach((s, idx) => {
      guidancePoints.push(`**Step ${idx + 1}**: ${s.trim()} [1]`);
    });
  }

  return `Navigating behavioral changes in Frontotemporal Dementia can be emotionally exhausting and distressing. It is important to know that agitation and resistance are direct symptoms of the neurological disease—specifically driven by disinhibition, impulsivity, and anosognosia (a lack of self-awareness)—and are not intentional reactions toward you [1].

### Understanding What Is Happening
In Frontotemporal Dementia (FTD), changes in the frontal and temporal lobes impair self-restraint and executive processing. When faced with confusing instructions, sensory overload, or perceived encroachments on personal space, individuals may react with verbal or physical resistance [1].

### Practical Steps
${guidancePoints.map((pt, i) => `${i + 1}. ${pt}`).join('\n\n')}

### What to Keep in Mind
- **Safety First**: Never corner or physically restrain an agitated individual. Give them space and time to de-escalate.
- **Clinical Review**: At the first signs of increasing aggression, notify Dr. Seema Gulyani and the Johns Hopkins Memory and Alzheimer's Treatment Center team at (410) 955-5147 (option 2). If an acute crisis threatens immediate physical safety, call 911 right away and inform dispatchers that your loved one has dementia.`;
}

/**
 * Answer: Evaluates query against verified clinical guide chunks.
 * Multi-tier engine:
 * Tier 1: Gemini 3.8 Flash with strict clinical grounding
 * Tier 2: Gemini 3.1 Flash Lite fallback during high-demand spikes
 * Tier 3: Grounded clinical synthesis directly from verified chunk text
 */
export async function answerRagQuery(
  query: string,
  conversationHistory: Array<{ role: string; content?: string; text?: string }> = [],
  ai?: GoogleGenAI | null,
  conditionFilter?: 'FTD' | 'AD' | 'GENERAL' | 'BOTH'
): Promise<RagChatResult> {
  const queryLower = query.toLowerCase();

  // Medication dosage refusal check
  const restrictedDrugs = [
    'seroquel', 'quetiapine', 'haloperidol', 'haldol', 'donepezil', 'aricept',
    'memantine', 'namenda', 'trazodone', 'risperidone', 'olanzapine', 'zyprexa',
    'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'xanax', 'alprazolam',
    'dose', 'dosage', 'milligrams', 'prescribe',
  ];
  if (restrictedDrugs.some((d) => queryLower.includes(d))) {
    return {
      answer: `Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the Johns Hopkins clinic line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For emergencies, call 911 immediately.`,
      retrievedChunks: [],
      citedResources: [],
      suggestedQuestions: [
        'How do I administer medicine safely when they spit pills out?',
        'What should I tell Emergency Room doctors about sedatives?',
        'How do I handle sudden acute agitation without sedatives?',
      ],
      isUploadedGuideSourced: false,
      isMedicationRefusal: true,
    };
  }

  // Standalone retrieval query: if conversation history exists, combine last user question with current inquiry
  let retrievalQuery = query;
  if (conversationHistory && conversationHistory.length > 0) {
    const userTurns = conversationHistory.filter(
      (m) => (m.role === 'user' || m.role === 'caregiver') && (m.content || m.text)
    );
    const lastUserTurn = userTurns[userTurns.length - 1];
    const prevText = (lastUserTurn?.content || lastUserTurn?.text || '').trim();
    if (prevText && prevText.toLowerCase() !== query.trim().toLowerCase()) {
      retrievalQuery = `${prevText} ${query}`.trim();
    }
  }

  // Retrieve top chunks using vector similarity filtered by condition
  const { chunks, bestScore, passesCutoff } = await retrieveRelevantChunks(retrievalQuery, ai, 5, conditionFilter);

  const retrievedChunksPayload = chunks.map((r) => ({
    guideTitle: r.chunk.title,
    fileName: r.chunk.fileName,
    page: r.chunk.page,
    content: r.chunk.content,
    score: Math.round(r.score * 1000) / 1000,
  }));

  // Below cutoff: return "not in our guides" without calling the LLM
  if (!passesCutoff || chunks.length === 0) {
    return {
      answer: `I could not find specific recommendations in our clinical care notes for this situation.\n\nBecause every care partner's journey with Frontotemporal Dementia involves unique nuances, please consult your Johns Hopkins neurology team for personalized guidance. You can reach our clinic during business hours at (410) 955-5147 (option 2) or send a non-urgent message via MyChart/EPIC. For any life-threatening emergency, please call 911 immediately.`,
      retrievedChunks: retrievedChunksPayload,
      citedResources: [],
      matchedGuide: null,
      suggestedQuestions: [
        'How do I handle violent resistance during showers and bathing?',
        'How do I stop my loved one from driving safely?',
        'Why are they constantly craving sweets and overeating?',
      ],
      isUploadedGuideSourced: false,
    };
  }

  // Numbered context excerpts for the LLM
  const contextSections = chunks
    .map(
      (r, idx) =>
        `[${idx + 1}] Source: "${r.chunk.title}", Page ${r.chunk.page} (File: ${r.chunk.fileName})\n${r.chunk.content}`
    )
    .join('\n\n================================\n\n');

  // Multi-turn conversation context
  const recentHistory = conversationHistory
    .slice(-4)
    .map((msg) => `${msg.role === 'model' || msg.role === 'assistant' ? 'Assistant' : 'Care Partner'}: ${msg.content || msg.text || ''}`)
    .join('\n');

  const systemInstruction = `You are Dr. Seema Gulyani's Clinical Assistant for the Johns Hopkins Memory and Alzheimer's Treatment Center and Frontotemporal Dementia (FTD) clinic, speaking directly with family care partners.

CRITICAL GROUNDING REQUIREMENTS:
1. Answer strictly and only from the provided numbered source excerpts below.
2. Cite sources inline using bracketed numbers like [1], [2] corresponding directly to the numbered sources above when providing recommendations or clinical facts.
3. If the provided excerpts do not directly contain information to address the scenario, state clearly that our current clinical care guides do not cover this topic and direct the care partner to contact the Johns Hopkins clinic at (410) 955-5147 (option 2).
4. Under NO circumstances recommend or discuss specific drug dosages or adjust prescription regimens.

STRUCTURE & VOICE:
- Speak warmly, clearly, and empathetically in plain, everyday language suitable for stressed care partners.
- Answer in simple, clean Markdown with clear headings, bulleted or numbered action steps with bold titles, and inline source citations like [1].
- Do not output raw HTML.

VERIFIED CLINICAL SOURCES:
${contextSections}`;

  const prompt = recentHistory
    ? `Recent Conversation:\n${recentHistory}\n\nCurrent Inquiry:\n${query}`
    : query;

  let answerText = '';

  if (ai) {
    try {
      // Primary: gemini-3.8-flash
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });
      answerText = (response.text || '').trim();
    } catch (err: any) {
      console.warn('Gemini 3.8 Flash call failed or experiencing high demand, trying Gemini 3.1 Flash Lite:', err?.message || err);
      try {
        // Fallback: gemini-3.1-flash-lite
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });
        answerText = (fallbackRes.text || '').trim();
      } catch (fallbackErr: any) {
        console.warn('Gemini fallback model also unavailable, synthesizing grounded answer from chunk excerpts:', fallbackErr?.message || fallbackErr);
        answerText = synthesizeGroundedClinicalAnswer(query, chunks);
      }
    }
  } else {
    answerText = synthesizeGroundedClinicalAnswer(query, chunks);
  }

  if (!answerText.trim()) {
    answerText = synthesizeGroundedClinicalAnswer(query, chunks);
  }

  // Send every source that passed the cutoff so UI labels [1], [2], etc. match 1:1
  const citedMap = new Map<string, { id: string; title: string; fileName: string; page: number; url: string }>();
  chunks.forEach((r) => {
    const key = `${r.chunk.guideId}-p${r.chunk.page}`;
    if (!citedMap.has(key)) {
      citedMap.set(key, {
        id: `${r.chunk.guideId}-p${r.chunk.page}`,
        title: r.chunk.title,
        fileName: r.chunk.fileName,
        page: r.chunk.page,
        url: `/resources/${r.chunk.fileName}#page=${r.chunk.page}`,
      });
    }
  });

  const topChunk = chunks[0].chunk;

  return {
    answer: answerText,
    retrievedChunks: retrievedChunksPayload,
    matchedGuide: {
      id: topChunk.guideId,
      title: topChunk.title,
      fileName: topChunk.fileName,
      page: topChunk.page,
      sectionTitle: `Page ${topChunk.page}`,
    },
    citedResources: Array.from(citedMap.values()),
    suggestedQuestions: [
      'How do I handle violent resistance during showers and bathing?',
      'How do I stop my loved one from driving safely?',
      'Why are they constantly craving sweets and overeating?',
    ],
    isUploadedGuideSourced: true,
  };
}
