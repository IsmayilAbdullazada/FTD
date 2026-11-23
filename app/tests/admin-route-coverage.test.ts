import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routeInventory } from '../../scripts/route-inventory.mjs';
test('every Express API route has a reviewed admin-console coverage entry', async () => {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  const routes = await routeInventory(root);
  const docs = await fs.readFile(
    path.join(root, 'docs/admin-console.md'),
    'utf8',
  );
  assert.ok(routes.length > 50);
  for (const route of routes)
    assert.ok(
      docs.includes('`' + route + '`'),
      'Missing coverage matrix entry: ' + route,
    );
});
