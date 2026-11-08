export interface PhiAlert {
  type: "PHONE" | "EMAIL" | "LOCATION" | "MRN" | "PERSON";
  text: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
}

export function sanitizeUserContent(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\bon(?:error|load|click)\s*=/gi, "")
    .trim();
}

export function scanForPhi(text: string): PhiAlert[] {
  const alerts: PhiAlert[] = [];
  const patterns: Array<{
    type: PhiAlert["type"];
    regex: RegExp;
    explanation: string;
    capture?: number;
  }> = [
    {
      type: "PHONE",
      regex: /(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g,
      explanation: "Detected a direct phone number.",
    },
    {
      type: "EMAIL",
      regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      explanation: "Detected an email address.",
    },
    {
      type: "LOCATION",
      regex:
        /\b\d+\s+[A-Za-z0-9 .'-]+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct)\b/gi,
      explanation: "Detected a physical street address.",
    },
    {
      type: "MRN",
      regex: /\b(?:JHM-\d{4,6}-[A-Z0-9]+|MRN\s*#?\s*\d+)\b/gi,
      explanation: "Detected a clinical record identifier.",
    },
    {
      type: "PERSON",
      regex:
        /\b(?:my husband|my wife|my dad|my father|my mother|my mom|my brother|my sister)\s+([A-Z][a-z]+)\b/g,
      explanation: "Detected a family member's name.",
      capture: 1,
    },
    {
      type: "PERSON",
      regex: /\bnamed\s+([A-Z][a-z]+)\b/g,
      explanation: "Detected a person's name.",
      capture: 1,
    },
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const value = match[pattern.capture ?? 0];
      if (!value || match.index === undefined) continue;
      const offset = pattern.capture ? match[0].indexOf(value) : 0;
      const startIndex = match.index + offset;
      alerts.push({
        type: pattern.type,
        text: value,
        startIndex,
        endIndex: startIndex + value.length,
        explanation: pattern.explanation,
      });
    }
  }
  return alerts.sort((a, b) => a.startIndex - b.startIndex);
}

const urgentTerms = [
  "seroquel",
  "haldol",
  "haloperidol",
  "donepezil",
  "aricept",
  "memantine",
  "namenda",
  "trazodone",
  "dosage",
  "dose",
  "milligram",
  "prescribe",
];

export function isUrgentClinicalContent(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    urgentTerms.some((term) => normalized.includes(term)) ||
    /\b\d+(?:\.\d+)?\s*mg\b/i.test(text)
  );
}
