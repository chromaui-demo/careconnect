import type { Migration } from '../migrator.js';
import { migration0001ParitySchema } from './0001-parity-schema.js';
import { migration0002UsersPatientIdColumn } from './0002-users-patient-id-column.js';

export const MIGRATIONS: Migration[] = [
  migration0001ParitySchema,
  migration0002UsersPatientIdColumn,
];
