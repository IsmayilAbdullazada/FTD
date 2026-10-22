import type { ChatbotGuideFile } from '../types/index.ts';

export interface GuideChunk {
  guideId: string;
  guideTitle: string;
  fileName: string;
  sectionTitle: string;
  category: string;
  content: string;
}


/**
 * Parses approved and active clinical guides into discrete searchable chunks based on markdown headings.
 */
export function parseGuideChunks(guides: ChatbotGuideFile[]): GuideChunk[] {
  const chunks: GuideChunk[] = [];

  for (const guide of guides) {
    // Only active and approved guides are ever parsed into chunks
    if (!guide.isActive || (guide.status && guide.status !== 'APPROVED')) continue;

    const content = guide.content;
    const headingRegex = /^#{1,3}\s+(.+)$/gm;
    const sections: { title: string; startIndex: number }[] = [];
    let m: RegExpExecArray | null;

    while ((m = headingRegex.exec(content)) !== null) {
      sections.push({ title: m[1].trim(), startIndex: m.index });
    }

    if (sections.length === 0) {
      const paras = content.split(/\n\s*\n/).filter((p) => p.trim().length > 30);
      if (paras.length <= 1) {
        chunks.push({
          guideId: guide.id,
          guideTitle: guide.title,
          fileName: guide.fileName,
          sectionTitle: guide.title,
          category: guide.category,
          content: content.trim(),
        });
      } else {
        paras.forEach((p, idx) => {
          chunks.push({
            guideId: guide.id,
            guideTitle: guide.title,
            fileName: guide.fileName,
            sectionTitle: `${guide.title} (Part ${idx + 1})`,
            category: guide.category,
            content: p.trim(),
          });
        });
      }
    } else {
      if (sections[0].startIndex > 60) {
        const preamble = content.slice(0, sections[0].startIndex).trim();
        const preambleBody = preamble.replace(/^#+[^\n]+\n*/g, '').trim();
        if (preambleBody.length > 50) {
          chunks.push({
            guideId: guide.id,
            guideTitle: guide.title,
            fileName: guide.fileName,
            sectionTitle: `${guide.title} - Overview`,
            category: guide.category,
            content: preamble,
          });
        }
      }

      for (let i = 0; i < sections.length; i++) {
        const cur = sections[i];
        const nextStart = i + 1 < sections.length ? sections[i + 1].startIndex : content.length;
        const body = content.slice(cur.startIndex, nextStart).trim();
        const bodyWithoutHeading = body.replace(/^#+[^\n]+\n*/, '').trim();
        if (bodyWithoutHeading.length < 40) {
          continue;
        }
        chunks.push({
          guideId: guide.id,
          guideTitle: guide.title,
          fileName: guide.fileName,
          sectionTitle: cur.title,
          category: guide.category,
          content: body,
        });
      }
    }
  }

  return chunks;
}

const GUIDE_SEARCH_STOP_WORDS = new Set([
  'what', 'is', 'the', 'best', 'way', 'to', 'my', 'in', 'on', 'at', 'by', 'for', 'with', 'a', 'an', 'and', 'or', 'do',
  'how', 'can', 'i', 'we', 'you', 'they', 'them', 'of', 'this', 'that', 'these', 'those', 'be', 'are', 'was', 'were',
  'been', 'being', 'have', 'has', 'had', 'it', 'its', 'so', 'as', 'if', 'about', 'from', 'help', 'need', 'please',
  'tell', 'me', 'our', 'your', 'his', 'her', 'their', 'there', 'here', 'when', 'where', 'why', 'who', 'does', 'did',
]);

const SYNONYMS: Record<string, string[]> = {
  shower: ['bath', 'wash', 'hygiene', 'water', 'sponge', 'soap', 'towel', 'wand', 'clean', 'refusal', 'bathing', 'combative'],
  bath: ['shower', 'wash', 'hygiene', 'water', 'sponge', 'soap', 'clean', 'towel', 'refusal', 'bathing', 'combative'],
  sweet: ['sweets', 'candy', 'eating', 'food', 'sugar', 'binge', 'cravings', 'pastries', 'ice cream', 'cookies', 'hyperorality', 'carbohydrate'],
  eat: ['eating', 'sweet', 'food', 'choking', 'bolting', 'cravings', 'chewing', 'swallow', 'carbohydrate', 'appetite', 'plate', 'hunger', 'hyperorality'],
  sugar: ['sweet', 'sweets', 'candy', 'cookies', 'hyperorality', 'binge', 'pastry', 'carbohydrate', 'craving'],
  drive: ['car', 'driving', 'license', 'keys', 'vehicle', 'mva', 'dmv', 'ignition', 'battery', 'transportation', 'driving retirement'],
  wander: ['night', 'pacing', 'walk', 'walking', 'sensor', 'door', 'lost', 'elopement', 'chime', 'hallway', 'roaming'],
  roam: ['wander', 'wandering', 'pacing', 'walk', 'walking', 'lost', 'elopement', 'door', 'chime', 'hallway'],
  sleep: ['night', 'pacing', 'insomnia', 'awake', 'circadian', 'hallway', 'wakefulness', 'sundowning', 'nocturnal', 'nap', 'restless', 'bedroom', 'drowsy'],
  yell: ['agitation', 'outburst', 'aggression', 'sponge', 'hit', 'anger', 'screaming', 'violence', 'fighting', 'lashing', 'scream'],
  rude: ['blunt', 'filter', 'public', 'cards', 'disinhibition', 'stranger', 'embarrassing', 'inappropriate', 'impulsive', 'insulting', 'tactless'],
  toilet: ['incontinence', 'voiding', 'briefs', 'diapers', 'bathroom', 'urinary', 'urine', 'accidents', 'soiling', 'bowel', 'bladder', 'commode', 'wetting', 'leak'],
  incontinence: ['toilet', 'voiding', 'briefs', 'diapers', 'bathroom', 'urinary', 'urine', 'accidents', 'soiling', 'bowel', 'bladder', 'commode', 'wetting', 'leak'],
  aphasia: ['ppa', 'speech', 'words', 'talking', 'language', 'nonverbal', 'articulation', 'communication'],
  legal: ['lawyer', 'poa', 'power of attorney', 'directive', 'guardianship', 'will', 'medicaid', 'attorney', 'advance care'],
  pill: ['medication', 'medicine', 'swallow', 'spit', 'dose', 'crush', 'refuse'],
  agitation: ['aggression', 'aggressive', 'anger', 'hit', 'scream', 'violence', 'combative', 'yell', 'fighting', 'outburst', 'threat', 'defensive', 'rage'],
  aggression: ['aggressive', 'agitation', 'anger', 'hit', 'scream', 'violence', 'combative', 'yell', 'fighting', 'outburst', 'threat', 'punch', 'lash', 'defensive'],
  apathy: ['apathetic', 'unmotivated', 'motivation', 'initiation', 'initiate', 'sit', 'couch', 'indifference', 'lazy', 'spark', 'passivity', 'withdrawn', 'flat'],
  insight: ['anosognosia', 'unaware', 'denial', 'refuse', 'refusal', 'resist', 'normal', 'fine', 'unawareness', 'diagnosis', 'accept'],
  anosognosia: ['insight', 'unaware', 'denial', 'refuse', 'refusal', 'resist', 'normal', 'fine', 'unawareness', 'diagnosis', 'accept'],
  resist: ['resistant', 'resistance', 'refuse', 'refusal', 'oppositional', 'fight', 'struggle', 'defiance', 'force', 'combat', 'stubborn', 'cooperate'],
  resistant: ['resist', 'resistance', 'refuse', 'refusal', 'oppositional', 'fight', 'struggle', 'defiance', 'force', 'combat', 'stubborn', 'cooperate'],
  empathy: ['unfeeling', 'cold', 'insensitive', 'blunted', 'flat', 'warmth', 'indifferent', 'blank', 'connection', 'grief', 'emotion', 'crying', 'sympathy', 'affection'],
  hospice: ['palliative', 'comfort', 'terminal', 'advanced', 'dying', 'end of life', 'swallowing', 'dysphagia', 'tube', 'dnr', 'feeding', 'aspiration'],
  sex: ['sexual', 'hypersexual', 'intimacy', 'touching', 'undress', 'inappropriate', 'disinhibited', 'remarks', 'masturbation', 'nudity', 'naked', 'public'],
  sexual: ['sex', 'hypersexual', 'intimacy', 'touching', 'undress', 'inappropriate', 'disinhibited', 'remarks', 'masturbation', 'nudity', 'naked', 'public'],
  compulsive: ['compulsion', 'ritual', 'rituals', 'repetition', 'repetitive', 'hoarding', 'pacing', 'counting', 'collecting', 'fixation', 'habits', 'stereotypy'],
  compulsion: ['compulsive', 'ritual', 'rituals', 'repetition', 'repetitive', 'hoarding', 'pacing', 'counting', 'collecting', 'fixation', 'habits', 'stereotypy'],
};

export function searchGuideChunks(
  query: string,
  chunks: GuideChunk[],
  topK: number = 3
): { chunk: GuideChunk; score: number }[] {
  const queryLower = query.toLowerCase();
  const rawWords = queryLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const tokens = rawWords.filter((w) => w.length >= 3 && !GUIDE_SEARCH_STOP_WORDS.has(w));

  const scored = chunks.map((chunk) => {
    let score = 0;
    const titleLower = chunk.sectionTitle.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const guideTitleLower = chunk.guideTitle.toLowerCase();
    const titleWords = new Set(titleLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3));
    const contentWords = new Set(contentLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3));

    // Multi-word exact phrase match
    if (tokens.length >= 2 && queryLower.length >= 6) {
      if (contentLower.includes(queryLower)) score += 40;
      if (titleLower.includes(queryLower)) score += 30;
      if (guideTitleLower.includes(queryLower)) score += 25;
    }

    // Direct token matches using word set
    for (const token of tokens) {
      if (titleWords.has(token)) score += 15;
      if (guideTitleLower.includes(token)) score += 12;
      if (contentWords.has(token)) score += 5;

      // Synonym expansion
      const synList = SYNONYMS[token];
      if (synList) {
        for (const s of synList) {
          if (titleWords.has(s)) score += 12;
          if (guideTitleLower.includes(s)) score += 8;
          if (contentWords.has(s)) score += 4;
        }
      }
    }

    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}


