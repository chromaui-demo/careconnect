# Changesets

This folder holds [changesets](https://github.com/changesets/changesets) — one
markdown file per pending, unreleased change.

Add one with `npm run changeset`, pick **only the workspace(s) you changed**,
and commit it alongside your PR. Every workspace versions independently:
`@careconnect/api`, `@careconnect/ehr`, `@careconnect/portal` and
`@careconnect/design-system` are the four release units, each with its own
version, changelog, git tag and GitHub Release (see
[docs/RELEASE.md](../docs/RELEASE.md)).

When a shared package (`types`, `api-client`, `mock-data`, `design-system`)
bumps, every workspace that depends on it gets a patch bump too
(`updateInternalDependents: always`) — its built output changed, so its
version must change. Don't add changesets for dependents by hand.

`@careconnect/playwright-e2e` is a test harness, not a release unit, and is
ignored by Changesets.

Every workspace is private, so `changeset publish` creates git tags
(`@careconnect/<name>@<version>`) but pushes nothing to a registry.
