import fs from 'node:fs/promises';
import path from 'node:path';

// Explicit public assets only. Runtime uploads must never enter a frontend build.
export async function copyPublicAssets(root, output) {
  for (const entry of ['fonts', 'resources', 'website_logo.png']) {
    await fs.cp(path.join(root, 'public', entry), path.join(output, entry), {
      recursive: true,
    });
  }
}
