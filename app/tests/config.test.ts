import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
const modulePath = new URL('../src/config/env.ts', import.meta.url).href;
for (const flag of [
  'ENABLE_DATABASE_RESET',
  'ENABLE_DEV_PERSONAS',
  'ENABLE_DEV_AUTH_PREVIEWS',
]) {
  test(`production refuses ${flag}`, () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        `await import(${JSON.stringify(modulePath)})`,
      ],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DB_PASSWORD: 'test-only-long-password',
          JWT_SECRET: 'test-only-signing-key-with-32-characters',
          CORS_ORIGIN: 'https://example.test',
          APP_URL: 'https://example.test',
          ENABLE_DATABASE_RESET: 'false',
          ENABLE_DEV_PERSONAS: 'false',
          ENABLE_DEV_AUTH_PREVIEWS: 'false',
          [flag]: 'true',
        },
        encoding: 'utf8',
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot be enabled in production/);
  });
}
