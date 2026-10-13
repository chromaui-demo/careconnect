#!/usr/bin/env bash
#
# deploy/fetch-ci-artifact.sh — download the most recent artifact the Deploy
# workflow built for one release unit and environment, so a manual redeploy
# (remote-install.sh / remote-deploy.sh) ships the exact build CI validated
# instead of rebuilding from source.
#
#   deploy/fetch-ci-artifact.sh --unit <api|ehr|portal> [--environment <staging|production>] [--out <dir>]
#
# Requires the GitHub CLI, authenticated with read access to this repo
# (https://cli.github.com → `gh auth login`).
#
# Prints the downloaded tarball's path as the last line of output, so callers
# can capture it directly: ARTIFACT="$(deploy/fetch-ci-artifact.sh --unit api)"
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

UNIT=""
ENVIRONMENT="production"
OUTPUT_DIR="${PROJECT_ROOT}/artifacts"
ALLOW_STALE="${ALLOW_STALE:-false}"

# All progress goes to stderr so stdout carries only the final artifact path.
log() { printf '==> %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --unit) UNIT="$2"; shift 2 ;;
    --environment) ENVIRONMENT="$2"; shift 2 ;;
    --out) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) sed -n '3,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown argument: $1 (see --help)" ;;
  esac
done

case "${UNIT}" in
  api|ehr|portal) ;;
  *) die "--unit must be api, ehr or portal" ;;
esac

command -v gh >/dev/null 2>&1 \
  || die "GitHub CLI (gh) is required: https://cli.github.com — then run: gh auth login"
gh auth status >/dev/null 2>&1 \
  || die "gh is not authenticated — run: gh auth login"

# Artifacts are uploaded by .github/workflows/deploy-environment.yml under a
# stable name per unit + environment; the API returns the newest first.
ARTIFACT_NAME="careconnect-${UNIT}-${ENVIRONMENT}"
log "Finding the latest '${ARTIFACT_NAME}' build artifact..."
INFO=$(gh api "repos/{owner}/{repo}/actions/artifacts?name=${ARTIFACT_NAME}&per_page=5" \
  --jq '[.artifacts[] | select(.expired == false)] | .[0] | "\(.id) \(.workflow_run.head_sha) \(.workflow_run.id)"')
[[ -n "${INFO}" && "${INFO}" != "null null null" ]] \
  || die "No '${ARTIFACT_NAME}' artifact found. Run the Deploy workflow for ${UNIT} first, or use remote-install.sh --build-from-source."

read -r ARTIFACT_ID RUN_SHA RUN_ID <<<"${INFO}"

mkdir -p "${OUTPUT_DIR}"
ZIP="${OUTPUT_DIR}/${ARTIFACT_NAME}.zip"
log "Downloading artifact ${ARTIFACT_ID} (run ${RUN_ID})..."
gh api "repos/{owner}/{repo}/actions/artifacts/${ARTIFACT_ID}/zip" > "${ZIP}"
unzip -oq "${ZIP}" -d "${OUTPUT_DIR}"
rm -f "${ZIP}"

ARTIFACT_FILE=$(ls -1t "${OUTPUT_DIR}"/careconnect-"${UNIT}"-*.tar.gz 2>/dev/null | head -n 1)
[[ -n "${ARTIFACT_FILE}" ]] || die "Download succeeded but no careconnect-${UNIT}-*.tar.gz found in ${OUTPUT_DIR}"

# The Deploy workflow checks out the *tag* it was given, so the run's head SHA
# (main at dispatch time) says nothing about what was built — the tarball name
# (careconnect-<unit>-<version>-<sha>.tar.gz) does.
BUILT_SHA=$(basename "${ARTIFACT_FILE}" .tar.gz | awk -F- '{print $NF}')
LOCAL_SHA=$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD)
if [[ "${BUILT_SHA}" != "${LOCAL_SHA}" ]]; then
  if [[ "${ALLOW_STALE}" != "true" ]]; then
    rm -f "${ARTIFACT_FILE}"
    die "Latest ${ARTIFACT_NAME} artifact was built from ${BUILT_SHA}, but your local checkout is at ${LOCAL_SHA}.
Check out that commit/tag and retry, or:
  ALLOW_STALE=true deploy/fetch-ci-artifact.sh --unit ${UNIT}   # deploy the CI build anyway
  remote-install.sh --build-from-source                         # rebuild from this checkout (bypasses CI validation)"
  fi
  log "WARNING: deploying artifact built from ${BUILT_SHA}, which differs from local HEAD ${LOCAL_SHA} (ALLOW_STALE=true)."
fi

echo "${ARTIFACT_FILE}"
