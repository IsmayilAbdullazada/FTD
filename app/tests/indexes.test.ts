import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../src/config/db.js';
test('all foreign keys have a valid leading index after migrations', async () => {
  try {
    const result = await pool.query(
      `SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='f' AND n.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid AND i.indisvalid AND i.indpred IS NULL AND ARRAY(SELECT v FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(v,ord) WHERE ord<=cardinality(c.conkey) ORDER BY ord)=c.conkey)`,
    );
    assert.deepEqual(result.rows, []);
  } finally {
    await pool.end();
  }
});
