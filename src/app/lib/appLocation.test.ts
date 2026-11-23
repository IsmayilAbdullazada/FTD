import { afterEach, expect, test } from 'vitest';
import { permittedTab, pushTabLocation, readAppLocation } from './appLocation';
afterEach(() => window.history.replaceState(null, '', '/'));
test('unknown tabs and staff-only tabs resolve to a safe care-partner screen', () => {
  expect(permittedTab('unknown', 'CARE_PARTNER')).toBe('feed');
  expect(permittedTab('moderation', 'CARE_PARTNER')).toBe('feed');
  expect(permittedTab('audit', 'CARE_PARTNER')).toBe('feed');
  expect(permittedTab('moderation', 'CLINICIAN_MODERATOR')).toBe('moderation');
});
test('resource navigation round-trips a URL and clears the target on ordinary navigation', () => {
  pushTabLocation('knowledge', null, undefined, 'resource/123');
  expect(readAppLocation().resourceId).toBe('resource/123');
  pushTabLocation('feed');
  expect(readAppLocation().resourceId).toBeNull();
});

test('admin navigation requires both the admin role and enabled capability', () => {
  expect(permittedTab('admin', 'CARE_PARTNER', true)).toBe('feed');
  expect(permittedTab('admin', 'CLINICIAN_MODERATOR', true)).toBe('feed');
  expect(permittedTab('admin', 'SYSTEM_ADMIN', false)).toBe('feed');
  expect(permittedTab('admin', 'SYSTEM_ADMIN', true)).toBe('admin');
});
