// apps/api/src/db/backup.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-backup-test-'));
const dbPath = path.join(tmpDir, 'test.db');
process.env.CARECONNECT_DATA_DIR = tmpDir;
process.env.CARECONNECT_DB_PATH = dbPath;

// Import only backup.js up front. Deliberately do NOT import schema.js here —
// opening a DatabaseSync connection (schema.js's module-level side effect)
// would create an empty file at dbPath and defeat the "no db file exists
// yet" scenario the first test below needs. schema.js is imported lazily,
// after that test runs.
const { backupDatabase } = await import('./backup.js');

test('backupDatabase returns an empty string and does not throw when no db file exists yet', () => {
  assert.ok(!existsSync(dbPath), 'precondition: db file must not exist yet');
  assert.doesNotThrow(() => {
    const result = backupDatabase();
    assert.equal(result, '');
  });
});

test('backupDatabase copies the live db file and returns its path', async () => {
  const { initDb } = await import('./schema.js');
  initDb();
  writeFileSync(dbPath, readFileSync(dbPath)); // ensure file exists/flushed
  const backupPath = backupDatabase();
  assert.ok(existsSync(backupPath), `expected backup file to exist at ${backupPath}`);
  assert.match(backupPath, /backups[\\/]careconnect-.*\.db$/);
  assert.deepEqual(readFileSync(backupPath), readFileSync(dbPath));
});
