// apps/api/src/db/helpers.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-helpers-test-'));
process.env.CARECONNECT_DATA_DIR = tmpDir;
process.env.CARECONNECT_DB_PATH = path.join(tmpDir, 'test.db');

const { execute, queryOne } = await import('./helpers.js');

execute('CREATE TABLE notes (id TEXT PRIMARY KEY, body TEXT, phone TEXT)');

test('undefined parameters are stored as NULL', () => {
  // Optional request-body fields (a walk-in with no phone) arrive as undefined.
  const body: { phone?: string } = {};
  execute('INSERT INTO notes (id, body, phone) VALUES (?, ?, ?)', 'a', 'hello', body.phone as string);
  assert.deepEqual({ ...queryOne('SELECT body, phone FROM notes WHERE id = ?', 'a') }, { body: 'hello', phone: null });
});

test('COALESCE with an undefined parameter keeps the existing value', () => {
  // The encounter chart saves one field at a time; the others arrive as undefined.
  const patch: { body?: string; phone?: string } = { phone: '555-0100' };
  execute('UPDATE notes SET body = COALESCE(?, body), phone = COALESCE(?, phone) WHERE id = ?',
    patch.body as string, patch.phone as string, 'a');
  assert.deepEqual({ ...queryOne('SELECT body, phone FROM notes WHERE id = ?', 'a') }, { body: 'hello', phone: '555-0100' });
});
