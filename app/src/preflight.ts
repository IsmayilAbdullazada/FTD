import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { verifyDatabaseSchema } from './db/readiness.js';
import { uploadsDirectory } from './services/uploads.js';
import { createEmailTransport } from './services/email.js';
import { logger } from './lib/logger.js';

try {
  if (env.NODE_ENV !== 'production')
    throw new Error(
      'Preflight requires NODE_ENV=production and the production environment file',
    );
  await verifyDatabaseSchema();
  logger.info('PASS: database migrations match this release');
  if (
    !env.GUIDE_UPLOAD_DIRECTORY ||
    !path.isAbsolute(env.GUIDE_UPLOAD_DIRECTORY)
  )
    throw new Error(
      'Set GUIDE_UPLOAD_DIRECTORY to an absolute persistent storage path before release',
    );
  await fs.mkdir(uploadsDirectory, { recursive: true });
  const probe = path.join(uploadsDirectory, `.preflight-${randomUUID()}`);
  try {
    await fs.writeFile(probe, '', { flag: 'wx', mode: 0o600 });
  } finally {
    await fs.rm(probe, { force: true });
  }
  logger.info('PASS: persistent upload directory is writable');
  if (!env.SMTP_HOST)
    throw new Error(
      'SMTP_HOST is required for invitation and recovery delivery',
    );
  if (env.SMTP_FROM.includes('@localhost'))
    throw new Error('Configure a production SMTP_FROM address');
  const transport = createEmailTransport();
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
  logger.info('PASS: SMTP relay accepts a TLS connection (no email sent)');
} catch (error) {
  logger.error('Production preflight failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
