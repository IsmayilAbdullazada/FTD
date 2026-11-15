import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
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
        'SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND is_active',
        [job.email],
      )
    ).rows[0];
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      const code = String(crypto.randomInt(100000, 1000000));
      await client.query(
        'DELETE FROM password_resets WHERE user_id=$1 AND consumed_at IS NULL',
        [user.id],
      );
      await client.query(
        `INSERT INTO password_resets(user_id,token_hash,code_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '20 minutes')`,
        [user.id, hash(token), await bcrypt.hash(code, 10)],
      );
      const url = new URL(env.APP_URL);
      url.searchParams.set('tab', 'reset-password');
      url.searchParams.set('email', job.email);
      url.searchParams.set('resetToken', token);
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
        subject: 'Password recovery link',
        text: `Open ${url.href}`,
        html: `<p><a href="${url.href.replaceAll('&', '&amp;')}">Reset your password</a></p>`,
      });
      const verification = await sendEmail({
        to: job.email,
        subject: 'Password recovery code',
        text: `Your recovery code is ${code}`,
        html: `<p>Your recovery code is ${code}</p>`,
      });
      if (link.emailSent && verification.emailSent)
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
