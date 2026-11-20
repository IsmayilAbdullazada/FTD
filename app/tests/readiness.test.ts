import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { pool } from '../src/config/db.js';
after(() => pool.end());
import {
  assertMigrationsCurrent,
  readMigrations,
} from '../src/db/migrationCatalog.js';
import { verifyDatabaseSchema } from '../src/db/readiness.js';
test('release readiness rejects unapplied, changed and newer migrations', () => {
  const expected = [{ version: '001_baseline', checksum: 'expected' }];
  assert.throws(
    () => assertMigrationsCurrent(expected, []),
    /Unapplied migration/,
  );
  assert.throws(
    () =>
      assertMigrationsCurrent(expected, [
        { version: '001_baseline', checksum: 'changed' },
      ]),
    /has been modified/,
  );
  assert.throws(
    () =>
      assertMigrationsCurrent(expected, [
        ...expected,
        { version: '999_future', checksum: 'new' },
      ]),
    /not present in this release/,
  );
  assert.doesNotThrow(() => assertMigrationsCurrent(expected, expected));
  assert.doesNotThrow(() =>
    assertMigrationsCurrent(expected, [
      ...expected,
      { version: '000_legacy_label', checksum: null },
    ]),
  );
});
test('the migrated integration database matches all packaged SQL checksums', async () => {
  assert.ok(readMigrations().length >= 9);
  await verifyDatabaseSchema();
});
