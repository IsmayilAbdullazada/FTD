import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { processRecoveryJob } from '../src/services/recovery.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
test('durable recovery jobs send distinct messages over required TLS and retain no secret email bodies', async () => {
  const id = randomUUID();
  const email = id + '@example.test';
  const sent: Array<{ text: string }> = [];
  let tls = false;
  const settings = {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
  };
  Object.assign(env, {
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'fixture',
    SMTP_PASS: 'fixture',
  });
  const transport = mock.method(
    nodemailer,
    'createTransport',
    (options: { requireTLS?: boolean }) => {
      tls = options.requireTLS === true;
      return {
        sendMail: async (message: { text: string }) => {
          sent.push(message);
        },
      };
    },
  );
  try {
    await pool.query(
      "INSERT INTO users(id,email,password_hash,role,first_name,last_name,anonymous_handle,badge_label) VALUES($1,$2,'disabled','CARE_PARTNER','Recovery','Fixture',$1,'Care Partner')",
      [id, email],
    );
    const job = (
      await pool.query(
        'INSERT INTO password_recovery_jobs(email) VALUES($1) RETURNING id',
        [email],
      )
    ).rows[0];
    await processRecoveryJob(job.id);
    assert.equal(tls, true);
    assert.equal(sent.length, 2);
    assert.match(sent[0].text, /resetToken=/);
    assert.doesNotMatch(sent[1].text, /resetToken=/);
    assert.match(sent[1].text, /\d{6}/);
    const outbox = await pool.query(
      'SELECT text_body,html_body FROM email_outbox WHERE recipient=$1',
      [email],
    );
    assert.ok(
      outbox.rows.every((row) => row.text_body === '[Content not retained]'),
    );
    const completed = (
      await pool.query(
        'SELECT completed_at FROM password_recovery_jobs WHERE id=$1',
        [job.id],
      )
    ).rows[0];
    assert.ok(completed.completed_at);
  } finally {
    transport.mock.restore();
    Object.assign(env, settings);
    await pool.query('DELETE FROM password_recovery_jobs WHERE email=$1', [
      email,
    ]);
    await pool.query('DELETE FROM email_outbox WHERE recipient=$1', [email]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    await pool.end();
  }
});
