export const CLINIC = "(410) 955-5147 (option 2)";
export const SUPPORT = "(410) 502-4163";
export const MEDICATION_WORDS = [
  "seroquel",
  "quetiapine",
  "haloperidol",
  "haldol",
  "donepezil",
  "aricept",
  "memantine",
  "namenda",
  "trazodone",
  "risperidone",
  "olanzapine",
  "zyprexa",
  "lorazepam",
  "ativan",
  "clonazepam",
  "klonopin",
  "xanax",
  "alprazolam",
  "dose",
  "dosage",
  "milligrams",
  "prescribe",
];
export const REMEDY_WORDS = [
  "ivermectin",
  "coconut oil",
  "lion mane",
  "turmeric",
  "hydroxychloroquine",
  "cure",
];
export const MEDICATION_REPLY = `Prescription medications and drug dosages must be evaluated directly by your clinic medical team. Please reach out through the clinic direct line at ${CLINIC} or the care partner support line at ${SUPPORT}. For emergencies, call 911.`;
export const REMEDY_REPLY = `I cannot provide guidance on unverified or speculative remedies. Dr. Seema’s repository only includes scientifically verified clinical protocols approved for Johns Hopkins FTD families. Please discuss any dietary supplements directly with your clinical neurology team at ${CLINIC}.`;
export const NO_GUIDE = `I'm sorry, we have no approved guide yet for this question. Please contact the clinic direct line at ${CLINIC} or the care partner support line at ${SUPPORT}. For emergencies, call 911.`;
export function safetyReply(question: string) {
  const text = question.toLowerCase();
  if (MEDICATION_WORDS.some((w) => text.includes(w)))
    return { answer: MEDICATION_REPLY, isMedicationRefusal: true };
  if (REMEDY_WORDS.some((w) => text.includes(w)))
    return { answer: REMEDY_REPLY, isMedicationRefusal: false };
  if (
    /\b(emergency|suicid\w*|unconscious|not breathing|chest pain|immediate danger)\b/.test(
      text,
    )
  )
    return {
      answer: `For life-threatening emergencies, call 911. For clinical triage, contact the clinic at ${CLINIC} or support at ${SUPPORT}.`,
    };
  return null;
}

// The discussion moderation path historically also recognized these short forms.
export const DISCUSSION_MEDICATION_WORDS = [
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
  "mg",
  "prescribe",
];
