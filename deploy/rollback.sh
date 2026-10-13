#!/usr/bin/env bash
#
# deploy/rollback.sh — roll ONE release unit back to its previous release.
#
#   sudo deploy/rollback.sh api                                  # previous artifact + its DB backup
#   sudo deploy/rollback.sh api <artifact-tarball> <db-backup>   # explicit
#   sudo deploy/rollback.sh ehr|portal                           # previous release dir
#   sudo deploy/rollback.sh ehr|portal <release-id>              # a specific kept release
#
# Add --config <file> to use a config other than /etc/careconnect/careconnect.env.
#
# api: no migrations are re-run — the restored DB backup (taken just before
# the deploy being undone) already matches the restored code's schema.
# Frontends are stateless: rollback is a symlink swap plus an nginx reload.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG_FILE="/etc/careconnect/careconnect.env"
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_FILE="$2"; shift 2 ;;
    -h|--help) sed -n '3,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${POSITIONAL[@]:-}"

UNIT="${1:-}"
case "${UNIT}" in
  api|ehr|portal) ;;
  *) cc_die "Usage: rollback.sh <api|ehr|portal> [...]  (see --help)" ;;
esac

cc_require_root "$@"
cc_load_config "${CONFIG_FILE}"

rollback_api() {
  local artifact="${2:-}" db_backup="${3:-}"
  if [[ -z "${artifact}" ]]; then
    cc_record_read api || cc_die "No deploy record at $(cc_record_dir api)/current — pass the artifact and DB backup explicitly."
    artifact="${RECORD_PREVIOUS_ARTIFACT}"
    db_backup="${RECORD_BACKUP}"
    [[ -n "${artifact}" ]] || cc_die "The deploy record has no previous artifact (first artifact deploy on this VM?) — pass the artifact and DB backup explicitly."
  fi
  [[ -n "${db_backup}" && -f "${db_backup}" ]] || cc_die "DB backup not found: ${db_backup:-<none>}"

  HANDLED_FAILURE=0
  EXTRACT_DIR=""
  cleanup() {
    [[ -n "${EXTRACT_DIR}" ]] && rm -rf "${EXTRACT_DIR}"
    if [[ "${HANDLED_FAILURE}" -eq 0 ]]; then
      echo "ERROR: Script exited unexpectedly — careconnect-api may be stopped. Check: sudo journalctl -u careconnect-api -n 50" >&2
    fi
  }
  trap cleanup EXIT

  cc_log "Extracting previous artifact ${artifact}..."
  cc_extract_artifact "${artifact}"
  [[ "${MANIFEST_UNIT}" == "api" ]] || { HANDLED_FAILURE=1; cc_die "Not an api artifact: ${artifact} (unit=${MANIFEST_UNIT})"; }

  cc_log "Stopping careconnect-api..."
  systemctl stop careconnect-api

  cc_log "Backing up current database before rollback..."
  local pre_rollback_backup
  if pre_rollback_backup="$(cc_api_backup_db 2>&1)"; then
    cc_log "Pre-rollback backup written to ${pre_rollback_backup}"
  else
    cc_warn "Could not back up the current database before rollback — proceeding without a pre-rollback snapshot."
  fi

  cc_log "Restoring database from ${db_backup}..."
  cp "${db_backup}" "${CARECONNECT_DATA_DIR}/careconnect.db"
  chown "${APP_USER}:${APP_USER}" "${CARECONNECT_DATA_DIR}/careconnect.db"

  cc_log "Syncing previous API release ${MANIFEST_VERSION}-${MANIFEST_SHA} into ${INSTALL_DIR}..."
  cc_sync_api_release "${EXTRACT_DIR}"
  cc_record_write api "${artifact}" "${pre_rollback_backup:-}" "${MANIFEST_VERSION}-${MANIFEST_SHA}"

  cc_log "Starting careconnect-api..."
  systemctl start careconnect-api

  cc_log "Waiting for API health..."
  if cc_wait_for_api "${API_PORT}" 30; then
    cc_log "Rollback complete — api ${MANIFEST_VERSION} (${MANIFEST_SHA}) healthy."
    HANDLED_FAILURE=1
    exit 0
  fi
  echo "ERROR: API health check failed after rollback — run: journalctl -u careconnect-api -n 50" >&2
  HANDLED_FAILURE=1
  exit 1
}

rollback_frontend() {
  local app="$1" target="${2:-}"
  if [[ -z "${target}" ]]; then
    target="$(cc_frontend_previous "${app}")"
    [[ -n "${target}" ]] || cc_die "${app}: no previous release recorded under ${WWW_ROOT}/releases/${app} — pass a release id (ls ${WWW_ROOT}/releases/${app})."
  fi
  cc_log "Switching ${app} to release ${target}..."
  cc_switch_frontend "${app}" "${target}"
  systemctl reload nginx
  cc_log "Rollback complete — ${app} is serving ${target}."
}

case "${UNIT}" in
  api) rollback_api "$@" ;;
  ehr|portal) rollback_frontend "$@" ;;
esac
