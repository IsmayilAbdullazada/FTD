import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDeployment } from '../check-deployment.mjs';
const headers = {
  'content-security-policy':
    "default-src 'self'; object-src 'none'; frame-ancestors 'self'",
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff, nosniff',
  'x-frame-options': 'SAMEORIGIN',
};
function fake({
  assetType = 'text/javascript',
  health = { status: 'ok', database: 'connected' },
  missing = 404,
  uploads = 401,
  csp = headers['content-security-policy'],
} = {}) {
  return async (url) => {
    const p = url.pathname;
    let body = '',
      type = 'text/plain',
      status = 200;
    if (p === '/') {
      body = '<script type="module" src="/assets/index-test.js"></script>';
      type = 'text/html';
    } else if (p === '/api/v1/health') {
      body = JSON.stringify(health);
      type = 'application/json';
    } else if (p.startsWith('/assets/deployment-missing-')) status = missing;
    else if (p.startsWith('/uploads/')) status = uploads;
    else {
      body = 'export default 1';
      type = assetType;
    }
    return new Response(body, {
      status,
      headers: {
        ...headers,
        'content-security-policy': csp,
        'content-type': type,
      },
    });
  };
}
test('deployment probe verifies real asset/health contracts and protected uploads', async () => {
  assert.equal(
    (
      await checkDeployment('https://example.test', {
        fetchImpl: fake(),
        write: () => {},
      })
    ).ok,
    true,
  );
  for (const options of [
    { assetType: 'text/html' },
    { health: { status: 'ok', database: 'disconnected' } },
    { missing: 200 },
    { uploads: 200 },
    { csp: "default-src *; object-src 'none'; frame-ancestors 'self'" },
  ]) {
    assert.equal(
      (
        await checkDeployment('https://example.test', {
          fetchImpl: fake(options),
          write: () => {},
        })
      ).ok,
      false,
      JSON.stringify(options),
    );
  }
  await assert.rejects(checkDeployment('http://example.test'), /HTTPS/);
});
