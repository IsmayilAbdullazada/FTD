import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import tls from 'node:tls';
import { createTestRelay } from './helpers/smtpRelay.js';
import { sendEmail } from '../src/services/email.js';
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';

test('SMTP delivers invitations and recovery with only HOST, PORT and FROM over STARTTLS', async () => {
  const relay = await createTestRelay();
  const authorities = tls.getCACertificates('default');
  const original = {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_FROM: env.SMTP_FROM,
  };
  const email = randomUUID() + '@example.test';
  try {
    tls.setDefaultCACertificates([...authorities, relay.cert]);
    Object.assign(env, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: relay.port,
      SMTP_FROM: 'Care Partner Test <no-reply@example.test>',
    });
    for (const subject of ['Your invitation', 'Reset your password']) {
      const result = await sendEmail({
        to: email,
        subject,
        text: 'Local SMTP delivery fixture.',
        html: '<p>Local SMTP delivery fixture.</p>',
      });
      assert.equal(result.emailSent, true, result.emailError);
    }
    assert.equal(relay.messages.length, 2);
    assert.ok(
      relay.messages.every((message) =>
        message.includes('From: Care Partner Test <no-reply@example.test>'),
      ),
    );
    assert.equal(
      relay.commands.filter((command) => command === 'STARTTLS').length,
      2,
    );
    assert.equal(relay.commands.includes('AUTH'), false);
    const outbox = await pool.query(
      'SELECT delivery_status,text_body,html_body FROM email_outbox WHERE recipient=$1',
      [email],
    );
    assert.ok(
      outbox.rows.every(
        (row) =>
          row.delivery_status === 'SENT' &&
          row.text_body === '[Content not retained]' &&
          row.html_body === '[Content not retained]',
      ),
    );
    env.SMTP_HOST = undefined;
    const missing = await sendEmail({
      to: email,
      subject: 'Unconfigured relay',
      text: 'Fixture',
      html: '<p>Fixture</p>',
    });
    assert.equal(missing.emailSent, false);
    assert.equal(missing.emailError, 'SMTP_HOST is not configured');
    const failed = await pool.query(
      "SELECT delivery_status FROM email_outbox WHERE recipient=$1 AND subject='Unconfigured relay'",
      [email],
    );
    assert.equal(failed.rows[0].delivery_status, 'FAILED');
  } finally {
    tls.setDefaultCACertificates(authorities);
    Object.assign(env, original);
    await relay.close();
    await pool.query('DELETE FROM email_outbox WHERE recipient=$1', [email]);
    await pool.end();
  }
});
