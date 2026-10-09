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

// Helper to translate complex clinical jargon into plain, everyday language
function simplifyMedicalJargon(text: string): string {
  return text
    .replace(/neurodegeneration damages the orbitofrontal cortex and anterior insula[—\- ]+the biological braking system for social conduct/gi, "frontotemporal dementia changes the brain's natural social filter—the built-in braking system that normally stops a thought before words come out")
    .replace(/orbitofrontal cortex and anterior insula/gi, "the brain's natural social filter")
    .replace(/orbitofrontal cortex/gi, "the brain's impulse control center")
    .replace(/atrophy in the anterior cingulate cortex and dorsolateral prefrontal circuits responsible for cognitive initiation/gi, "changes in the brain circuits responsible for starting activities—like an internal starter switch that no longer turns on automatically")
    .replace(/anterior cingulate cortex and dorsolateral prefrontal circuits/gi, "the brain's internal starter switch")
    .replace(/striatal-frontal circuit disruption/gi, "changes in the brain circuits that regulate restlessness and physical movement")
    .replace(/atrophy in the hypothalamus and insular cortex that regulate satiety and taste perception/gi, "changes in the brain areas that signal fullness and taste")
    .replace(/progressive dysphagia \(impaired swallowing coordination\)/gi, "trouble chewing and swallowing food safely")
    .replace(/progressive dysphagia/gi, "difficulty swallowing safely")
    .replace(/dysphagia/gi, "difficulty swallowing")
    .replace(/food bolting \(rapidly shoveling large quantities without chewing\)/gi, "eating or shoveling food very quickly without chewing")
    .replace(/food bolting/gi, "eating too quickly")
    .replace(/anosognosia/gi, "a loss of brain awareness (they genuinely believe nothing is wrong with them)")
    .replace(/motor stereotypies/gi, "repetitive motions like pacing, tapping, or clapping")
    .replace(/stereotypies/gi, "repetitive behaviors")
    .replace(/interoceptive awareness \(inability to perceive body cues\)/gi, "the brain's ability to sense normal body cues (like a full bladder)")
    .replace(/interoceptive awareness/gi, "awareness of body signals")
    .replace(/amygdala threat alarms/gi, "the brain's automatic fight-or-flight fear alarm")
    .replace(/amygdala/gi, "the brain's fear and stress response")
    .replace(/tactile defensiveness/gi, "sensitivity or fear when being touched")
    .replace(/sensory bombardment/gi, "feeling overwhelmed by sounds, temperatures, and touch")
    .replace(/hyperorality/gi, "a strong urge to put food or objects in the mouth")
    .replace(/pathological inertia/gi, "difficulty getting started with any activity")
    .replace(/abulia/gi, "loss of ability to start tasks")
    .replace(/interpersonal disinhibition/gi, "speaking or acting without a social filter")
    .replace(/disinhibition/gi, "loss of impulse control")
    .replace(/videofluoroscopy/gi, "a medical swallowing assessment");
}

export function formatDoctorAnswer(faq: ClinicalFaqItem): string {
  const rawAnswer = faq.physicianAnswer.trim();

  // Separate the explanation paragraph from the protocol steps
  const protocolHeaderRegex = /\n\s*(?:[A-Z][a-zA-Z\s'’]+(?:Protocol|Strategy|Strategies|Guidelines|Checklist|Management)):?\s*\n/i;
  
  let explanation = '';
  let stepsText = '';

  const match = rawAnswer.match(protocolHeaderRegex);
  if (match && match.index !== undefined) {
    explanation = rawAnswer.slice(0, match.index).trim();
    stepsText = rawAnswer.slice(match.index + match[0].length).trim();
  } else {
    const numMatch = rawAnswer.match(/\n(?:\d+\.|\([0-9]\))\s+/);
    if (numMatch && numMatch.index !== undefined) {
      explanation = rawAnswer.slice(0, numMatch.index).trim();
      stepsText = rawAnswer.slice(numMatch.index).trim();
    } else {
      explanation = rawAnswer;
    }
  }

  // Simplify jargon in the explanation
  explanation = simplifyMedicalJargon(explanation);

  // Clean and format steps with bold action titles
  let formattedSteps = '';
  if (stepsText) {
    const stepLines = stepsText.split(/\n(?=\d+\.\s+)/);
    const cleanedSteps = stepLines.map((step) => {
      let s = simplifyMedicalJargon(step.trim());
      s = s.replace(/^(\d+\.)\s*["“]?([^:：\n]+?)["”]?\s*[:：]\s*(.+)$/s, '$1 **$2**: $3');
      return s;
    });
    formattedSteps = cleanedSteps.join('\n\n');
  }

  let answer = `### Understanding What Is Happening\n${explanation}`;

  if (formattedSteps) {
    answer += `\n\n### Practical Steps You Can Try\n${formattedSteps}`;
  }

  if (faq.keyProtocols && faq.keyProtocols.length > 0) {
    const reminders = faq.keyProtocols
      .map((p) => `• ${simplifyMedicalJargon(p)}`)
      .join('\n');
    answer += `\n\n### What to Keep in Mind\n${reminders}`;
  }

  return answer;
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

  const answer = formatDoctorAnswer(bestMatch);

  return {
    answer,
    citedResources,
    matchedFaq: bestMatch,
    suggestedQuestions: otherQuestions,
  };
}
