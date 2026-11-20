import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createTestRelay } from './helpers/smtpRelay.js';

test('production preflight verifies schema, writable storage and trusted STARTTLS without sending mail', async () => {
  const relay = await createTestRelay();
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ftd-preflight-test-'),
  );
  try {
    const cert = path.join(directory, 'relay.pem');
    await fs.writeFile(cert, relay.cert);
    const run = (overrides: Record<string, string> = {}) =>
      new Promise<{ code: number | null; log: string }>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            '--import',
            'tsx',
            fileURLToPath(new URL('../src/preflight.ts', import.meta.url)),
          ],
          {
            cwd: fileURLToPath(new URL('..', import.meta.url)),
            env: {
              ...process.env,
              NODE_ENV: 'production',
              DB_DRIVER: 'postgres',
              APP_URL: 'https://example.test',
              CORS_ORIGIN: 'https://example.test',
              ENABLE_DEV_PERSONAS: 'false',
              ENABLE_DATABASE_RESET: 'false',
              ENABLE_DEV_AUTH_PREVIEWS: 'false',
              SMTP_HOST: '127.0.0.1',
              SMTP_PORT: String(relay.port),
              SMTP_FROM: 'Release <release@example.test>',
              GUIDE_UPLOAD_DIRECTORY: path.join(directory, 'uploads'),
              NODE_EXTRA_CA_CERTS: cert,
              ...overrides,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 15000,
          },
        );
        let log = '';
        child.stdout.on('data', (chunk) => {
          log += chunk;
        });
        child.stderr.on('data', (chunk) => {
          log += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, log }));
      });
    const success = await run();
    assert.equal(success.code, 0, success.log);
    assert.match(success.log, /SMTP relay accepts a TLS connection/);
    assert.equal(relay.messages.length, 0);
    assert.ok(relay.commands.some((command) => command.startsWith('STARTTLS')));
    assert.deepEqual(await fs.readdir(path.join(directory, 'uploads')), []);
    const relativeStorage = await run({
      GUIDE_UPLOAD_DIRECTORY: 'relative/uploads',
    });
    assert.notEqual(relativeStorage.code, 0);
    assert.match(relativeStorage.log, /absolute persistent storage path/);
    const unwritable = await run({ GUIDE_UPLOAD_DIRECTORY: cert });
    assert.notEqual(unwritable.code, 0);
    assert.match(unwritable.log, /Production preflight failed/);
    const missing = await run({ SMTP_HOST: '' });
    assert.notEqual(missing.code, 0);
    assert.match(missing.log, /SMTP_HOST is required/);
    const untrusted = await run({ NODE_EXTRA_CA_CERTS: '' });
    assert.notEqual(untrusted.code, 0);
    assert.match(untrusted.log, /Production preflight failed/);
  } finally {
    await relay.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
