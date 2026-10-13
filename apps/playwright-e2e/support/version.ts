import { DEPLOYED } from './env';

/**
 * Matches the app-version line the login screens print ("v1.4.0 · Design
 * System v2.1.0") for the version this run deployed, and not the design
 * system's version that follows it.
 */
export function deployedVersionLine(): RegExp {
  const escaped = DEPLOYED.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^v${escaped}( ·|$)`);
}
