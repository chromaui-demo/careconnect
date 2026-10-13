import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-migrations-test-'));
process.env.CARECONNECT_DATA_DIR = tmpDir;
process.env.CARECONNECT_DB_PATH = path.join(tmpDir, 'test.db');

const { db, initDb } = await import('./schema.js');
const { runMigrations } = await import('./migrator.js');
const { MIGRATIONS } = await import('./migrations/index.js');

// Both tests share one SQLite file (node:sqlite's DatabaseSync is a
// module-level singleton per schema.ts:12, and node --test runs everything
// in one file's test() blocks sequentially in the same process) — so this
// must be a single test with two sequential runMigrations() calls, not two
// separate tests, or the second "first run" would silently start from the
// first test's already-applied state.
test('MIGRATIONS applies once, then is a no-op (all skipped) on the same DB', () => {
  initDb();

  const first = runMigrations(MIGRATIONS);
  assert.deepEqual(first.applied, ['0001-parity-schema', '0002-users-patient-id-column']);
  assert.deepEqual(first.skipped, []);

  const patientDocsTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='patient_documents'",
  ).get();
  assert.equal(patientDocsTable?.name, 'patient_documents');

  const usersCols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  assert.ok(usersCols.some((c) => c.name === 'patient_id'));

  const second = runMigrations(MIGRATIONS);
  assert.deepEqual(second.applied, []);
  assert.deepEqual(second.skipped, ['0001-parity-schema', '0002-users-patient-id-column']);
});
