import assert from 'node:assert/strict';
import { after, test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import nodemailer from 'nodemailer';
import { pool, transaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import {
  notify,
  notifyAdmins,
  notifyModerators,
} from '../src/services/notifications.js';
import {
  activities,
  type ActivityKind,
} from '../src/services/activityDefinitions.js';
import {
  notifyStaffSecurity,
  recordFailedSignIn,
} from '../src/services/accountSecurity.js';
import { processNotificationEmails } from '../src/services/notificationEmails.js';
after(() => pool.end());
test('review and system recipients are disjoint and all notifications queue one email', async () => {
  const suffix = randomUUID();
  await transaction(async (client) => {
    await notifyModerators(client, {
      kind: 'GUIDE_REVIEW_REQUIRED',
      eventKey: 'review-' + suffix,
    });
    for (const kind of Object.keys(activities).filter((kind) =>
      kind.startsWith('ADMIN_'),
    ) as ActivityKind[])
      await notifyAdmins(client, { kind, eventKey: kind + suffix });
    // Even an incorrectly supplied recipient cannot receive an admin-only kind.
    await notify(client, {
      kind: 'ADMIN_ACCOUNT_SECURITY',
      recipients: ['user-care-1', 'user-clinician-1'],
      eventKey: 'incorrect-' + suffix,
    });
  });
  const rows = await pool.query(
    'SELECT n.type,u.role,n.kind,j.notification_id FROM notifications n JOIN users u ON u.id=n.recipient_user_id LEFT JOIN notification_email_jobs j ON j.notification_id=n.id WHERE n.event_key LIKE $1',
    ['%' + suffix],
  );
  assert.ok(rows.rowCount! > 0);
  for (const row of rows.rows) {
    assert.equal(
      row.role,
      row.type === 'SYSTEM' ? 'SYSTEM_ADMIN' : 'CLINICIAN_MODERATOR',
    );
    assert.ok(row.notification_id);
  }
  assert.equal(
    (
      await pool.query('SELECT 1 FROM notifications WHERE event_key=$1', [
        'incorrect-' + suffix,
      ])
    ).rowCount,
    0,
  );
  await transaction(async (client) => {
    await notifyStaffSecurity(
      client,
      'user-clinician-1',
      'PASSWORD_CHANGED',
      'staff-security-' + suffix,
    );
    await notifyStaffSecurity(
      client,
      'user-care-1',
      'PASSWORD_CHANGED',
      'care-security-' + suffix,
    );
  });
  assert.ok(
    (
      await pool.query('SELECT 1 FROM notifications WHERE event_key=$1', [
        'staff-security-' + suffix,
      ])
    ).rowCount,
  );
  assert.equal(
    (
      await pool.query('SELECT 1 FROM notifications WHERE event_key=$1', [
        'care-security-' + suffix,
      ])
    ).rowCount,
    0,
  );
  for (let i = 0; i < 5; i++)
    await recordFailedSignIn('failed-' + suffix, {
      id: 'user-clinician-1',
      role: 'CLINICIAN_MODERATOR',
    });
  assert.ok(
    (
      await pool.query(
        "SELECT 1 FROM notifications WHERE kind='ADMIN_ACCOUNT_SECURITY' AND context->>'action'='REPEATED_FAILED_LOGINS'",
      )
    ).rowCount,
  );
  await pool.query('DELETE FROM notifications WHERE event_key LIKE $1', [
    '%' + suffix,
  ]);
});
test('permanent email failure alerts admins once without recursive failure alerts', async () => {
  const key = 'permanent-' + randomUUID();
  await transaction((client) =>
    notify(client, {
      kind: 'PASSWORD_CHANGED',
      recipients: ['user-care-1'],
      eventKey: key,
    }),
  );
  const id = (
    await pool.query('SELECT id FROM notifications WHERE event_key=$1', [key])
  ).rows[0].id;
  await pool.query(
    'UPDATE notification_email_jobs SET attempts=4 WHERE notification_id=$1',
    [id],
  );
  const host = env.SMTP_HOST;
  env.SMTP_HOST = 'local-fixture';
  const transport = mock.method(
    nodemailer,
    'createTransport',
    () =>
      ({
        sendMail: async () => {
          throw new Error('Fixture permanent failure');
        },
      }) as unknown as ReturnType<typeof nodemailer.createTransport>,
  );
  try {
    await processNotificationEmails({ notificationIds: [id] });
    const alerts = await pool.query(
      'SELECT n.id,u.role FROM notifications n JOIN users u ON u.id=n.recipient_user_id WHERE n.event_key=$1',
      ['email-job-failed:' + id],
    );
    assert.ok(alerts.rowCount! > 0);
    assert.ok(alerts.rows.every((row) => row.role === 'SYSTEM_ADMIN'));
    await processNotificationEmails({ notificationIds: [id] });
    assert.equal(
      (
        await pool.query(
          'SELECT COUNT(*)::int count FROM notifications WHERE event_key=$1',
          ['email-job-failed:' + id],
        )
      ).rows[0].count,
      alerts.rowCount,
    );
    await pool.query(
      'UPDATE notification_email_jobs SET attempts=4 WHERE notification_id=ANY($1::text[])',
      [alerts.rows.map((row) => row.id)],
    );
    await processNotificationEmails({
      notificationIds: alerts.rows.map((row) => row.id),
    });
    assert.equal(
      (
        await pool.query(
          'SELECT 1 FROM notifications WHERE event_key=ANY($1::text[])',
          [alerts.rows.map((row) => 'email-job-failed:' + row.id)],
        )
      ).rowCount,
      0,
    );
  } finally {
    transport.mock.restore();
    env.SMTP_HOST = host;
    await pool.query('DELETE FROM notifications WHERE id=$1 OR event_key=$2', [
      id,
      'email-job-failed:' + id,
    ]);
  }
});
test('system migration is idempotent and marks legacy admin moderation alerts read', async () => {
  const sql = await readFile(
    new URL(
      '../src/db/migrations/011_system_notifications.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await client.query(
      "INSERT INTO notifications(recipient_user_id,title,message,type) VALUES('user-admin-1','Legacy review','Fixture','MODERATION') RETURNING id",
    );
    await client.query(sql);
    await client.query(sql);
    assert.ok(
      (
        await client.query('SELECT read_at FROM notifications WHERE id=$1', [
          row.rows[0].id,
        ])
      ).rows[0].read_at,
    );
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
});
