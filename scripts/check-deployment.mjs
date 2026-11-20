import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function securityErrors(headers) {
  const errors = [];
  const csp = headers.get('content-security-policy') || '';
  if (
    !/(?:^|;)\s*default-src\s+'self'(?:\s|;|$)/i.test(csp) ||
    !/object-src\s+'none'/i.test(csp) ||
    !/frame-ancestors\s+'(?:self|none)'/i.test(csp) ||
    /'unsafe-eval'|(?:^|\s)\*(?:\s|;|$)/i.test(csp)
  )
    errors.push('missing or unsafe Content-Security-Policy');
  const age = Number(
    headers.get('strict-transport-security')?.match(/max-age=(\d+)/i)?.[1] || 0,
  );
  if (age < 15552000)
    errors.push('HSTS max-age is missing or below six months');
  const contentTypeOptions =
    headers
      .get('x-content-type-options')
      ?.split(',')
      .map((value) => value.trim().toLowerCase()) || [];
  if (
    !contentTypeOptions.length ||
    contentTypeOptions.some((value) => value !== 'nosniff')
  )
    errors.push('X-Content-Type-Options must be nosniff');
  const frame =
    headers
      .get('x-frame-options')
      ?.split(',')
      .map((value) => value.trim().toUpperCase()) || [];
  if (
    !frame.length ||
    frame.some((value) => !['DENY', 'SAMEORIGIN'].includes(value))
  )
    errors.push('invalid X-Frame-Options');
  return errors;
}
export async function checkDeployment(
  base,
  {
    fetchImpl = fetch,
    write = (line) => process.stdout.write(line + '\n'),
  } = {},
) {
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || origin.username || origin.password)
    throw new Error('Use an HTTPS deployment URL without credentials');
  const results = [];
  async function inspect(resource, expectedStatus = 200, type) {
    try {
      const response = await fetchImpl(new URL(resource, origin), {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      const errors = securityErrors(response.headers);
      if (response.status !== expectedStatus)
        errors.push(`expected HTTP ${expectedStatus}, got ${response.status}`);
      if (type && !type.test(response.headers.get('content-type') || ''))
        errors.push('unexpected Content-Type');
      const row = { path: resource, errors };
      results.push(row);
      write(
        `${errors.length ? 'FAIL' : 'PASS'} ${resource}: HTTP ${response.status}${errors.length ? '; ' + errors.join('; ') : ''}`,
      );
      return { response, row };
    } catch (error) {
      results.push({ path: resource, errors: [error.message] });
      write(`FAIL ${resource}: ${error.message}`);
      return null;
    }
  }
  const page = await inspect('/', 200, /^text\/html\b/i);
  if (page) {
    const html = await page.response.text();
    const asset = html.match(/src="(\/assets\/[^"\s]+\.js)"/)?.[1];
    if (asset)
      await inspect(
        asset,
        200,
        /^(?:application|text)\/(?:javascript|ecmascript)\b/i,
      );
    else {
      page.row.errors.push('no built frontend JavaScript entry');
      write('FAIL /: no built frontend JavaScript entry');
    }
  }
  const health = await inspect('/api/v1/health', 200, /^application\/json\b/i);
  if (health) {
    const body = await health.response.json().catch(() => null);
    if (body?.status !== 'ok' || body?.database !== 'connected') {
      health.row.errors.push('API/database is not healthy');
      write('FAIL /api/v1/health: API/database is not healthy');
    }
  }
  await inspect('/assets/deployment-missing-' + randomUUID() + '.js', 404);
  await inspect('/uploads/guides/deployment-probe.pdf', 401);
  return { ok: results.every((row) => !row.errors.length), results };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = (await checkDeployment(process.argv[2])).ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`Deployment check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
