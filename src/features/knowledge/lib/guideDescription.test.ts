import { expect, test } from 'vitest';
import {
  guideCardDescription,
  isGuideDescriptionValid,
  suggestGuideDescription,
} from './guideDescription';
test('PDF suggestions omit newsletter boilerplate, dates and repeated titles without changing the source', () => {
  const source =
    'a quarterly newsletter for healthcare professionals\nSummer 2012\nPartners in FTD Care\nDaily routines\nDaily routines\nOffer familiar choices and allow extra time. Read the full source for more information.';
  expect(suggestGuideDescription(source, 'Daily routines')).toBe(
    'Offer familiar choices and allow extra time. Read the full source for more information.',
  );
  expect(source).toContain('Partners in FTD Care');
  expect(
    guideCardDescription({
      description: '',
      content: source,
      title: 'Daily routines',
    }),
  ).not.toMatch(/newsletter|Partners|2012|Daily routines/);
});
test('long suggestions end at sentence or complete-word boundaries within 160 characters', () => {
  const sentence = 'Offer familiar choices and allow extra time.';
  expect(
    suggestGuideDescription(
      sentence +
        ' ' +
        'A longer discussion of predictable routines and familiar choices can help families locate useful information about everyday support, reliable resources and practical next steps. '.repeat(
          3,
        ),
    ),
  ).toBe(sentence);
  const words =
    'familiar choices predictable routines extra time and thoughtful support '.repeat(
      12,
    );
  const result = suggestGuideDescription(words);
  expect(result.length).toBeLessThanOrEqual(160);
  expect(result).toMatch(/ (?:…)$/);
  expect(words.startsWith(result.slice(0, -2) + ' ')).toBe(true);
  expect(
    suggestGuideDescription('A description with an incomple...'),
  ).not.toContain('incomple');
});
test('description length validation enforces trimmed 20–240 characters', () => {
  expect(isGuideDescriptionValid(' '.repeat(30))).toBe(false);
  expect(isGuideDescriptionValid('a'.repeat(19))).toBe(false);
  expect(isGuideDescriptionValid('a'.repeat(20))).toBe(true);
  expect(isGuideDescriptionValid('a'.repeat(240))).toBe(true);
  expect(isGuideDescriptionValid('a'.repeat(241))).toBe(false);
});
