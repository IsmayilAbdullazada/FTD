import { CLINICAL_50_FAQ, type ClinicalFaqItem } from './clinicalRagFaq.ts';
export { CLINICAL_50_FAQ, type ClinicalFaqItem };

export interface RagSearchResult {
  item: ClinicalFaqItem;
  score: number;
}

export interface RagResponse {
  answer: string;
  isMedicationRefusal?: boolean;
  citedResources?: { id: string; title: string; url?: string }[];
  matchedFaq?: ClinicalFaqItem;
  suggestedQuestions: string[];
}

// Synonyms and clinical vocabulary mapping
const SYNONYM_MAP: Record<string, string[]> = {
  bath: ['shower', 'wash', 'water', 'hygiene', 'sponge', 'soap', 'clean'],
  shower: ['bath', 'wash', 'water', 'hygiene', 'towel'],
  drive: ['driving', 'car', 'keys', 'vehicle', 'license', 'dmv', 'traffic', 'speeding'],
  eat: ['food', 'eating', 'sweet', 'sweets', 'candy', 'choking', 'swallow', 'swallowing', 'sugar', 'hunger', 'hyperorality', 'bolus'],
  sugar: ['sweet', 'sweets', 'candy', 'cookies', 'hyperorality', 'binge', 'cake'],
  toilet: ['incontinence', 'bathroom', 'pee', 'urine', 'poop', 'bowel', 'bladder', 'wet', 'briefs', 'diapers', 'underwear', 'uti'],
  incontinence: ['toilet', 'bathroom', 'pee', 'urine', 'poop', 'bowel', 'bladder', 'wet', 'briefs', 'diapers'],
  anger: ['agitation', 'yelling', 'screaming', 'meltdown', 'rage', 'fighting', 'hit', 'hitting', 'violent', 'outburst'],
  hit: ['hitting', 'violence', 'violent', 'fighting', 'strike', 'striking', 'aggression', 'lashing'],
  rude: ['blunt', 'offensive', 'filter', 'disinhibition', 'embarrassing', 'inappropriate', 'insulting', 'stranger'],
  wander: ['wandering', 'escape', 'elopement', 'lost', 'door', 'street', 'walk', 'walking', 'pacing', 'gps', 'shoes'],
  walk: ['walking', 'pacing', 'wander', 'wandering', 'laps', 'restless'],
  sleep: ['night', 'sundowning', 'insomnia', 'awake', 'bed', 'evening', 'wandering', 'dark'],
  money: ['finances', 'scam', 'scams', 'bank', 'spending', 'credit', 'savings', 'wire', 'telemarketer', 'checks'],
  legal: ['lawyer', 'attorney', 'poa', 'power of attorney', 'guardianship', 'directive', 'will', 'medicaid'],
  medicaid: ['nursing home', 'memory care', 'facility', 'lookback', 'spousal', 'waiver', 'afford', 'costs'],
  aphasia: ['ppa', 'speech', 'talk', 'talking', 'words', 'vocabulary', 'language', 'nonverbal'],
  denial: ['anosognosia', 'insight', 'not sick', 'doctor lying', 'unaware', 'refuses diagnosis'],
  memory: ['forget', 'forgetting', 'dementia', 'alzheimers', 'ftd', 'bvftd', 'brain'],
  hospital: ['er', 'emergency room', 'doctor', 'clinic', 'sedatives', 'haldol'],
  die: ['death', 'dying', 'hospice', 'palliative', 'terminal', 'end of life'],
  hospice: ['palliative', 'comfort', 'terminal', 'end of life', 'moribund'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function expandTokens(tokens: string[]): string[] {
  const set = new Set<string>(tokens);
  for (const token of tokens) {
    for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
      if (token === key || syns.includes(token)) {
        set.add(key);
        syns.forEach((s) => set.add(s));
      }
    }
  }
  return Array.from(set);
}

export function searchClinicalFaq(query: string, topK: number = 3): RagSearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const expandedQuery = expandTokens(queryTokens);
  const queryLower = query.toLowerCase();

  const scored: RagSearchResult[] = CLINICAL_50_FAQ.map((faq) => {
    let score = 0;

    // Direct match against main question
    const qLower = faq.question.toLowerCase();
    if (qLower.includes(queryLower)) {
      score += 50;
    }

    // Direct match against alternate queries
    for (const alt of faq.alternateQueries) {
      const altLower = alt.toLowerCase();
      if (altLower.includes(queryLower) || queryLower.includes(altLower)) {
        score += 40;
      }
    }

    // Token match on question & alternate queries
    const questionTokens = tokenize(faq.question);
    for (const token of queryTokens) {
      if (questionTokens.includes(token)) score += 10;
    }

    // Alternate queries token match
    for (const alt of faq.alternateQueries) {
      const altTokens = tokenize(alt);
      for (const token of queryTokens) {
        if (altTokens.includes(token)) score += 5;
      }
    }

    // Keyword match (high weight)
    for (const kw of faq.keywords) {
      if (queryLower.includes(kw)) score += 8;
      if (expandedQuery.includes(kw)) score += 4;
    }

    // Category match
    if (queryLower.includes(faq.category.toLowerCase().replace('_', ' '))) {
      score += 15;
    }

    // Body content match
    const bodyLower = faq.physicianAnswer.toLowerCase();
    for (const token of queryTokens) {
      if (bodyLower.includes(token)) score += 1.5;
    }
    for (const token of expandedQuery) {
      if (bodyLower.includes(token)) score += 0.5;
    }

    return { item: faq, score };
  });

  return scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function generateLocalRagResponse(query: string): RagResponse {
  const queryLower = query.toLowerCase().trim();

  // Safety gate 1: Prescriptions / dosages
  const restrictedDrugs = [
    'seroquel', 'quetiapine', 'haloperidol', 'haldol', 'donepezil', 'aricept',
    'memantine', 'namenda', 'trazodone', 'risperidone', 'olanzapine', 'zyprexa',
    'lorazepam', 'ativan', 'clonazepam', 'klonopin', 'xanax', 'alprazolam',
    'dose', 'dosage', 'milligrams', 'prescribe', 'prescriptions',
  ];

  if (restrictedDrugs.some((d) => queryLower.includes(d))) {
    return {
      answer: `Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the clinic direct line at (410) 955-5147 (option 2) or the care partner support line at (410) 502-4163. For life-threatening emergencies, call 911.`,
      isMedicationRefusal: true,
      citedResources: [],
      suggestedQuestions: [
        'How do I administer medicine safely when they spit pills out?',
        'What should I tell Emergency Room doctors about sedatives?',
        'How do I handle sudden acute agitation without sedatives?'
      ]
    };
  }

  // Safety gate 2: Unverified remedies
  const unverified = ['ivermectin', 'coconut oil', 'lion mane', 'turmeric', 'hydroxychloroquine', 'cure'];
  if (unverified.some((u) => queryLower.includes(u))) {
    return {
      answer: `I cannot provide guidance on speculative or unverified remedies. Dr. Seema’s repository only includes scientifically verified clinical protocols approved for Johns Hopkins FTD families. Please discuss any dietary supplements directly with your clinical neurology team at (410) 955-5147 (option 2).`,
      isMedicationRefusal: false,
      citedResources: [],
      suggestedQuestions: [
        'Why does my loved one crave sweets and carbohydrates?',
        'How do I manage rapid weight loss or gain?',
        'What are proven non-drug de-escalation techniques?'
      ]
    };
  }

  // Search 50 FAQs
  const searchResults = searchClinicalFaq(query, 3);
  const bestMatch = searchResults[0]?.item || CLINICAL_50_FAQ[0];

  // Pick 3 related questions from different FAQs
  const otherQuestions = CLINICAL_50_FAQ
    .filter((f) => f.id !== bestMatch.id && (f.category === bestMatch.category || Math.random() > 0.5))
    .slice(0, 3)
    .map((f) => f.question);

  const citedResources: { id: string; title: string; url?: string }[] = [];
  if (bestMatch.relatedGuideId && bestMatch.relatedGuideTitle) {
    citedResources.push({
      id: bestMatch.relatedGuideId,
      title: bestMatch.relatedGuideTitle,
    });
  }

  const answer = `Dr. Seema Gulyani’s Clinical Protocol for: "${bestMatch.question}"\n\n${bestMatch.physicianAnswer}\n\nKey Takeaways:\n${bestMatch.keyProtocols.map((p) => `• ${p}`).join('\n')}\n\nFor clinic coordination, contact the Johns Hopkins Clinic Direct Line at (410) 955-5147 (option 2) or Support Line at (410) 502-4163. For life-threatening emergencies, call 911.`;

  return {
    answer,
    citedResources,
    matchedFaq: bestMatch,
    suggestedQuestions: otherQuestions,
  };
}
