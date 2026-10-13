/** The documented demo password. Public, so only local development may fall back to it. */
export const LOCAL_SEEDED_PASSWORD = 'CareConnect1!';

/**
 * The password given to seeded demo accounts. Deployed environments set
 * SEEDED_PASSWORD (the installer generates one); with NODE_ENV=production and no
 * value, this refuses rather than create accounts with the public default.
 * Call it only when an account is about to be created, so an already-seeded
 * database keeps starting without the variable.
 */
export function seededPassword(): string {
  const value = process.env.SEEDED_PASSWORD;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SEEDED_PASSWORD is not set. Production must not seed accounts with the public demo password.');
  }
  return LOCAL_SEEDED_PASSWORD;
}
