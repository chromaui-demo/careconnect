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

/**
 * The account each app's login form arrives prefilled with, in every build
 * (apps/ehr and apps/portal LoginPage.tsx), so people only type the password.
 */
export const PREFILLED_USER = {
  ehr: USERS.admin,
  portal: USERS.patient,
} as const;

/**
 * The patient the Portal workflow tests sign in as and save data for. Not the
 * prefilled demo patient: the read-only tests snapshot that patient's pages,
 * and a payment or booking made every run would change them every run.
 */
export const WORKFLOW_PATIENT = {
  email: 'bob.johnson@se-tools.net',
  firstName: 'Bob',
  lastName: 'Johnson',
  dateOfBirth: '1967-02-02',
  phone: '(555) 101-1011',
} as const;

/**
 * A short tag unique to one test run, for the data the workflow tests create
 * ("E2E-lx3k9a2f"). Staging is never reset and several deploys can run the
 * suite at once, so each flow finds its own records by this tag, never by
 * position or count.
 */
export function uniqueTag(): string {
  return `E2E-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

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
