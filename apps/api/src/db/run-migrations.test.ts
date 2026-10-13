import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('run-migrations CLI creates schema_migrations table and exits 0', () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'careconnect-runmigrations-cli-'));
  const output = execFileSync(
    'node',
    ['--import', 'tsx', 'src/db/run-migrations.ts'],
    {
      cwd: apiRoot,
      env: {
        ...process.env,
        CARECONNECT_DATA_DIR: tmpDir,
        CARECONNECT_DB_PATH: path.join(tmpDir, 'test.db'),
      },
      encoding: 'utf8',
    },
  );
  assert.match(output, /Migrations complete/);
});
