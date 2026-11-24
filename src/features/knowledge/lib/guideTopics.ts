/** Shared by guide filters and every guide authoring surface. Keys remain stable in PostgreSQL. */
export const GUIDE_TOPICS = [
  { key: 'GENERAL_EDUCATION', label: 'Understanding Dementia' },
  { key: 'BEHAVIORAL_AGITATION', label: 'Behavior and Personality' },
  { key: 'DAILY_CARE', label: 'Daily Living and Personal Hygiene' },
  { key: 'COMMUNICATION_PPA', label: 'Communication and Relationships' },
  { key: 'SAFETY_WANDERING', label: 'Safety and Driving' },
  { key: 'SLEEP', label: 'Sleep and Rest' },
  { key: 'NUTRITION_DIET', label: 'Eating and Nutrition' },
  { key: 'LEGAL_MEDICAID', label: 'Legal and Financial Planning' },
  { key: 'CARE_PARTNER_SUPPORT', label: 'Support and Wellbeing' },
  { key: 'GRIEF_LOSS', label: 'Grief and Loss' },
  { key: 'ADVANCED_DEMENTIA', label: 'Later-Stage Dementia and Hospice' },
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number]['key'];
const aliases: Record<string, GuideTopic> = {
  INCONTINENCE: 'DAILY_CARE',
  CAREGIVER_SUPPORT: 'CARE_PARTNER_SUPPORT',
  'DAILY CARE AND HYGIENE': 'DAILY_CARE',
  'DAILY CARE & ROUTINES': 'DAILY_CARE',
  'GENERAL DEMENTIA EDUCATION': 'GENERAL_EDUCATION',
  'BEHAVIOR AND AGITATION': 'BEHAVIORAL_AGITATION',
  'SAFETY AND WANDERING': 'SAFETY_WANDERING',
  'SPEECH AND COMMUNICATION': 'COMMUNICATION_PPA',
  'CARE PARTNER SUPPORT & WELLBEING': 'CARE_PARTNER_SUPPORT',
  'LEGAL AND FINANCIAL': 'LEGAL_MEDICAID',
};
export function normalizeGuideTopic(value?: string | null): GuideTopic | '' {
  const key = value?.trim().toUpperCase() ?? '';
  return (
    GUIDE_TOPICS.find(
      (topic) => topic.key === key || topic.label.toUpperCase() === key,
    )?.key ??
    aliases[key] ??
    ''
  );
}
export function guideTopicLabel(value?: string | null): string | undefined {
  return GUIDE_TOPICS.find((topic) => topic.key === normalizeGuideTopic(value))
    ?.label;
}
