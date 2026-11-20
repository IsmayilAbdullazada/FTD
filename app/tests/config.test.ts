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

test('production refuses an embedded database even when explicitly selected', () => {
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
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production', DB_DRIVER: 'pglite' },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production requires PostgreSQL/);
});

test('a PostgreSQL outage returns unhealthy without switching databases', () => {
  const appPath = new URL('../src/app.ts', import.meta.url).href;
  const dbPath = new URL('../src/config/db.ts', import.meta.url).href;
  const code = `
    const { app } = await import(${JSON.stringify(appPath)});
    const { pool } = await import(${JSON.stringify(dbPath)});
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/v1/health');
      console.log(JSON.stringify({status: response.status, body: await response.json()}));
    } finally { server.close(); await pool.end(); }
  `;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', code],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://example.test',
        APP_URL: 'https://example.test',
        ENABLE_DATABASE_RESET: 'false',
        ENABLE_DEV_PERSONAS: 'false',
        ENABLE_DEV_AUTH_PREVIEWS: 'false',
        DB_DRIVER: 'postgres',
        DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
        DB_PORT: '1',
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"status":503/);
  assert.match(result.stdout, /"database":"disconnected"/);
});
