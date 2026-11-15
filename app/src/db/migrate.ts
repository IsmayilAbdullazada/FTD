import { logger } from '../lib/logger.js';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const migrationsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'migrations',
);

interface AppliedMigration {
  version: string;
  checksum: string;
}

function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

async function runMigrations() {
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/.test(file))
    .sort();

  if (!migrationFiles.length) {
    throw new Error('No numbered SQL migrations were found');
  }

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

    const appliedResult = await client.query<AppliedMigration>(
      'SELECT version, checksum FROM schema_migrations',
    );
    const applied = new Map(
      appliedResult.rows.map((migration) => [
        migration.version,
        migration.checksum,
      ]),
    );

    for (const file of migrationFiles) {
      const version = file.replace(/\.sql$/, '');
      const sql = fs.readFileSync(path.join(migrationsDirectory, file), 'utf8');
      const migrationChecksum = checksum(sql);
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
