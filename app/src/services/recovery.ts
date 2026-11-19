import crypto from 'node:crypto';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { sendEmail } from './email.js';
import { logger } from '../lib/logger.js';
const hash = (text: string) =>
  crypto.createHash('sha256').update(text).digest('hex');
export async function processRecoveryJob(jobId?: string): Promise<void> {
  const client = await pool.connect();
  let released = false;
  try {
    await client.query('BEGIN');
    const jobs = await client.query(
      `SELECT * FROM password_recovery_jobs WHERE completed_at IS NULL AND next_attempt_at<=NOW() AND attempts<5 AND ($1::uuid IS NULL OR id=$1) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`,
      [jobId ?? null],
    );
    const job = jobs.rows[0];
    if (!job) {
      await client.query('COMMIT');
      return;
    }
    const user = (
      await client.query(
        'SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND is_active FOR UPDATE',
        [job.email],
      )
    ).rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      await client.query(
        'DELETE FROM password_resets WHERE user_id=$1 AND consumed_at IS NULL',
        [user.id],
      );
      await client.query(
        `INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '20 minutes')`,
        [user.id, hash(token)],
      );
      const url = new URL(env.APP_URL);
      url.searchParams.set('tab', 'reset-password');
      // Fragments stay in the browser and are not sent in HTTP requests or access logs.
      url.hash = new URLSearchParams({ resetToken: token }).toString();
      // Commit credentials before delivery so received links are immediately usable.
      await client.query(
        "UPDATE password_recovery_jobs SET attempts=attempts+1,next_attempt_at=NOW()+INTERVAL '1 minute' WHERE id=$1",
        [job.id],
      );
      await client.query('COMMIT');
      client.release();
      released = true;
      const link = await sendEmail({
        to: job.email,
        subject: 'Reset your password',
        text: `Reset your password: ${url.href}\n\nThis link expires in 20 minutes and can be used once. If you did not request this, you can ignore this email.`,
        html: `<p><a href="${url.href.replaceAll('&', '&amp;')}">Reset your password</a></p><p>This link expires in 20 minutes and can be used once. If you did not request this, you can ignore this email.</p>`,
      });
      if (link.emailSent)
        await pool.query(
          'UPDATE password_recovery_jobs SET completed_at=NOW() WHERE id=$1',
          [job.id],
        );
    } else {
      await client.query(
        'UPDATE password_recovery_jobs SET completed_at=NOW() WHERE id=$1',
        [job.id],
      );
      await client.query('COMMIT');
      client.release();
      released = true;
    }
    await pool.query(
      `DELETE FROM password_recovery_jobs WHERE created_at<NOW()-INTERVAL '1 day'`,
    );
  } catch (error) {
    if (!released) await client.query('ROLLBACK');
    logger.error('Recovery worker failed', error);
  } finally {
    if (!released) client.release();
  }
}
