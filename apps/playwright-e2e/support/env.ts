/**
 * Where the suite points and who it signs in as. Everything comes from the
 * environment so the same tests run against a local stack, staging and
 * production; nothing here names a real host.
 */

function requiredUrl(name: 'EHR_URL' | 'PORTAL_URL'): string {
  const value = (process.env[name] ?? '').replace(/\/$/, '');
  if (!value) {
    throw new Error(`${name} env var is required to run the end-to-end tests`);
  }
  return value;
}

export const EHR_URL = requiredUrl('EHR_URL');
export const PORTAL_URL = requiredUrl('PORTAL_URL');

/** The seeded demo password (apps/api/src/db/seed.ts); override per environment. */
export const PASSWORD = process.env.E2E_PASSWORD || 'CareConnect1!';

/** Seeded accounts, one per role the tests exercise. */
export const USERS = {
  admin: 'admin@se-tools.net',
  staff: 'staff@se-tools.net',
  billing: 'billing@se-tools.net',
  manager: 'manager@se-tools.net',
  patient: 'alice.smith@se-tools.net',
} as const;

export type Role = keyof typeof USERS;

/** Signed-in browser state written by tests/auth.setup.ts, one file per role. */
export const authFile = (role: Role) => `.auth/${role}.json`;

/**
 * Set by deploy-environment.yml to the unit it just shipped and that unit's
 * package.json version, so the suite can prove the new build is what's live.
 */
export const DEPLOYED = {
  unit: process.env.DEPLOY_UNIT ?? '',
  version: process.env.DEPLOY_VERSION ?? '',
};
