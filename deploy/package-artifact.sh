#!/usr/bin/env bash
#
# deploy/package-artifact.sh — build ONE release unit and package it into a
# versioned tarball that CI ships, unchanged, through staging to production.
#
#   deploy/package-artifact.sh --unit <api|ehr|portal> [--config <file>] [--out <dir>]
#
#   --unit     Which unit to package (required). Each unit has its own version,
#              tag and deploy; see scripts/release-units.mjs.
#   --config   Environment config. Required for ehr/portal (DEPLOY_MODE is
#              baked into the bundle); ignored for api.
#   --out      Output directory (default: <repo>/artifacts)
#
# Prints the tarball path as the last line of output.
#
# Artifact layout (all relative to the tarball root, MANIFEST.json at the top):
#   api     package.json, package-lock.json, node_modules/ (production only,
#           installed from the lockfile), apps/api/{package.json,dist/},
#           packages/types/{package.json,dist/}, deploy/
#   ehr     apps/ehr/dist/, deploy/
#   portal  apps/portal/dist/, deploy/
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

UNIT=""
CONFIG_FILE=""
OUTPUT_DIR="${PROJECT_ROOT}/artifacts"

usage() { sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit) UNIT="$2"; shift 2 ;;
    --config) CONFIG_FILE="$2"; shift 2 ;;
    --out) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

case "${UNIT}" in
  api|ehr|portal) ;;
  "") echo "ERROR: --unit is required (api, ehr or portal)" >&2; exit 1 ;;
  *) echo "ERROR: unknown unit '${UNIT}' (expected api, ehr or portal)" >&2; exit 1 ;;
esac

if [[ "${UNIT}" != "api" ]]; then
  if [[ -z "${CONFIG_FILE}" || ! -f "${CONFIG_FILE}" ]]; then
    echo "ERROR: --config <file> is required for ${UNIT}: DEPLOY_MODE is baked into the frontend bundle." >&2
    exit 1
  fi
fi

case "${UNIT}" in
  api) PKG_DIR="apps/api" ;;
  ehr) PKG_DIR="apps/ehr" ;;
  portal) PKG_DIR="apps/portal" ;;
esac

echo "==> Building ${UNIT} (via build-production.sh)..."
bash "${SCRIPT_DIR}/build-production.sh" "${CONFIG_FILE:-${SCRIPT_DIR}/careconnect.env.example}" "${UNIT}"

DEPLOY_MODE_BAKED=""
if [[ -n "${CONFIG_FILE}" && "${UNIT}" != "api" ]]; then
  # build-production.sh sources the config in its own process; read it again
  # so DEPLOY_MODE is in scope for the manifest.
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
  DEPLOY_MODE_BAKED="${DEPLOY_MODE}"
fi

NAME="$(cd "${PROJECT_ROOT}" && node -p "require('./${PKG_DIR}/package.json').name")"
VERSION="$(cd "${PROJECT_ROOT}" && node -p "require('./${PKG_DIR}/package.json').version")"
GIT_SHA="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ARTIFACT_NAME="careconnect-${UNIT}-${VERSION}-${GIT_SHA}.tar.gz"

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "${STAGE_DIR}"' EXIT

echo "==> Staging ${UNIT} files..."
printf '{"unit":"%s","name":"%s","version":"%s","gitSha":"%s","builtAt":"%s","deployMode":"%s"}\n' \
  "${UNIT}" "${NAME}" "${VERSION}" "${GIT_SHA}" "${BUILT_AT}" "${DEPLOY_MODE_BAKED}" \
  > "${STAGE_DIR}/MANIFEST.json"

# Every artifact carries the deploy tooling so the VM runs the scripts that
# match the artifact, not whatever happened to be installed last.
mkdir -p "${STAGE_DIR}/deploy"
rsync -a --exclude='*.env' --exclude='/runtime' "${PROJECT_ROOT}/deploy/" "${STAGE_DIR}/deploy/"

case "${UNIT}" in
  api)
    mkdir -p "${STAGE_DIR}/apps/api" "${STAGE_DIR}/packages/types"
    cp "${PROJECT_ROOT}/package.json" "${PROJECT_ROOT}/package-lock.json" "${STAGE_DIR}/"
    cp "${PROJECT_ROOT}/apps/api/package.json" "${STAGE_DIR}/apps/api/"
    rsync -a "${PROJECT_ROOT}/apps/api/dist/" "${STAGE_DIR}/apps/api/dist/"
    cp "${PROJECT_ROOT}/packages/types/package.json" "${STAGE_DIR}/packages/types/"
    rsync -a "${PROJECT_ROOT}/packages/types/dist/" "${STAGE_DIR}/packages/types/dist/"
    # Production node_modules, installed from the lockfile into the staging
    # dir rather than by pruning the checkout — pruning would strip dev tools
    # (Playwright for the smoke tests) from the machine doing the packaging.
    # npm needs every workspace's package.json present to resolve the
    # lockfile; the resulting node_modules/@careconnect/* symlinks are
    # relative and survive tar. --workspace limits the install to the API's
    # own dependency tree, so other units' packages (React, React Native and
    # Expo for the mobile app) stay out of the server artifact.
    for manifest in "${PROJECT_ROOT}"/apps/*/package.json "${PROJECT_ROOT}"/packages/*/package.json; do
      rel="${manifest#"${PROJECT_ROOT}"/}"
      mkdir -p "${STAGE_DIR}/$(dirname "${rel}")"
      cp "${manifest}" "${STAGE_DIR}/${rel}"
    done
    echo "==> Installing production node_modules into the artifact..."
    (cd "${STAGE_DIR}" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --workspace=@careconnect/api)
    ;;
  ehr|portal)
    mkdir -p "${STAGE_DIR}/${PKG_DIR}"
    rsync -a "${PROJECT_ROOT}/${PKG_DIR}/dist/" "${STAGE_DIR}/${PKG_DIR}/dist/"
    ;;
esac

mkdir -p "${OUTPUT_DIR}"
echo "==> Packaging ${ARTIFACT_NAME}..."
tar -czf "${OUTPUT_DIR}/${ARTIFACT_NAME}" -C "${STAGE_DIR}" .

echo "${OUTPUT_DIR}/${ARTIFACT_NAME}"
