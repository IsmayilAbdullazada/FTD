import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
test(
  'the real production build never exports a local private upload',
  { timeout: 180000 },
  async () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const sentinel = path.join(
      root,
      'public/uploads/guides',
      'release-test-' + randomUUID() + '.pdf',
    );
    try {
      await fs.mkdir(path.dirname(sentinel), { recursive: true });
      await fs.writeFile(
        sentinel,
        'Private QA upload: must never enter the public build',
      );
      execFileSync('npm', ['run', 'build'], {
        cwd: root,
        stdio: 'pipe',
        timeout: 170000,
      });
      await assert.rejects(fs.access(path.join(root, 'dist/uploads')));
      await fs.access(path.join(root, 'dist/fonts/font-0.woff2'));
      await fs.access(
        path.join(root, 'dist/resources/Managing-Aggressive-Behavior.pdf'),
      );
    } finally {
      await fs.rm(sentinel, { force: true });
    }
  },
);
