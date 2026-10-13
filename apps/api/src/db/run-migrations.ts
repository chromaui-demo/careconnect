import { initDb } from './schema.js';
import { runMigrations } from './migrator.js';
import { MIGRATIONS } from './migrations/index.js';

initDb();
const result = runMigrations(MIGRATIONS);
console.log(`Applied: ${result.applied.length ? result.applied.join(', ') : '(none)'}`);
console.log(`Already up to date: ${result.skipped.length ? result.skipped.join(', ') : '(none)'}`);
console.log('Migrations complete.');
