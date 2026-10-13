/**
 * The independently released units of this monorepo and the team that
 * owns each. This is the single source of truth used by the release tooling
 * (GitHub Releases, deploy dispatch) and mirrored by .github/CODEOWNERS.
 *
 * Shared packages (`types`, `api-client`, `mock-data`) version and tag
 * independently too, but they are not release units: nothing is deployed or
 * announced for them — they ship inside the unit that consumes them.
 */
export const RELEASE_UNITS = [
  {
    unit: 'api',
    name: '@careconnect/api',
    dir: 'apps/api',
    team: 'Backend',
    kind: 'service', // deployed: systemd + migrations
    deployable: true,
  },
  {
    unit: 'ehr',
    name: '@careconnect/ehr',
    dir: 'apps/ehr',
    team: 'EHR frontend',
    kind: 'frontend', // deployed: static bundle behind nginx
    deployable: true,
  },
  {
    unit: 'portal',
    name: '@careconnect/portal',
    dir: 'apps/portal',
    team: 'Portal frontend',
    kind: 'frontend',
    deployable: true,
  },
  {
    unit: 'portal-mobile',
    name: '@careconnect/portal-mobile',
    dir: 'apps/portal-mobile',
    team: 'Portal frontend',
    kind: 'mobile', // Expo app; released as tag + its Storybook in Chromatic, not deployed to a VM
    deployable: false,
  },
  {
    unit: 'design-system',
    name: '@careconnect/design-system',
    dir: 'packages/design-system',
    team: 'Design system',
    kind: 'library', // consumed at HEAD by ehr/portal; released as tag + Storybook
    deployable: false,
  },
  {
    unit: 'design-system-native',
    name: '@careconnect/design-system-native',
    dir: 'packages/design-system-native',
    team: 'Design system',
    kind: 'library', // consumed at HEAD by portal-mobile; its stories ship in that app's Storybook
    deployable: false,
  },
];

export function findUnit(unitOrName) {
  return RELEASE_UNITS.find((u) => u.unit === unitOrName || u.name === unitOrName);
}
