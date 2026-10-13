import type { Migration } from '../migrator.js';
import { migrateParitySchema } from '../parity-migrate.js';

export const migration0001ParitySchema: Migration = {
  name: '0001-parity-schema',
  up: migrateParitySchema,
};
