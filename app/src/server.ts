import { processNotificationEmails } from './services/notificationEmails.js';
import { cleanupUploads } from './services/uploads.js';
import { processRecoveryJob } from './services/recovery.js';
import { logger } from './lib/logger.js';
import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const server = http.createServer(app);
server.listen(env.PORT, '0.0.0.0', () =>
  logger.info(`[FTD backend] Listening on http://0.0.0.0:${env.PORT}`),
);

let recoveryJob: Promise<void> | null = null;
let notificationJob: ReturnType<typeof processNotificationEmails> | null = null;
const recoveryTimer = setInterval(() => {
  if (!recoveryJob)
    recoveryJob = processRecoveryJob()
      .catch((error) => logger.error('Recovery worker failed', error))
      .finally(() => {
        recoveryJob = null;
      });
}, 5000);
recoveryTimer.unref();
const notificationTimer = setInterval(() => {
  if (!notificationJob)
    notificationJob = processNotificationEmails().finally(() => {
      notificationJob = null;
    });
}, 5000);
notificationTimer.unref();
const uploadCleanupTimer = setInterval(() => {
  void cleanupUploads();
}, 3600000);
uploadCleanupTimer.unref();
void cleanupUploads();
let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  clearInterval(recoveryTimer);
  clearInterval(notificationTimer);
  clearInterval(uploadCleanupTimer);
  logger.info(`[FTD backend] ${signal}; shutting down`);
  server.close(async () => {
    await Promise.allSettled([recoveryJob, notificationJob]);
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
