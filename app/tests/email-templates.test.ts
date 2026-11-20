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

test('emails blend into the client background and include dark-mode fallbacks', () => {
  const email = composeEmail({
    subject: 'Theme fixture',
    paragraphs: ['Readable body text.'],
    action: { label: 'Open', url: 'https://example.test/' },
  });
  assert.match(email.html, /<meta name="color-scheme" content="light dark">/);
  assert.ok(email.html.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(email.html.includes('[data-ogsc]'));
  assert.match(email.html, /<body[^>]+background-color:transparent/);
  assert.match(email.html, /<main[^>]+background-color:transparent/);
  assert.doesNotMatch(
    email.html,
    /<(?:body|main)[^>]+background(?:-color)?:#(?:fff|f8fafc)/i,
  );
  assert.doesNotMatch(email.html, /<p[^>]+background/i);
  assert.match(email.html, /background-color:#002d72;color:#ffffff/);
});
