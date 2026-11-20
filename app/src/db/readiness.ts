import { query } from '../config/db.js';
import {
  assertMigrationsCurrent,
  readMigrations,
  type MigrationRecord,
} from './migrationCatalog.js';
export async function verifyDatabaseSchema() {
  const exists = await query(
    "SELECT to_regclass('public.schema_migrations') AS name",
  );
  if (!exists.rows[0]?.name)
    throw new Error(
      'Database has not been initialized; run migrate:compiled before starting this release',
    );
  const applied = await query<MigrationRecord>(
    'SELECT version, checksum FROM schema_migrations',
  );
  assertMigrationsCurrent(readMigrations(), applied.rows);
}
