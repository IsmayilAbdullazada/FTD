// Read-only check of effective web-server headers, including a generated frontend asset.
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  throw new Error(
    'Usage: node scripts/check-deployment.mjs https://your-site.example',
  );
}
const required = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
];
let failed = false;
const inspect = async (path) => {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(15000),
  });
  const missing = required.filter((header) => !response.headers.get(header));
  const ok = response.ok && missing.length === 0;
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'} ${path}: HTTP ${response.status}${missing.length ? `; missing ${missing.join(', ')}` : ''}\n`,
  );
  failed ||= !ok;
  return response;
};
try {
  const page = await inspect('/');
  const html = await page.text();
  const asset = html.match(/src="(\/assets\/[^"\s]+\.js)"/)?.[1];
  if (asset) await inspect(asset);
  else {
    failed = true;
    process.stdout.write(
      'FAIL: no built frontend JavaScript asset found in HTML\n',
    );
  }
  await inspect('/api/v1/health');
} catch (error) {
  failed = true;
  process.stderr.write(`Deployment check failed: ${error.message}\n`);
}
process.exitCode = failed ? 1 : 0;
