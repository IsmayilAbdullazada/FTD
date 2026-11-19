import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeEmail } from '../src/services/emailTemplates.js';

test('email templates provide readable text, escaped HTML, a clear action and no remote tracking assets', () => {
  const url = 'https://example.test/register?token=fixture&source=email';
  const email = composeEmail({
    subject: 'You are invited to Care Partner Connect',
    greeting: 'Hello <img src=x onerror=alert(1)>,',
    paragraphs: ['Your invitation is valid for three days.'],
    action: { label: 'Create your account', url },
  });
  assert.match(email.text, /Hello/);
  assert.ok(email.text.includes(url));
  assert.match(email.text, /The Care Partner Connect team/);
  assert.ok(email.html.includes('Hello &lt;img'));
  assert.ok(!email.html.includes('<img'));
  assert.ok(email.html.includes('token=fixture&amp;source=email'));
  assert.ok(email.html.includes('Create your account'));
  assert.ok(!email.html.includes('<script'));
  assert.ok(!email.html.includes('fonts.googleapis'));
  assert.throws(() =>
    composeEmail({
      subject: 'Fixture',
      paragraphs: [],
      action: { label: 'Unsafe', url: 'javascript:alert(1)' },
    }),
  );
});
