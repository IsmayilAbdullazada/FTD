import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readMigrations } from '../dist/db/migrationCatalog.js';
const source = fileURLToPath(new URL('../src/db/migrations/', import.meta.url));
const destination = fileURLToPath(
  new URL('../dist/db/migrations/', import.meta.url),
);
const migrations = readMigrations(source);
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
for (const migration of migrations) {
  await fs.writeFile(
    path.join(destination, migration.version + '.sql'),
    migration.sql,
  );
}
