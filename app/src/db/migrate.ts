import { logger } from '../lib/logger.js';
import { readMigrations, type MigrationRecord } from './migrationCatalog.js';
import { pool } from '../config/db.js';

async function runMigrations() {
  const migrations = readMigrations();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('ftdcare_database_migrations'))",
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Earlier deployments recorded labels without checksums. Keep those records,
    // and apply the idempotent baseline before tracking numbered migrations.
    await client.query(
      'ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT',
    );

    const appliedResult = await client.query<MigrationRecord>(
      'SELECT version, checksum FROM schema_migrations',
    );
    const applied = new Map(
      appliedResult.rows.map((migration) => [
        migration.version,
        migration.checksum,
      ]),
    );

    for (const migration of migrations) {
      const { version, sql, checksum: migrationChecksum } = migration;
      const recordedChecksum = applied.get(version);

      if (recordedChecksum) {
        if (recordedChecksum !== migrationChecksum) {
          throw new Error(`Applied migration ${version} has been modified`);
        }
        continue;
      }

      logger.info(`[Migration] Applying ${version}...`);
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations(version, checksum) VALUES($1, $2)',
        [version, migrationChecksum],
      );
    }

    await client.query('COMMIT');
    logger.info('[Migration] Database is up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Migration Error]', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void runMigrations().catch(async (error) => {
  logger.error('Migration connection failed', error);
  process.exitCode = 1;
  await pool.end();
});
