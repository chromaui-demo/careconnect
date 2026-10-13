# Changelog

CareConnect's release history is written by [Changesets](https://github.com/changesets/changesets)
into per-package changelogs. Start here:

| Changelog | Covers |
|---|---|
| [apps/api/CHANGELOG.md](apps/api/CHANGELOG.md) | `@careconnect/api` — the API service. Tags `@careconnect/api@X.Y.Z`. |
| [apps/ehr/CHANGELOG.md](apps/ehr/CHANGELOG.md) | `@careconnect/ehr` — the staff EHR frontend. Tags `@careconnect/ehr@X.Y.Z`. |
| [apps/portal/CHANGELOG.md](apps/portal/CHANGELOG.md) | `@careconnect/portal` — the patient portal frontend. Tags `@careconnect/portal@X.Y.Z`. |
| [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md) | `@careconnect/design-system` — the component library. Tags `@careconnect/design-system@X.Y.Z`. |
| `packages/{types,api-client,mock-data}/CHANGELOG.md` | Shared packages; versioned independently but not released on their own — their bumps show up as dependency updates in the units above. |

Every unit versions independently; each `@careconnect/<name>@X.Y.Z` git tag
has a matching GitHub Release for the four release units. Before the
independent-versioning change, `api`, `ehr`, `portal` and the shared packages
shared one version (`v1.0.0`–`v1.0.2`), which is why their early changelog
sections move in lockstep.

See [docs/RELEASE.md](docs/RELEASE.md) for how releases are cut.

---

## Pre-monorepo history (frozen)

The entries below are from the EMR demo repository before it was merged with
the design system into this monorepo at `v1.0.0`. They are kept for reference
and are **not updated** — names like `@careconnect/billing` and `packages/ui`
refer to the layout at that time (billing has since been folded into the EHR
app as a role-gated section, and the UI library is now
`packages/design-system`). This section follows the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [0.3.0] - 2026-08-21

### Added

- Authenticated patient Portal (login, API scoping for patient users)
- Agent/release docs (`AGENTS.md`, Changesets CI/release, Cloudflare Tunnel notes)

### Changed

- Staff login UX (redirect after login, clearer API errors)
- Installer fixes (`CONFIG_DIR` when sourcing deploy config)

### Fixed

- Storybook build (`packages/ui/public` assets tracked in git)

## [0.2.0] - 2026-08-21

### Added

- **Billing app** (`@careconnect/billing`) — claims, ERAs, charge items, and patient AR
- **API modules** — billing, fax, AI scribe, WebRTC telemed signaling, walk-in appointments, lab inbox, expanded reports
- **EHR** — Fax page, unsolicited lab inbox, AI scribe on encounters, questionnaire builder in admin
- **Portal** — Walk-in registration, WebRTC telemed video
- **Deployment** — Ubuntu installer with systemd + nginx, remote SSH install, local dev setup (`--local`), billing in nginx templates
- **Documentation** — README architecture/demo accounts, `deploy/DEPLOYMENT.md`
- **Release tooling** — Changesets, CI workflow, release workflow, `docs/RELEASE.md`

### Changed

- API `/health` reads version from package metadata (unified monorepo version)
- `@careconnect/types` compiled to JavaScript for production API runtime
