import { expect, test } from 'vitest';
import { invitationToken } from './invitationToken';
test('invitation fields accept a code or full link without forwarding a URL as the token', () => {
  expect(invitationToken('  abc_DEF-123  ')).toBe('abc_DEF-123');
  expect(
    invitationToken(
      'https://care.example/register?token=abc_DEF-123&source=email',
    ),
  ).toBe('abc_DEF-123');
  expect(invitationToken('https://care.example/register')).toBe('');
  expect(invitationToken('javascript:alert(1)')).toBe('');
});
