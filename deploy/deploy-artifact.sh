#!/usr/bin/env bash
#
# deploy/deploy-artifact.sh — deploy ONE pre-built release-unit artifact to
# this VM. Used by CI for staging/production deploys; a human doing an ad-hoc
# rebuild-in-place should keep using update.sh instead.
#
#   sudo deploy/deploy-artifact.sh <artifact-tarball> [config-file]
#
# The artifact's MANIFEST.json says which unit it is:
#   api     stop careconnect-api → back up DB → sync runtime → migrate → start
#   ehr     publish bundle as a new release dir, swap the symlink, reload nginx
#   portal  same as ehr
#
# Failure-mode note (api): if migrations fail after the code sync, the
# pre-deploy DB backup is restored but careconnect-api is left STOPPED — the
# sync already replaced the runtime with the new (still-broken) code, so
# restarting would just crash-loop on the same migration failure.
# `sudo deploy/rollback.sh api` is the documented recovery path.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

ARTIFACT_PATH="${1:?Usage: deploy-artifact.sh <artifact-tarball> [config-file]}"
CONFIG_FILE="${2:-/etc/careconnect/careconnect.env}"

cc_require_root "$@"
cc_load_config "${CONFIG_FILE}"

HANDLED_FAILURE=0
EXTRACT_DIR=""
cleanup() {
  [[ -n "${EXTRACT_DIR}" ]] && rm -rf "${EXTRACT_DIR}"
  if [[ "${HANDLED_FAILURE}" -eq 0 ]]; then
    echo "ERROR: Script exited unexpectedly — ${MANIFEST_UNIT:-the unit} may be in a half-deployed state." >&2
    echo "ERROR: To recover: sudo ${INSTALL_DIR}/deploy/rollback.sh ${MANIFEST_UNIT:-<unit>}" >&2
  fi
}
trap cleanup EXIT

cc_log "Extracting artifact ${ARTIFACT_PATH}..."
cc_extract_artifact "${ARTIFACT_PATH}"
cc_check_deploy_mode
cc_sync_deploy_tooling "${EXTRACT_DIR}"

RELEASE_ID="${MANIFEST_VERSION}-${MANIFEST_SHA}"

deploy_api() {
  cc_log "Stopping careconnect-api..."
  systemctl stop careconnect-api

  cc_log "Backing up database..."
  local backup_path
  backup_path="$(cc_api_backup_db)"
  cc_log "Backup written to ${backup_path}"

  # Record first, so rollback.sh api can find the previous artifact and this
  # backup even if the steps below fail.
  cc_record_write api "${ARTIFACT_PATH}" "${backup_path}" "${RELEASE_ID}"

  cc_log "Syncing API release ${RELEASE_ID} into ${INSTALL_DIR}..."
  cc_sync_api_release "${EXTRACT_DIR}"

  cc_log "Running database migrations..."
  if ! cc_api_migrate; then
    echo "ERROR: Migration failed — database backup restored, careconnect-api left STOPPED to avoid a crash loop on the still-broken new code." >&2
    cp "${backup_path}" "${CARECONNECT_DATA_DIR}/careconnect.db"
    chown "${APP_USER}:${APP_USER}" "${CARECONNECT_DATA_DIR}/careconnect.db"
    echo "ERROR: To recover, run: sudo ${INSTALL_DIR}/deploy/rollback.sh api" >&2
    HANDLED_FAILURE=1
    exit 1
  fi

  cc_log "Starting careconnect-api..."
  systemctl start careconnect-api

  cc_log "Waiting for API health..."
  if cc_wait_for_api "${API_PORT}" 30; then
    cc_log "Deploy complete — api ${MANIFEST_VERSION} (${MANIFEST_SHA}) healthy."
    bash "${INSTALL_DIR}/deploy/prune-backups.sh" "${CARECONNECT_DATA_DIR}" "${RELEASE_RETENTION}"
    return 0
  fi
  echo "ERROR: API health check failed after deploy — run: journalctl -u careconnect-api -n 50" >&2
  echo "ERROR: To recover, run: sudo ${INSTALL_DIR}/deploy/rollback.sh api" >&2
  HANDLED_FAILURE=1
  exit 1
}

deploy_frontend() {
  local app="$1" src="${EXTRACT_DIR}/apps/$1/dist"
  cc_log "Publishing ${app} release ${RELEASE_ID} to ${WWW_ROOT}/releases/${app}..."
  cc_publish_frontend "${app}" "${src}" "${RELEASE_ID}"
  cc_record_write "${app}" "${ARTIFACT_PATH}" "" "${RELEASE_ID}"
  systemctl reload nginx
  cc_log "Deploy complete — ${app} ${MANIFEST_VERSION} (${MANIFEST_SHA}) is live; previous: $(cc_frontend_previous "${app}")"
}

case "${MANIFEST_UNIT}" in
  api) deploy_api ;;
  ehr|portal) deploy_frontend "${MANIFEST_UNIT}" ;;
esac

HANDLED_FAILURE=1
exit 0
