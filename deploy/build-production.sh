#!/usr/bin/env bash
#
# CareConnect production build.
#
#   deploy/build-production.sh [config-file] [unit]
#
#   unit   api | ehr | portal | all (default: all)
#
# Used by install.sh / update.sh on Ubuntu VMs (all units, from source) and by
# package-artifact.sh (one unit at a time, for CI). The config file supplies
# DEPLOY_MODE, which the frontends bake into their bundles as VITE_*_BASE.
#
# Set SKIP_INSTALL=true when node_modules is already installed (CI).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

_ENV_DEPLOY_MODE="${DEPLOY_MODE:-}"

# shellcheck source=deploy/careconnect.env.example
source "${1:-${SCRIPT_DIR}/careconnect.env.example}"
UNIT="${2:-all}"

[[ -n "${_ENV_DEPLOY_MODE}" ]] && DEPLOY_MODE="${_ENV_DEPLOY_MODE}"

case "${UNIT}" in
  api|ehr|portal|all) ;;
  *) echo "ERROR: unknown unit '${UNIT}' (expected api, ehr, portal or all)" >&2; exit 1 ;;
esac

cd "${PROJECT_ROOT}"

export CI=true

if [[ "${DEPLOY_MODE}" == "path" ]]; then
  export VITE_EHR_BASE="${EHR_BASE_PATH:-/ehr/}"
  export VITE_PORTAL_BASE="${PORTAL_BASE_PATH:-/}"
else
  export VITE_EHR_BASE="/"
  export VITE_PORTAL_BASE="/"
fi

if [[ ! -f package-lock.json ]]; then
  echo "ERROR: package-lock.json missing — run npm install locally and commit the lockfile." >&2
  exit 1
fi

if [[ "${SKIP_INSTALL:-false}" != "true" ]]; then
  echo "==> Installing npm dependencies (including dev, for build)..."
  # The root postinstall downloads a Playwright browser for the test suites.
  # This path builds production assets -- on a VM it runs as the service user
  # with HOME under the install dir -- and never runs those suites, so skip it.
  CARECONNECT_SKIP_PLAYWRIGHT_BROWSERS=1 npm ci --include=dev
fi

# turbo builds each unit's workspace dependencies first (types, design system).
if [[ "${UNIT}" == "all" ]]; then
  echo "==> Building every deployable unit (types + design-system -> api/ehr/portal, via turbo)..."
  echo "    EHR base: ${VITE_EHR_BASE} · Portal base: ${VITE_PORTAL_BASE}"
  # Only what ships to a VM: the mobile app (portal-mobile) is released as a
  # tag and its Storybook build, never deployed here.
  NODE_ENV=production npx turbo run build \
    --filter=@careconnect/api --filter=@careconnect/ehr --filter=@careconnect/portal
  EXPECTED=(
    packages/types/dist/index.js
    packages/design-system/dist/index.js
    apps/api/dist/index.js
    apps/ehr/dist/index.html
    apps/portal/dist/index.html
  )
else
  echo "==> Building @careconnect/${UNIT} (and its workspace dependencies, via turbo)..."
  [[ "${UNIT}" == "api" ]] || echo "    EHR base: ${VITE_EHR_BASE} · Portal base: ${VITE_PORTAL_BASE}"
  NODE_ENV=production npx turbo run build --filter="@careconnect/${UNIT}"
  case "${UNIT}" in
    api) EXPECTED=(packages/types/dist/index.js apps/api/dist/index.js) ;;
    ehr) EXPECTED=(packages/design-system/dist/index.js apps/ehr/dist/index.html) ;;
    portal) EXPECTED=(packages/design-system/dist/index.js apps/portal/dist/index.html) ;;
  esac
fi

for artifact in "${EXPECTED[@]}"; do
  [[ -f "${artifact}" ]] || { echo "ERROR: Build artifact missing: ${artifact}" >&2; exit 1; }
done

# On-VM source installs (unit=all) run from this tree, so strip dev deps to
# the production runtime. Single-unit builds are for packaging: the API
# artifact gets its own production node_modules from package-artifact.sh, and
# the checkout keeps its dev tools (CI runs the smoke tests right after).
if [[ "${UNIT}" == "all" ]]; then
  echo "==> Pruning devDependencies (keep production runtime only)..."
  npm prune --omit=dev
fi

echo "==> Build complete (${UNIT})."
[[ "${UNIT}" == "api" || "${UNIT}" == "all" ]] && echo "    API:       ${PROJECT_ROOT}/apps/api/dist"
[[ "${UNIT}" == "ehr" || "${UNIT}" == "all" ]] && echo "    EHR:       ${PROJECT_ROOT}/apps/ehr/dist"
[[ "${UNIT}" == "portal" || "${UNIT}" == "all" ]] && echo "    Portal:    ${PROJECT_ROOT}/apps/portal/dist"
exit 0
