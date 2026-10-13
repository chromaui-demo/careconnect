# CareConnect Deployment Guide

This guide covers running CareConnect locally for development, installing it on an Ubuntu VM (directly or over SSH), and updating a running installation.

> **Two things to know before you start.**
>
> 1. **Every deploy command takes a per-environment config file.** Pass `--config deploy/<environment>.env`, where the file holds that environment's domain, install mode, ports, and SSH target. These files are gitignored and never committed, so this guide uses placeholders (`<environment>`, `<vm-ip>`, `<ssh-user>`, `example.com`) rather than real values. Create yours from [`careconnect.env.example`](careconnect.env.example) before running anything below, and keep real hostnames, addresses, and usernames out of documentation and commit messages.
> 2. **Units deploy separately.** The API, EHR, and Portal are independent release units with their own versions and build artifacts. The normal way to put a release on a VM is the **Deploy** GitHub workflow, one unit per run (see [docs/RELEASE.md](../docs/RELEASE.md)). The commands in this guide are the manual equivalents: a fresh VM is installed from source with every unit at once (`--build-from-source`); after that, units ship one at a time as CI-built artifacts.

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Deploys (Staging → Production)](#automated-deploys-staging--production)
3. [Prerequisites](#prerequisites)
4. [Local Development](#local-development)
5. [Remote Deployment (SSH)](#remote-deployment-ssh)
6. [On-VM Installation](#on-vm-installation)
7. [Install Modes & URLs](#install-modes--urls)
8. [Configuration Reference](#configuration-reference)
9. [Updates](#updates)
10. [Artifact-Based Deploys (CI)](#artifact-based-deploys-ci)
11. [Service Management](#service-management)
12. [SSL (Let's Encrypt)](#ssl-lets-encrypt)
13. [Uninstall](#uninstall)
14. [Troubleshooting](#troubleshooting)
15. [Quick Reference](#quick-reference)

---

## Overview

| Script | Runs on | Requires sudo | Purpose |
|---|---|---|---|
| `deploy/install.sh --local` | Your Mac or Linux machine | No | Installs dev dependencies, builds types, design system, and API, and writes the API env file and start script |
| `deploy/remote-install.sh --build-from-source` | Your laptop | No (the VM side uses sudo) | Ships your checkout to the VM and runs the full source install or rebuild there for every unit. Required for a fresh VM. |
| `deploy/remote-install.sh --unit <api\|ehr\|portal\|all>` | Your laptop | No | On an installed VM, downloads the latest CI-built artifact for each unit and deploys it (`fetch-ci-artifact.sh` plus `remote-deploy.sh`). Requires an authenticated `gh` CLI. |
| `deploy/remote-deploy.sh <artifact>` · `remote-rollback.sh <unit>` | Your laptop or CI | No | Ship one artifact to a VM and deploy it, or roll one unit back |
| `deploy/install.sh` | Ubuntu VM | **Yes** | Full production install; builds every unit from source |
| `deploy/update.sh` | Ubuntu VM | **Yes** | Rebuild every unit from source and redeploy in place |
| `deploy/deploy-artifact.sh <artifact>` · `rollback.sh <unit>` | Ubuntu VM | **Yes** | Deploy or roll back one unit; used by CI and by the `remote-*` wrappers |
| `deploy/uninstall.sh` | Ubuntu VM | **Yes** | Remove CareConnect |

Do not run `sudo deploy/install.sh` on macOS. It uses `apt-get`, nginx, and systemd, none of which exist there. On macOS, use `--local` or `remote-install.sh`.

**Release units.** The API, EHR, and Portal deploy independently. Each has its own version, its own artifact (`careconnect-<unit>-<version>-<sha>.tar.gz`), and its own deploy run, so shipping a portal fix never restarts the API. On the VM, the API lives in `/opt/careconnect` behind systemd. Each frontend lives in `${WWW_ROOT}/releases/<app>/<release-id>` behind a symlink (`${WWW_ROOT}/ehr`, `${WWW_ROOT}/portal`) that nginx serves, so a frontend deploy is an atomic symlink swap and a rollback is the same swap in reverse.

**Component library.** The shared UI components live in this repository at `packages/design-system`. `build-production.sh` builds the library before the frontends (Turborepo orders this through `dependsOn`), and Vite inlines it into each app bundle. There is no separate library artifact to deploy and no registry credentials to configure.

### Production layout (Ubuntu VM)

On a production VM, nginx serves the static frontend builds and proxies `/api/` to the API, which runs as the `careconnect-api` systemd service and restarts on reboot.

| Path on VM | Purpose |
|---|---|
| `/opt/careconnect` | Application source, `node_modules`, and the built API |
| `/var/www/careconnect` | Static frontend builds (portal, ehr), one release directory per deploy behind a symlink |
| `/var/lib/careconnect` | SQLite database (`careconnect.db`) |
| `/etc/careconnect/careconnect.env` | Deploy configuration (domain, mode, ports) |
| `/etc/careconnect/careconnect-api.env` | API runtime secrets (JWT secret, data directory) |

In production the frontends are served on ports 80, 443, or 8080 depending on the install mode; see [Install Modes & URLs](#install-modes--urls).

---

## Automated Deploys (Staging → Production)

Releases normally reach the VMs without anyone running a script. When a **Version Packages** pull request merges, the release workflow dispatches the **Deploy** workflow ([`deploy.yml`](../.github/workflows/deploy.yml)) once for every deployable unit that received a new version. Each run handles one unit:

1. **Staging.** Build the unit's artifact from the tag with the staging config, ship it to the staging VM, and run the full Playwright end-to-end suite against it.
2. **The gate.** If every test passes, production deploys automatically. If a test fails (after one retry), staging is rolled back, production is not touched, and the run stays red until someone fixes the regression and releases again, or re-runs it after an environmental failure.
3. **Production.** The same steps with the production config, followed by only the read-only `@smoke` tests, with the same rollback on failure.

There is no production-only deploy: every production deploy follows a green staging run of the same ref. Because units deploy independently, a portal release never restarts the API. Deploys of the same unit are serialized; different units deploy in parallel. To redeploy any tag by hand, use **Actions → Deploy → Run workflow** or `gh workflow run deploy.yml -f unit=<unit> -f ref=@careconnect/<unit>@X.Y.Z`.

The README shows three deploy badges. **Deploy** is the result of the latest staging → production run. **Staging** and **Production** are the result of the latest deploy to that environment, whichever unit it was; their run lists name the unit and ref of each deploy.

What the end-to-end suite covers, and how its snapshots reach Chromatic, is in [docs/TESTING.md](../docs/TESTING.md#end-to-end-tests-playwright). The workflow internals, GitHub Environments, and secrets are in [docs/RELEASE.md § Deploy pipeline](../docs/RELEASE.md#deploy-pipeline-per-unit).

---

## Prerequisites

### Local development (Mac or Linux)

- Node.js **24**, the version in the repository's [`.nvmrc`](../.nvmrc) (`nvm use`). CI uses the same file. Versions older than 22.22 fail the design-system tests.
- npm 10 or later
- `openssl` (usually preinstalled)

### Production VM (Ubuntu 22.04 or later recommended)

- Ubuntu or Debian with `apt-get`. The installer adds Node.js `NODE_MAJOR` (default 22), which is enough to build and run; the Node 24 requirement above applies only to the local test toolchain.
- Root or sudo access
- At least 2 GB of RAM for `npm ci` and the builds
- Open ports: HTTP on 80 or a custom port such as 8080; the API listens on 5000 on localhost only
- DNS A records, if you plan to use subdomain mode

### Remote deployment from a laptop

- SSH access to the VM as `<ssh-user>@<vm-ip>`, with sudo rights on the VM
- `rsync` and `ssh` on your laptop
- Optionally, an SSH key installed on the VM; run `./deploy/setup-ssh-key.sh` once

---

## Local Development

### Automated setup

```bash
cd careconnect
deploy/install.sh --local
```

The installer:

1. Runs `npm ci --include=dev`.
2. Builds `@careconnect/types`, `@careconnect/design-system`, and the API. The EHR and Portal dev servers import the design system's `dist/`, so it must exist before they start.
3. Writes `deploy/runtime/careconnect-api.env` with a JWT secret and database path.
4. Creates `deploy/start-local.sh`.

### Start all services

```bash
./deploy/start-local.sh
```

| Service | URL |
|---|---|
| API | http://localhost:5000 |
| EHR | http://localhost:4000 |
| Portal | http://localhost:4001 |

Sign in to the EHR as `admin@se-tools.net` with the local development password from `apps/api/src/db/seeded-password.ts`. For the Billing section, use `billing@se-tools.net` for full access or `manager@se-tools.net` for read-only access; both share the same password.

Press `Ctrl+C` to stop all dev servers.

### Optional config file

```bash
deploy/install.sh --local --config deploy/<environment>.env
```

The config file is sourced for reference only. The dev servers always use the Vite default ports listed above.

### Manual start (one terminal per service)

```bash
set -a && source deploy/runtime/careconnect-api.env && set +a
npm run api:dev
npm run ehr:dev
npm run portal:dev
```

These per-app scripts bypass Turborepo. After editing a design-system component, run `npm run ds:build` (or iterate in `npm run storybook`); after editing `@careconnect/types`, run `npm run build --workspace=@careconnect/types`.

### Local paths

| Item | Path |
|---|---|
| SQLite database | `./data/careconnect.db` |
| API env file | `deploy/runtime/careconnect-api.env` |
| JWT secret | Stored in the API env file, which is gitignored |

---

## Remote Deployment (SSH)

This is the recommended path when the Ubuntu VM already exists. Run it from your laptop, not on the VM:

```bash
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
```

The SSH target (`VM_USER`, `VM_HOST`, and optionally `VM_PORT` and `SSH_KEY`) is read from the config file or from the environment; environment values take precedence. There are no built-in defaults, and the script refuses to run without a target.

### What the script does

1. Tests the SSH connection to `<ssh-user>@<vm-ip>`.
2. Checks whether CareConnect is already installed on the VM.
3. Chooses one of two paths:
   - **With `--build-from-source`, or when CareConnect is not yet installed:** transfers the project over a tar-and-ssh pipe and runs the full `deploy/install.sh --config deploy/<environment>.env` on the VM. This builds types, the design system, and every app from source and takes several minutes.
   - **Already installed, no flag:** for each unit selected by `--unit` (default `all`: api, ehr, portal), downloads the latest artifact the Deploy workflow built for that unit and environment using `deploy/fetch-ci-artifact.sh`, then ships it with `deploy/remote-deploy.sh`, which runs `deploy-artifact.sh` on the VM. This is the same deploy CI performs, so it cannot drift from what CI validated. It requires the `gh` CLI, authenticated with `gh auth login`. See [Artifact-Based Deploys](#artifact-based-deploys-ci).
4. Prints the resulting URLs.

### SSH target variables

Set these in `deploy/<environment>.env` (see the `VM_*` block in `careconnect.env.example`) or export them in your shell. Exported values win.

| Variable | Default | Description |
|---|---|---|
| `VM_USER` | (required) | SSH username |
| `VM_HOST` | (required) | VM IP address or hostname |
| `VM_PORT` | `22` | SSH port |
| `SSH_KEY` | (none) | Path to a private key |

Examples:

```bash
# Everything (SSH target and deploy layout) from the config file
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Override the SSH target and key from the environment
VM_USER=<ssh-user> VM_HOST=<vm-ip> SSH_KEY=~/.ssh/id_ed25519 \
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Lab VM in path mode on its IP address, with no config file
VM_USER=<ssh-user> VM_HOST=<vm-ip> \
  ./deploy/remote-install.sh --build-from-source --mode path --domain <vm-ip>
```

### SSH key setup (one time)

```bash
VM_USER=<ssh-user> VM_HOST=<vm-ip> ./deploy/setup-ssh-key.sh
# or: ssh-copy-id -i ~/.ssh/id_ed25519.pub <ssh-user>@<vm-ip>
```

---

## On-VM Installation

If you are already logged in to the Ubuntu VM:

```bash
git clone https://github.com/chromaui-demo/careconnect.git
cd careconnect
sudo deploy/install.sh --config deploy/<environment>.env
```

Alternatively, copy the repository to the VM with `rsync` or `scp` and run the same command.

### What the production installer does

1. Installs Node.js 22, nginx, curl, openssl, rsync, and ufw.
2. Creates the `careconnect` system user.
3. Syncs the application to `/opt/careconnect`.
4. Runs `npm ci` and `npm run build`. Turborepo builds `@careconnect/types` and the design system first, then the API, EHR, and Portal. Dev dependencies are pruned afterwards.
5. Publishes each frontend to `/var/www/careconnect/releases/{portal,ehr}/<release-id>` and points the `/var/www/careconnect/{portal,ehr}` symlinks, which nginx serves, at them.
6. Writes `/etc/careconnect/careconnect.env` and `careconnect-api.env`.
7. Enables and starts the `careconnect-api` and `nginx` systemd services.
8. Configures nginx and the firewall.
9. Waits for the API health check (`GET /health`) to pass.
10. Runs Let's Encrypt if `--ssl` was given.

Both services are enabled at boot and survive a VM restart.

---

## Install Modes & URLs

Set `DEPLOY_MODE` in your env file or pass the equivalent CLI flags.

### Subdomain mode (`DEPLOY_MODE=subdomain`)

Each app gets its own hostname, and nginx routes by `server_name`. With `DOMAIN=example.com`, `PORTAL_HOST=portal`, and `EHR_HOST=ehr`:

| App | URL (port from `PORTAL_PORT` / `EHR_PORT`; shown with 80) |
|---|---|
| Portal | http://portal.example.com |
| EHR | http://ehr.example.com |

For DNS, create an A record for each subdomain pointing at the VM, or place a tunnel or reverse proxy in front of the VM (see below).

To test locally without DNS, add an entry to `/etc/hosts`:

```
<vm-ip>  portal.example.com ehr.example.com
```

### Behind a tunnel or reverse proxy (Cloudflare Tunnel example)

Subdomain mode also works when TLS terminates in front of the VM, whether through a Cloudflare Tunnel or any reverse proxy that forwards to nginx. In that layout nginx listens on plain HTTP on an unprivileged port (say `8080`, set via `PORTAL_PORT` and `EHR_PORT`), and `ENABLE_SSL=false` is correct because the proxy owns the certificate.

```
Browser ──HTTPS──► proxy / tunnel ──HTTP──► nginx :8080 ──► /api/ ──► Node API :5000
```

Send every CareConnect hostname to the same local nginx port. nginx routes by the `Host` header (`ehr.<domain>`, `portal.<domain>`).

Example `/etc/cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: portal.example.com
    service: http://127.0.0.1:8080
  - hostname: ehr.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Two configurations to avoid:

- Routing `/api/*` (or an entire hostname) to some other backend on the VM. The UI loads, but staff login returns 401.
- Pointing the proxy directly at the API on `127.0.0.1:5000`. Go through nginx so that the `Host` header, static files, and the `/api/` prefix are handled correctly.

If you use a Cloudflare Tunnel, in the Cloudflare dashboard:

- DNS: point each subdomain at `<tunnel-id>.cfargotunnel.com` with a proxied CNAME.
- SSL/TLS mode: **Full** or **Full (strict)** both work with cloudflared.
- Optionally, add a cache rule that bypasses the cache for `/api/*`.

Verify from the VM, using the same path the proxy takes:

```bash
curl -s http://127.0.0.1:8080/api/health -H 'Host: ehr.example.com'
curl -s -X POST http://127.0.0.1:8080/api/auth/login -H 'Host: ehr.example.com' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

Once the proxy and DNS are correct, the public URLs are `https://portal.<domain>` and `https://ehr.<domain>`, with no port in the browser.

After changing tunnel ingress rules, run `sudo systemctl restart cloudflared` (or restart your proxy's unit).

### Path mode (`DEPLOY_MODE=path`)

A single domain or IP address with path-based routing. Best for lab VMs without DNS.

| App | URL |
|---|---|
| Portal | http://\<vm-ip\>/ |
| EHR | http://\<vm-ip\>/ehr/ |

### Ports mode (`DEPLOY_MODE=ports`)

Each app on its own port. This mode is legacy.

| App | Default port |
|---|---|
| Portal | 8080 |
| EHR | 8081 |

In every mode, nginx proxies `/api/` to `http://127.0.0.1:5000`.

---

## Configuration Reference

### Main config: `/etc/careconnect/careconnect.env`

Copied from your `--config` file (`deploy/<environment>.env`) at install time.

| Variable | Description |
|---|---|
| `DOMAIN` | Primary domain or VM IP address |
| `DEPLOY_MODE` | `path`, `subdomain`, or `ports` |
| `PORTAL_HOST`, `EHR_HOST` | Subdomain prefixes |
| `PORTAL_PORT`, `EHR_PORT`, … | HTTP listen ports |
| `ENABLE_SSL` | `true` to run certbot (subdomain mode only) |
| `SSL_EMAIL` | Let's Encrypt contact email |
| `NODE_MAJOR` | Node.js major version to install (default 22) |
| `INSTALL_DIR` | `/opt/careconnect` |
| `WWW_ROOT` | `/var/www/careconnect`. Frontends are served from the `${WWW_ROOT}/{ehr,portal}` symlinks into `${WWW_ROOT}/releases/` |
| `RELEASE_RETENTION` | How many past releases, artifacts, and backups to keep per unit for rollback (default 5) |
| `VM_USER`, `VM_HOST`, `VM_PORT`, `SSH_KEY` | SSH target for `remote-install.sh` and `setup-ssh-key.sh`; used on the laptop only and ignored on the VM |

See [`careconnect.env.example`](careconnect.env.example) for the full list.

### API runtime: `/etc/careconnect/careconnect-api.env`

| Variable | Description |
|---|---|
| `PORT` | API listen port (5000) |
| `CARECONNECT_DATA_DIR` | SQLite directory (`/var/lib/careconnect`) |
| `JWT_SECRET` | Generated automatically on first install |
| `NODE_ENV` | `production` |

Never commit this file. If `JWT_SECRET` is compromised, rotate it; doing so invalidates all existing staff sessions.

---

## Updates

Releases are deployed automatically, one unit at a time, by the **Deploy** workflow described in [docs/RELEASE.md](../docs/RELEASE.md). The commands below do the same thing by hand, and are also the way to update VMs that CI cannot reach.

### Deploy a release of one unit (recommended)

From **Actions → Deploy → Run workflow**, or from the command line:

```bash
gh workflow run deploy.yml -f unit=portal -f ref=@careconnect/portal@1.3.0
```

To ship the latest CI-built artifact of one unit, or of every unit with the API first, from your laptop to an installed VM:

```bash
git fetch --tags && git checkout @careconnect/portal@1.3.0
./deploy/remote-install.sh --unit portal --config deploy/<environment>.env
./deploy/remote-install.sh --unit all    --config deploy/<environment>.env
```

A few details:

- The script needs an authenticated `gh` CLI (`gh auth login`). It downloads the newest artifact the Deploy workflow built for that unit and environment (`--environment staging|production`, default `production`) and deploys it in seconds.
- `fetch-ci-artifact.sh` refuses an artifact built from a commit other than your local `HEAD`, which is why the example checks out the tag first. Set `ALLOW_STALE=true` to override.
- `--unit all` deploys the API, then the EHR, then the Portal.

### Rebuild every unit from source on the VM

Use this for VMs that were installed from source, or to try local changes that have not been pushed yet:

```bash
# On the VM
cd /opt/careconnect && sudo -u careconnect git pull        # or rsync new code in
sudo /opt/careconnect/deploy/update.sh

# From your laptop (ships your working tree)
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
```

`update.sh` runs `deploy/build-production.sh … all` (`npm ci`, a Turborepo build of every workspace, and a prune of dev dependencies), publishes both frontends as a new `source-<sha>` release, restarts `careconnect-api`, reloads nginx, and checks API health. The laptop variant ships whatever is in your working tree and does the same on the VM, which takes several minutes. It is required for a fresh VM; otherwise prefer the artifact path so the VM runs exactly what CI validated.

If sudo on the VM requires a password, you are prompted once. The CI deploy user needs passwordless sudo.

### What updates preserve

- SQLite data in `/var/lib/careconnect` (patients, appointments, and so on)
- `JWT_SECRET` in `careconnect-api.env`, unless you delete it
- `/etc/careconnect/careconnect.env`, which is refreshed from your config file on reinstall

### Database migrations

Schema changes run automatically when the API starts, through `migrateModules()`. Local and manual deployments (`update.sh`, `remote-install.sh --build-from-source`, `install.sh`) need no separate migration step.

The artifact deploy path (`deploy-artifact.sh`, below) additionally runs migrations as an explicit, abortable pre-flight step before the service restarts, rather than relying on boot-time migration alone. This is the path staging and production deploys use.

---

## Artifact-Based Deploys (CI)

Each unit is built once into a versioned tarball, the artifact, and that same artifact is shipped unchanged to the target VM rather than rebuilt from source there. The Deploy workflow uses this path for staging and production, and `remote-install.sh --unit …` uses it for an already-installed VM, so a hand-triggered redeploy and the automated pipeline cannot disagree about what is running.

| Script | Runs on | Purpose |
|---|---|---|
| `deploy/package-artifact.sh --unit <u> [--config <file>] [--out <dir>]` | Build machine or CI | Build one unit and package it as `careconnect-<unit>-<version>-<sha>.tar.gz` |
| `deploy/remote-deploy.sh [--config <file>] <artifact>` | Your laptop or CI | Copy an artifact to the VM and run `deploy-artifact.sh` there |
| `deploy/remote-rollback.sh [--config <file>] <unit> [...]` | Your laptop or CI | Run `rollback.sh` on the VM |
| `deploy/fetch-ci-artifact.sh --unit <u> [--environment <e>]` | Your laptop | Download the latest artifact the Deploy workflow built for that unit and environment; requires an authenticated `gh` |
| `deploy/deploy-artifact.sh <artifact> [config-file]` | Ubuntu VM, as root | Deploy one artifact; reads its unit from `MANIFEST.json` |
| `deploy/rollback.sh <unit> [...] [--config <file>]` | Ubuntu VM, as root | Roll one unit back to its previous release |

### `package-artifact.sh`

```bash
deploy/package-artifact.sh --unit api
deploy/package-artifact.sh --unit ehr --config deploy/<environment>.env
```

Builds one unit through `build-production.sh <config> <unit>`, which builds the unit's workspace dependencies first, then packages it. The tarball's path is the last line of output, so callers can capture it directly.

| Unit | Artifact contents |
|---|---|
| `api` | `apps/api/{package.json,dist/}`, `packages/types/{package.json,dist/}`, the root `package.json` and lockfile, production `node_modules/`, and `deploy/` |
| `ehr` / `portal` | `apps/<unit>/dist/` and `deploy/` |

Every artifact carries `deploy/` (scripts only, never `*.env` files) so the VM runs the deploy scripts that match the artifact.

The config file is required for the frontends because `DEPLOY_MODE` is baked into the JavaScript bundle (`VITE_EHR_BASE` and `VITE_PORTAL_BASE`). An artifact built for one layout must not be deployed to an environment using another; `MANIFEST.json` records `deployMode`, and `deploy-artifact.sh` refuses a mismatch. The API bakes nothing in and needs no config to build, though CI still builds it per environment to keep the pipeline uniform.

### `deploy-artifact.sh`

```bash
sudo deploy/deploy-artifact.sh <artifact-tarball> [config-file]
```

Reads the unit from the manifest and then:

- **api:** stops `careconnect-api`, backs up the database, syncs only the API's paths into `/opt/careconnect` (`apps/api`, `packages/types`, `node_modules`, and the root manifests; nothing else is touched), runs migrations, starts the service, health-checks it, and prunes old backups. If migrations fail, the pre-deploy backup is restored and `careconnect-api` is left stopped so it does not crash-loop on the broken code. `sudo deploy/rollback.sh api` recovers from this state.
- **ehr / portal:** copies the bundle to `${WWW_ROOT}/releases/<app>/<version>-<sha>/`, atomically re-points `${WWW_ROOT}/<app>` at it, and reloads nginx. The previous release is kept, and older ones are pruned down to `RELEASE_RETENTION` (default 5).

Each deploy records what it did in `${CARECONNECT_DATA_DIR}/artifacts/<unit>/current`, keeping the artifact, the previous artifact, and (for the API) the pre-deploy database backup alongside. That record is what makes argument-free rollback possible.

### `rollback.sh`

```bash
sudo deploy/rollback.sh api                                   # previous artifact plus the DB backup taken before it was replaced
sudo deploy/rollback.sh api <artifact-tarball> <db-backup>    # explicit
sudo deploy/rollback.sh ehr                                   # previous release directory
sudo deploy/rollback.sh portal <release-id>                   # any kept release (ls ${WWW_ROOT}/releases/portal)
```

For the **API**, rollback first takes a fresh backup of the current database, so the rollback is itself reversible, then restores the given backup, syncs the previous artifact's code, restarts the service, and health-checks it. Migrations are not re-run: the restored backup already matches the restored code's schema.

For the **EHR and Portal**, rollback is a symlink swap and an nginx reload. It is instant and involves no rebuild.

The Deploy workflow runs the same rollback automatically when the end-to-end tests fail after a deploy.

---

## Service Management

```bash
# Status
systemctl status careconnect-api nginx

# Live logs
journalctl -u careconnect-api -f
journalctl -u nginx -f

# Restart
sudo systemctl restart careconnect-api
sudo systemctl reload nginx

# Confirm both are enabled at boot
systemctl is-enabled careconnect-api nginx
```

### Health check

```bash
curl http://127.0.0.1:5000/health
# {"status":"ok","service":"careconnect-api","version":"1.0.2"}   # version comes from apps/api/package.json
```

### After a VM reboot

Both services start automatically. To confirm:

```bash
systemctl status careconnect-api nginx
curl -s http://127.0.0.1:5000/health
```

---

## SSL (Let's Encrypt)

Requires subdomain mode and public DNS pointing at the VM.

```bash
sudo deploy/install.sh --config deploy/<environment>.env --ssl --email <you@example.com>
```

Alternatively, set `ENABLE_SSL="true"` in your env file before installing.

Certbot requests certificates for `portal.{DOMAIN}` and `ehr.{DOMAIN}`.

---

## Uninstall

On the VM:

```bash
sudo /opt/careconnect/deploy/uninstall.sh
```

This removes:

- `/opt/careconnect`
- `/var/www/careconnect`
- `/etc/careconnect`
- `/var/lib/careconnect`, including the database
- the `careconnect-api` systemd unit

nginx stays installed, and its default site is restored.

---

## Troubleshooting

### `apt-get: command not found` on a Mac

You ran the production installer locally. Use one of these instead:

```bash
deploy/install.sh --local
# or
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
```

### API health check fails after install

```bash
journalctl -u careconnect-api -n 80 --no-pager
ls -la /opt/careconnect/apps/api/dist/
ls -la /var/lib/careconnect/
```

The usual causes are a Node version mismatch, a failed build, or permissions on the data directory.

### nginx returns 502 or a blank page

```bash
sudo nginx -t
systemctl status nginx
curl http://127.0.0.1:5000/health
ls -l /var/www/careconnect/portal          # symlink to releases/portal/<release-id>
ls /var/www/careconnect/portal/index.html
```

### Staff login fails (401, no error, or a silent return)

CareConnect expects `POST /api/auth/login` to reach the Node.js API (`careconnect-api`). If the API logs show no login attempt, or a different service answers on port 5000, traffic is reaching something other than `careconnect-api`. This is usually another service that was already bound to port 5000, or a proxy or tunnel ingress that routes `/api/*` (or the whole host) somewhere other than nginx.

On the VM:

```bash
# Must return: {"status":"ok","service":"careconnect-api",...}
curl -s http://127.0.0.1:5000/health
curl -s http://127.0.0.1:5000/api/health

systemctl status careconnect-api
journalctl -u careconnect-api -n 30 --no-pager

# See what owns port 5000
ss -tlnp | grep ':5000'
```

If `/health` does not include `"careconnect-api"`, stop the conflicting service on port 5000, then:

```bash
sudo systemctl restart careconnect-api
```

From outside, through nginx or your proxy:

```bash
curl -s http://ehr.example.com/api/health
curl -s -X POST http://ehr.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

Also worth knowing:

- Seeded accounts use the environment's `SEEDED_PASSWORD`, from `/etc/careconnect/careconnect-api.env` on the VM.
- After fixing the routing, redeploy the UI with `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env`.
- If the JWT secret changed, existing tokens are invalid; sign in again.

### Subdomain URLs do not resolve

- Confirm the DNS A records or `/etc/hosts` entries.
- Confirm the nginx `server_name` matches your hostname.
- Check the port: `PORTAL_PORT` and `EHR_PORT` in your config versus the default 80.

### `DOMAIN: unbound variable` after a remote install

This was a bug in an older `remote-install.sh`. Update your local checkout and re-run if needed; the VM install itself succeeded.

### Rebuild without a full reinstall

```bash
sudo /opt/careconnect/deploy/update.sh
```

---

## Quick Reference

| Task | Command |
|---|---|
| Local dev setup | `deploy/install.sh --local` |
| Start local dev | `./deploy/start-local.sh` |
| Rebuild the design system for the dev servers | `npm run ds:build` |
| Fresh install on a VM from your laptop | `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env` |
| Redeploy one unit's CI artifact | `./deploy/remote-install.sh --unit portal --config deploy/<environment>.env` |
| Deploy a release through CI | `gh workflow run deploy.yml -f unit=<unit> -f ref=@careconnect/<unit>@X.Y.Z` |
| Roll one unit back | `sudo /opt/careconnect/deploy/rollback.sh <unit>` on the VM, or `./deploy/remote-rollback.sh --config … <unit>` from a laptop |
| Install on the VM directly | `sudo deploy/install.sh --config deploy/<environment>.env` |
| Rebuild everything on the VM | `sudo /opt/careconnect/deploy/update.sh` |
| Release process | [docs/RELEASE.md](../docs/RELEASE.md) |
| Uninstall from the VM | `sudo /opt/careconnect/deploy/uninstall.sh` |
| API logs | `journalctl -u careconnect-api -f` |
| Staff login | `admin@se-tools.net` with the environment's `SEEDED_PASSWORD` (`/etc/careconnect/careconnect-api.env`) |
