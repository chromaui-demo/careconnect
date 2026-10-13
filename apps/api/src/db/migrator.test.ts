import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// migrator.ts must operate on the module-level `db` from schema.ts, so point
// CARECONNECT_DB_PATH at a throwaway file before importing anything that
// touches the database.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-migrator-test-'));
process.env.CARECONNECT_DATA_DIR = tmpDir;
process.env.CARECONNECT_DB_PATH = path.join(tmpDir, 'test.db');

const { db, initDb } = await import('./schema.js');
const { ensureMigrationsTable, runMigrations } = await import('./migrator.js');

test('ensureMigrationsTable creates schema_migrations once, idempotently', () => {
  initDb();
  ensureMigrationsTable();
  ensureMigrationsTable(); // must not throw on second call
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
  ).get();
  assert.equal(row?.name, 'schema_migrations');
});

test('runMigrations applies pending migrations in order and records them', () => {
  initDb();
  ensureMigrationsTable();
  const applied: string[] = [];
  const result = runMigrations([
    { name: '0001-first', up: () => applied.push('0001-first') },
    { name: '0002-second', up: () => applied.push('0002-second') },
  ]);
  assert.deepEqual(result.applied, ['0001-first', '0002-second']);
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(applied, ['0001-first', '0002-second']);
});

test('runMigrations skips already-applied migrations on a second run', () => {
  initDb();
  ensureMigrationsTable();
  let runCount = 0;
  const migration = { name: '0003-third', up: () => { runCount += 1; } };
  runMigrations([migration]);
  const result = runMigrations([migration]);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.skipped, ['0003-third']);
  assert.equal(runCount, 1);
});

test('runMigrations records a failed migration is NOT marked applied', () => {
  initDb();
  ensureMigrationsTable();
  const failing = { name: '0004-fails', up: () => { throw new Error('boom'); } };
  assert.throws(() => runMigrations([failing]), (thrown: unknown) => {
    assert.ok(thrown instanceof Error);
    assert.match(thrown.message, /0004-fails/);
    assert.match(thrown.message, /boom/);
    return true;
  });
  const row = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get('0004-fails');
  assert.equal(row, undefined);
});
