import { expect, test } from 'vitest';
import {
  GUIDE_TOPICS,
  guideTopicLabel,
  normalizeGuideTopic,
} from './guideTopics';
test('legacy personal-care topics share one filter without classifying unknown guides', () => {
  expect(normalizeGuideTopic('INCONTINENCE')).toBe('DAILY_CARE');
  expect(normalizeGuideTopic('Daily Care and Hygiene')).toBe('DAILY_CARE');
  expect(normalizeGuideTopic('DAILY_CARE')).toBe('DAILY_CARE');
  for (const value of [null, '', 'GUIDE', 'Not a known topic'])
    expect(guideTopicLabel(value)).toBeUndefined();
  expect(new Set(GUIDE_TOPICS.map((topic) => topic.key)).size).toBe(
    GUIDE_TOPICS.length,
  );
  expect(new Set(GUIDE_TOPICS.map((topic) => topic.label)).size).toBe(
    GUIDE_TOPICS.length,
  );
});
