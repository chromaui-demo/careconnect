import type { Migration } from '../migrator.js';
import { execute, queryAll } from '../helpers.js';

function columnExists(table: string, column: string): boolean {
  return queryAll(`PRAGMA table_info(${table})`).some((c) => c.name === column);
}

export const migration0002UsersPatientIdColumn: Migration = {
  name: '0002-users-patient-id-column',
  up: () => {
    if (!columnExists('users', 'patient_id')) {
      execute('ALTER TABLE users ADD COLUMN patient_id TEXT');
    }
  },
};
