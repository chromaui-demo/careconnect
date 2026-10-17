import { request, type Browser } from '@playwright/test';
import { test } from '@chromatic-com/playwright';
import { DEPLOYED, EHR_URL, PORTAL_URL } from './env';

/**
 * Matches the app-version line the login screens print ("v1.4.0 · Design
 * System v2.1.0") for the version this run deployed, and not the design
 * system's version that follows it.
 */
export function deployedVersionLine(): RegExp {
  const escaped = DEPLOYED.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^v${escaped}( ·|$)`);
}

type Unit = 'api' | 'ehr' | 'portal';

/**
 * The first release of each unit that a test depends on. Units deploy one at
 * a time, and each deploy runs the whole suite against the environment, so
 * while one unit ships its new release the others are still on their previous
 * one. A test that needs another unit's new behaviour checks the version that
 * environment serves (see skipUnlessServing) instead of assuming it.
 * An entry can be removed once every environment is past it.
 */
export const REQUIRES = {
  /** The login form arrives prefilled with the seeded account. */
  prefilledEhrLogin: { unit: 'ehr', version: '1.0.12' },
  prefilledPortalLogin: { unit: 'portal', version: '1.0.11' },
  /** Walk-in registration, encounter chart saving, the service catalog for patients. */
  workflowApi: { unit: 'api', version: '1.1.1' },
  /** Patient search that never shows stale results. */
  ehrPatientSearch: { unit: 'ehr', version: '1.0.12' },
} as const satisfies Record<string, { unit: Unit; version: string }>;

const served = new Map<Unit, Promise<string>>();

/** The version a unit is serving, read once per worker. */
export function servedVersion(browser: Browser, unit: Unit): Promise<string> {
  if (!served.has(unit)) served.set(unit, readServedVersion(browser, unit));
  return served.get(unit)!;
}

async function readServedVersion(browser: Browser, unit: Unit): Promise<string> {
  if (unit === 'api') {
    const api = await request.newContext();
    try {
      return String((await (await api.get(`${EHR_URL}/api/health`)).json()).version);
    } finally {
      await api.dispose();
    }
  }
  const page = await browser.newPage();
  try {
    await page.goto(`${unit === 'ehr' ? EHR_URL : PORTAL_URL}/login`);
    const line = await page.getByText(/^v\d+\.\d+\.\d+( ·|$)/).textContent();
    return line!.match(/^v(\d+\.\d+\.\d+)/)![1];
  } finally {
    await page.close();
  }
}

function isOlder(version: string, than: string): boolean {
  const a = version.split('.').map(Number);
  const b = than.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/**
 * Skips the current test when the environment serves an older release of a
 * unit than the test needs, naming both versions in the skip reason. The unit
 * being deployed always serves its new release, so its own tests never skip.
 */
export async function skipUnlessServing(browser: Browser, ...needs: Array<{ unit: Unit; version: string }>) {
  for (const need of needs) {
    const version = await servedVersion(browser, need.unit);
    test.skip(isOlder(version, need.version), `needs ${need.unit} ${need.version}; this environment serves ${need.unit} ${version}`);
  }
}
