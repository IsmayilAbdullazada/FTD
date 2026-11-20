import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface MigrationRecord {
  version: string;
  checksum: string | null;
}
export function readMigrations(
  directory = fileURLToPath(new URL('./migrations/', import.meta.url)),
) {
  const migrations = fs
    .readdirSync(directory)
    .filter(
      (file) => /^\d+_[a-z0-9_]+\.sql$/.test(file) && !file.includes('_probe_'),
    )
    .sort()
    .map((file) => {
      const sql = fs.readFileSync(path.join(directory, file), 'utf8');
      return {
        version: file.replace(/\.sql$/, ''),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });
  if (!migrations.length)
    throw new Error('No numbered SQL migrations were found');
  return migrations;
}
export function assertMigrationsCurrent(
  expected: MigrationRecord[],
  applied: MigrationRecord[],
) {
  const recorded = new Map(applied.map((row) => [row.version, row.checksum]));
  for (const migration of expected) {
    if (!recorded.get(migration.version))
      throw new Error(
        `Unapplied migration ${migration.version}; run migrate:compiled before starting this release`,
      );
    if (recorded.get(migration.version) !== migration.checksum)
      throw new Error(
        `Applied migration ${migration.version} has been modified`,
      );
  }
  const known = new Set(expected.map((row) => row.version));
  const newer = applied.find(
    (row) =>
      row.checksum && /^\d+_/.test(row.version) && !known.has(row.version),
  );
  if (newer)
    throw new Error(
      `Database includes migration ${newer.version} not present in this release; check release compatibility before rollback`,
    );
}
