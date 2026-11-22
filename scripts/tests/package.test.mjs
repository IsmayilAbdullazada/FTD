import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { packageRelease } from '../package-release.mjs';
import { copyPublicAssets } from '../public-assets.mjs';

test('public build assets exclude uploaded PDFs and stray private files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-assets-test-'));
  try {
    for (const f of [
      'public/fonts/font.woff2',
      'public/resources/guide.pdf',
      'public/website_logo.png',
      'public/uploads/guides/private.pdf',
      'public/private.env',
    ]) {
      await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true });
      await fs.writeFile(path.join(root, f), 'fixture');
    }
    const output = path.join(root, 'dist');
    await copyPublicAssets(root, output);
    await fs.access(path.join(output, 'resources/guide.pdf'));
    await fs.access(path.join(output, 'fonts/font.woff2'));
    await assert.rejects(fs.access(path.join(output, 'uploads')));
    await assert.rejects(fs.access(path.join(output, 'private.env')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('release package includes complete runtime, checksums and revision; excludes secrets and dependencies', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ftd-package-test-'));
  const output = path.join(os.tmpdir(), 'ftd-package-' + Date.now() + '.tgz');
  try {
    const files = {
      'package.json': JSON.stringify({
        allowScripts: { 'esbuild@0.28.2': true },
      }),
      'dist/index.html': '<script src="/assets/index-test.js"></script>',
      'dist/assets/index-test.js': 'export default 1',
      'app/dist/server.js': 'server',
      'app/dist/db/migrate.js': 'migrate',
      'app/dist/preflight.js': 'preflight',
      'app/package.json': '{}',
      'app/package-lock.json': '{}',
      'public/resources/guide.pdf': 'pdf',
      'config/nginx.conf': 'nginx',
      'config/ftdcare.env.example': 'example',
      'config/ftdcare.service': 'service',
      'docs/deployment.md': 'docs',
      'docs/qa/multipart-uploads.md': 'PDF proxy verification',
      'config/production.env': 'SECRET',
      'app/node_modules/private': 'dependency',
      'public/uploads/guides/private.pdf': 'private',
    };
    for (const [file, body] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), body);
    }
    const git = (...args) =>
      execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    git('init');
    git('add', '.');
    git(
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release@example.test',
      'commit',
      '-m',
      'fixture',
    );
    const result = await packageRelease(root, output);
    assert.equal(result.dirty, false);
    const entries = execFileSync('tar', ['-tzf', output], { encoding: 'utf8' });
    assert.match(entries, /app\/dist\/preflight.js/);
    assert.match(entries, /qa\/multipart-uploads.md/);
    assert.match(entries, /SHA256SUMS/);
    assert.match(entries, /release.json/);
    assert.doesNotMatch(entries, /production.env|node_modules|private.pdf/);
    const unpack = path.join(root, 'unpacked');
    await fs.mkdir(unpack);
    execFileSync('tar', ['-xzf', output, '-C', unpack]);
    const manifest = JSON.parse(
      await fs.readFile(path.join(unpack, 'app/package.json'), 'utf8'),
    );
    assert.deepEqual(manifest.allowScripts, { 'esbuild@0.28.2': true });
    execFileSync('sha256sum', ['--check', 'SHA256SUMS'], {
      cwd: unpack,
      stdio: 'pipe',
    });
    await assert.rejects(packageRelease(root, output), /local changes/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(output, { force: true });
  }
});
