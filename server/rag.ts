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
 * Embed single text snippet using Gemini Embeddings model
 */
export async function embedText(text: string, ai: GoogleGenAI): Promise<number[]> {
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: text,
  });
  const vector = res.embeddings?.[0]?.values || (res as any).embedding?.values;
  if (!vector || vector.length === 0) {
    throw new Error('Gemini embedding returned empty vector.');
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
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
  ai: GoogleGenAI
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
      try {
        const vector = await embedText(chunkText, ai);
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
      } catch (embedErr) {
        console.error(`Failed to embed chunk ${guide.fileName} p${page.pageNumber}:`, embedErr);
      }
    }
  }

  chunksStore.push(...newChunks);
  saveChunksToDisk();
  return newChunks;
}

/**
 * Retrieve: Embed query, rank by cosine similarity, take top 4-5, apply similarity cutoff.
 * Filters strictly by condition so an FTD user never gets Alzheimer's advice.
 */
export async function retrieveRelevantChunks(
  query: string,
  ai: GoogleGenAI,
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

  const queryVector = await embedText(query, ai);
  const ranked: RankedChunk[] = candidateChunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const bestScore = ranked[0]?.score || 0;
  const passesCutoff = bestScore >= SIMILARITY_CUTOFF;

  return { chunks: ranked, bestScore, passesCutoff };
}

/**
 * Answer: One prompt that includes chunks with numbered labels, tells model to answer only
 * from them, cite by number, and returns structured result with citation links.
 */
export async function answerRagQuery(
  query: string,
  conversationHistory: Array<{ role: string; content?: string; text?: string }> = [],
  ai: GoogleGenAI,
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

  // Retrieve top chunks using vector similarity filtered by condition
  const { chunks, bestScore, passesCutoff } = await retrieveRelevantChunks(query, ai, 5, conditionFilter);

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

  const systemInstruction = `You are Dr. Seema Gulyani's Clinical Assistant for the Johns Hopkins Frontotemporal Dementia (FTD) clinic, speaking directly with family care partners.

CRITICAL GROUNDING REQUIREMENTS:
1. Answer strictly and only from the provided numbered source excerpts below.
2. Cite sources inline using bracketed numbers like [1], [2] when providing clinical guidance.
3. If the provided excerpts do not directly contain information to address the scenario, state that our current clinical notes do not cover this topic and direct the care partner to contact the Johns Hopkins clinic at (410) 955-5147 (option 2).
4. Under NO circumstances recommend or discuss specific drug dosages.

STRUCTURE & VOICE:
- Speak warmly and empathetically in plain, everyday language suitable for stressed care partners.
- Format with clear sections:
  - Warm opening validation.
  - ### Understanding What Is Happening
  - ### Practical Steps (numbered steps with bold action titles and inline citations like [1])
  - ### What to Keep in Mind

VERIFIED CLINICAL SOURCES:
${contextSections}`;

  const prompt = recentHistory
    ? `Recent Conversation:\n${recentHistory}\n\nCurrent Inquiry:\n${query}`
    : query;

  let answerText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });
    answerText = (response.text || '').trim();
  } catch (err) {
    console.error('Gemini generation error in RAG answer:', err);
    // Deterministic fallback from top chunk text
    answerText = chunks[0].chunk.content;
  }

  // Map numbered citations back to guide and page
  const citedMap = new Map<string, { id: string; title: string; fileName: string; page: number; url: string }>();
  chunks.forEach((r, idx) => {
    const num = idx + 1;
    // Include if cited inline [num] or top 2 chunks
    if (answerText.includes(`[${num}]`) || idx < 2) {
      const key = `${r.chunk.guideId}-p${r.chunk.page}`;
      if (!citedMap.has(key)) {
        citedMap.set(key, {
          id: r.chunk.guideId,
          title: r.chunk.title,
          fileName: r.chunk.fileName,
          page: r.chunk.page,
          url: `/resources/${r.chunk.fileName}#page=${r.chunk.page}`,
        });
      }
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
