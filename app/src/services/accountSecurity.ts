import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { transaction } from '../config/db.js';
import { notifyAdmins } from './notifications.js';
export async function notifyStaffSecurity(
  client: PoolClient,
  userId: string,
  action: string,
  eventKey: string,
) {
  const user = await client.query(
    "SELECT id FROM users WHERE id=$1 AND role IN ('CLINICIAN_MODERATOR','SYSTEM_ADMIN')",
    [userId],
  );
  if (user.rowCount)
    await notifyAdmins(client, {
      kind: 'ADMIN_ACCOUNT_SECURITY',
      eventKey,
      context: { userId, action },
    });
}
export async function recordFailedSignIn(
  identifier: string,
  user?: { id: string; role: string },
) {
  const key =
    'auth-fail:' +
    crypto
      .createHash('sha256')
      .update(identifier.trim().toLowerCase())
      .digest('hex');
  await transaction(async (client) => {
    await client.query(
      "DELETE FROM app_settings WHERE key LIKE 'auth-fail:%' AND updated_at<NOW()-INTERVAL '15 minutes'",
    );
    const result = await client.query(
      `INSERT INTO app_settings(key,value,updated_at) VALUES($1,'{"count":1}',NOW())
      ON CONFLICT(key) DO UPDATE SET value=jsonb_build_object('count',(app_settings.value->>'count')::int+1),updated_at=NOW() RETURNING value`,
      [key],
    );
    if (
      user &&
      user.role !== 'CARE_PARTNER' &&
      result.rows[0].value.count === 5
    )
      await notifyAdmins(client, {
        kind: 'ADMIN_ACCOUNT_SECURITY',
        eventKey: `failed-staff-logins:${user.id}:${crypto.randomUUID()}`,
        context: { userId: user.id, action: 'REPEATED_FAILED_LOGINS' },
      });
  });
}
