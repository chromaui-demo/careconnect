/**
 * postinstall hook: download the Playwright browser the test suites need, so
 * `npm install` is the only setup step a new contributor runs.
 *
 * Three suites drive a real browser — `npm run test:stories` and
 * `npm run test:visual` (the design system's stories and visual tests, via
 * @vitest/browser-playwright) and `npm run smoke:test` (apps/playwright-e2e) —
 * and all use chromium. npm does not fetch browser
 * binaries with the packages, so without this they fail on a fresh clone with
 * `browserType.launch: Executable doesn't exist`.
 *
 * Deliberately skipped in three cases:
 *
 *   * CI — the workflows install a browser explicitly in the jobs that need
 *     one (the design-system CI job, the Chromatic Vitest job,
 *     deploy-environment.yml's smoke tests). Downloading it in the
 *     api/ehr/portal, release and Chromatic Storybook jobs would be ~150 MB
 *     of waste each.
 *   * Production builds — deploy/build-production.sh sets the skip variable
 *     below. It runs `npm ci --include=dev` on the VM as the service user, and
 *     an API server has no use for a browser.
 *   * Installs without dev dependencies, where Playwright is absent entirely.
 *
 * Failure here is a warning, never an error: a flaky network or a blocked CDN
 * must not stop someone installing the repo to work on the API.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SKIP_VAR = 'CARECONNECT_SKIP_PLAYWRIGHT_BROWSERS';
const MANUAL = 'npx playwright install chromium';

const require = createRequire(import.meta.url);

/** The Playwright CLI, or null when Playwright is not installed. */
function findCli() {
  // @playwright/test exports ./cli; the others do not, so fall back to
  // locating the package directory and using its cli.js by path.
  try {
    return require.resolve('@playwright/test/cli');
  } catch {
    /* not installed, or a version without that export — try the others */
  }
  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const cli = join(dirname(require.resolve(`${pkg}/package.json`)), 'cli.js');
      if (existsSync(cli)) return cli;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

if (process.env[SKIP_VAR]) {
  console.log(`playwright: skipped (${SKIP_VAR} is set) — browsers via \`${MANUAL}\``);
  process.exit(0);
}

if (process.env.CI) {
  console.log('playwright: skipped in CI — the jobs that need a browser install one themselves');
  process.exit(0);
}

const cli = findCli();
if (!cli) {
  // Expected with --omit=dev; not worth a warning.
  process.exit(0);
}

// `playwright install` is idempotent and cheap once the browser is cached, so
// this is a no-op on every install after the first.
const { status, error } = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  stdio: 'inherit',
});

if (error || status !== 0) {
  console.warn(
    [
      '',
      'playwright: could not download the chromium browser.',
      `  Install it later with \`${MANUAL}\`, or set ${SKIP_VAR}=1 to silence this.`,
      '  Until then `npm run test:stories` and `npm run smoke:test` will fail to launch.',
      '',
    ].join('\n'),
  );
}

// Never fail `npm install` over a browser download.
process.exit(0);
