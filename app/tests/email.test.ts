import { transaction } from '../src/config/db.js';
import { notify } from '../src/services/notifications.js';
import { processNotificationEmails } from '../src/services/notificationEmails.js';
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
    const userId = email.split('@')[0];
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role,first_name,last_name,anonymous_handle,badge_label) VALUES($1,$2,'disabled','CARE_PARTNER','Fixture','Reader',$1,'Fixture')",
      [userId, email],
    );
    await transaction((client) =>
      notify(client, {
        kind: 'WELCOME',
        recipients: [userId],
        eventKey: `smtp-fixture:${userId}`,
      }),
    );
    const notice = (
      await pool.query(
        'SELECT id FROM notifications WHERE recipient_user_id=$1',
        [userId],
      )
    ).rows[0];
    assert.equal(
      (await processNotificationEmails({ notificationIds: [notice.id] })).sent,
      1,
    );
    assert.equal(relay.messages.length, 3);
    assert.ok(
      relay.messages.every((message) =>
        message.includes('From: Care Partner Test <no-reply@example.test>'),
      ),
    );
    assert.equal(
      relay.commands.filter((command) => command === 'STARTTLS').length,
      3,
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
    await pool.query('DELETE FROM users WHERE id=$1', [email.split('@')[0]]);
    await pool.end();
  }
});
