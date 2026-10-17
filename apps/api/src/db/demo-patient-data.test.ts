// apps/api/src/db/demo-patient-data.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-demo-data-test-'));
process.env.CARECONNECT_DATA_DIR = tmpDir;
process.env.CARECONNECT_DB_PATH = path.join(tmpDir, 'test.db');

const { initDb } = await import('./schema.js');
const { runMigrations } = await import('./migrator.js');
const { MIGRATIONS } = await import('./migrations/index.js');
const { seedDatabase } = await import('./seed.js');
const { migrateModules } = await import('./migrate.js');
const { SEEDED_PATIENT_COUNT } = await import('./demo-patient-data.js');
const { execute, queryCount } = await import('./helpers.js');

// One shared SQLite file (schema.ts opens a module-level connection), so this
// is a single test that walks through a first start and then a restart.
test('a restart adds demo history to the seeded patients only, not to patients registered later', () => {
  // First start, in the same order as index.ts.
  initDb();
  runMigrations(MIGRATIONS);
  seedDatabase();
  migrateModules();

  assert.equal(queryCount('SELECT COUNT(*) as c FROM patients'), SEEDED_PATIENT_COUNT);
  assert.ok(queryCount('SELECT COUNT(*) as c FROM claims') > 0, 'the seeded patients have demo claims');
  const claimsBefore = queryCount('SELECT COUNT(*) as c FROM claims');

  // A clinician registers a walk-in, as POST /appointments/walk-in does.
  execute(
    "INSERT INTO patients (id, first_name, last_name, date_of_birth, gender, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', '+1 second'))",
    'walk-in-1', 'Qa', 'Walkin', '1985-03-14', 'unknown',
  );

  // Restart.
  seedDatabase();
  migrateModules();

  for (const table of ['appointments', 'encounters', 'claims', 'patient_coverages', 'message_threads', 'refill_requests', 'manual_payments']) {
    assert.equal(
      queryCount(`SELECT COUNT(*) as c FROM ${table} WHERE patient_id = ?`, 'walk-in-1'), 0,
      `the walk-in gained ${table} rows on restart`,
    );
  }
  assert.equal(queryCount('SELECT COUNT(*) as c FROM claims'), claimsBefore, 'a restart added claims');
});
