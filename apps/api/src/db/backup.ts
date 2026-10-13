import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR, DB_PATH } from './paths.js';

export function backupDatabase(): string {
  if (!existsSync(DB_PATH)) {
    console.error(`No database at ${DB_PATH} — nothing to back up.`);
    return '';
  }
  const backupsDir = path.join(DATA_DIR, 'backups');
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `careconnect-${timestamp}.db`);
  copyFileSync(DB_PATH, backupPath);
  return backupPath;
}
