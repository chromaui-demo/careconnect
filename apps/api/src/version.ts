import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @careconnect/api version from apps/api/package.json (bumped independently by Changesets). */
const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const APP_VERSION = JSON.parse(
  readFileSync(join(apiRoot, 'package.json'), 'utf8'),
).version as string;
