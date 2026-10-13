import { db } from './schema.js';

export interface Migration {
  name: string;
  up: () => void;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export function ensureMigrationsTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function isApplied(name: string): boolean {
  const row = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(name);
  return row !== undefined;
}

function recordApplied(name: string): void {
  db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
}

export function runMigrations(migrations: Migration[]): MigrationResult {
  ensureMigrationsTable();
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (isApplied(migration.name)) {
      skipped.push(migration.name);
      continue;
    }
    db.exec('BEGIN');
    try {
      migration.up();
      recordApplied(migration.name);
      db.exec('COMMIT');
      applied.push(migration.name);
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore — surfacing the original migration error below matters more
        // than a failed rollback-of-a-rollback
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${migration.name} failed: ${message}`, { cause: err });
    }
  }

  return { applied, skipped };
}
