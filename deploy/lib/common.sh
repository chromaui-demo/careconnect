#!/usr/bin/env bash
#
# deploy/lib/common.sh — helpers shared by the on-VM deploy scripts
# (deploy-artifact.sh, rollback.sh, update.sh, install.sh). Source, don't run.
#
# Every deployable unit (api, ehr, portal) is released and deployed on its own:
#   api    → /opt/careconnect (runtime + node_modules), systemd, DB migrations
#   ehr    → ${WWW_ROOT}/releases/ehr/<release-id>, symlinked as ${WWW_ROOT}/ehr
#   portal → ${WWW_ROOT}/releases/portal/<release-id>, symlinked as ${WWW_ROOT}/portal
# Frontends switch atomically (symlink swap) and roll back by re-pointing the
# symlink; the API keeps a copy of each deployed artifact and the pre-deploy
# database backup so it can roll back to the previous release.

cc_log() { printf '==> %s\n' "$*"; }
cc_warn() { printf 'WARNING: %s\n' "$*" >&2; }
cc_die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Defaults for optional config vars (older config files may omit these).
cc_apply_config_defaults() {
  : "${API_PORT:=5000}"
  : "${CARECONNECT_DATA_DIR:=/var/lib/careconnect}"
  : "${APP_USER:=careconnect}"
  : "${INSTALL_DIR:=/opt/careconnect}"
  : "${WWW_ROOT:=/var/www/careconnect}"
  : "${CONFIG_DIR:=/etc/careconnect}"
  : "${RELEASE_RETENTION:=5}"
}

# Load an environment config file (default: the canonical one on the VM).
cc_load_config() {
  local config_file="${1:-/etc/careconnect/careconnect.env}"
  [[ -f "${config_file}" ]] || cc_die "Config file not found: ${config_file}"
  # shellcheck disable=SC1090
  source "${config_file}"
  cc_apply_config_defaults
}

cc_require_root() {
  [[ "$(id -u)" -eq 0 ]] || cc_die "Run as root: sudo $0 $*"
}

# --- Artifacts ----------------------------------------------------------------

# Extract an artifact tarball into a fresh temp dir and validate its manifest.
# Sets EXTRACT_DIR, MANIFEST_UNIT, MANIFEST_NAME, MANIFEST_VERSION,
# MANIFEST_SHA, MANIFEST_DEPLOY_MODE. The caller owns EXTRACT_DIR cleanup.
cc_extract_artifact() {
  local artifact="$1"
  [[ -f "${artifact}" ]] || cc_die "Artifact not found: ${artifact}"
  EXTRACT_DIR="$(mktemp -d)"
  tar -xzf "${artifact}" -C "${EXTRACT_DIR}"
  if [[ -L "${EXTRACT_DIR}/MANIFEST.json" ]]; then
    cc_die "MANIFEST.json is a symlink — refusing to trust an artifact that ships a symlink for its manifest."
  fi
  [[ -f "${EXTRACT_DIR}/MANIFEST.json" ]] \
    || cc_die "MANIFEST.json missing from artifact — refusing to deploy an unversioned tarball."
  cc_log "Artifact manifest: $(cat "${EXTRACT_DIR}/MANIFEST.json")"
  MANIFEST_UNIT="$(cc_manifest_field "${EXTRACT_DIR}/MANIFEST.json" unit)"
  MANIFEST_NAME="$(cc_manifest_field "${EXTRACT_DIR}/MANIFEST.json" name)"
  MANIFEST_VERSION="$(cc_manifest_field "${EXTRACT_DIR}/MANIFEST.json" version)"
  MANIFEST_SHA="$(cc_manifest_field "${EXTRACT_DIR}/MANIFEST.json" gitSha)"
  MANIFEST_DEPLOY_MODE="$(cc_manifest_field "${EXTRACT_DIR}/MANIFEST.json" deployMode)"
  case "${MANIFEST_UNIT}" in
    api|ehr|portal) ;;
    *) cc_die "Artifact manifest has no recognised \"unit\" (got '${MANIFEST_UNIT:-<none>}'); rebuild it with deploy/package-artifact.sh --unit <api|ehr|portal>." ;;
  esac
}

cc_manifest_field() {
  grep -o "\"$2\":\"[^\"]*\"" "$1" | head -n 1 | cut -d'"' -f4 || true
}

# Frontends bake DEPLOY_MODE into their bundles, so an artifact built for one
# layout must not be deployed to an environment configured for another.
cc_check_deploy_mode() {
  if [[ -n "${MANIFEST_DEPLOY_MODE}" && "${MANIFEST_DEPLOY_MODE}" != "${DEPLOY_MODE:-}" ]]; then
    cc_die "Artifact was built with DEPLOY_MODE=${MANIFEST_DEPLOY_MODE} but this environment's config specifies DEPLOY_MODE=${DEPLOY_MODE:-<unset>} — refusing to deploy a mismatched artifact."
  fi
}

# Keep the VM's copy of the deploy tooling in step with whatever shipped last,
# so rollback.sh / update.sh on the VM match the artifacts they operate on.
cc_sync_deploy_tooling() {
  local src="$1/deploy"
  [[ -d "${src}" ]] || return 0
  mkdir -p "${INSTALL_DIR}/deploy"
  rsync -a --exclude='*.env' --exclude='/runtime' "${src}/" "${INSTALL_DIR}/deploy/"
  chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}/deploy"
}

# --- Deploy records (per unit) -------------------------------------------------
#
# ${CARECONNECT_DATA_DIR}/artifacts/<unit>/current records what is deployed and
# what it replaced; rollback.sh reads it when called without explicit arguments.

cc_record_dir() { echo "${CARECONNECT_DATA_DIR}/artifacts/$1"; }

cc_record_read() {
  local unit="$1" record
  record="$(cc_record_dir "${unit}")/current"
  RECORD_ARTIFACT="" RECORD_PREVIOUS_ARTIFACT="" RECORD_BACKUP="" RECORD_RELEASE_ID="" RECORD_PREVIOUS_RELEASE_ID=""
  [[ -f "${record}" ]] || return 1
  # shellcheck disable=SC1090
  source "${record}"
}

# cc_record_write <unit> <artifact-path> <backup-path> <release-id>
# Copies the artifact into the record dir (so it survives /tmp cleanup) and
# rotates the previous "current" into the PREVIOUS_* fields.
cc_record_write() {
  local unit="$1" artifact="$2" backup="$3" release_id="$4"
  local dir kept prev_artifact="" prev_release=""
  dir="$(cc_record_dir "${unit}")"
  mkdir -p "${dir}"
  if cc_record_read "${unit}"; then
    prev_artifact="${RECORD_ARTIFACT}"
    prev_release="${RECORD_RELEASE_ID}"
  fi
  kept="${dir}/$(basename "${artifact}")"
  [[ "${artifact}" == "${kept}" ]] || cp -f "${artifact}" "${kept}"
  cat > "${dir}/current" <<EOF2
RECORD_ARTIFACT="${kept}"
RECORD_PREVIOUS_ARTIFACT="${prev_artifact}"
RECORD_BACKUP="${backup}"
RECORD_RELEASE_ID="${release_id}"
RECORD_PREVIOUS_RELEASE_ID="${prev_release}"
RECORD_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF2
  chown -R "${APP_USER}:${APP_USER}" "${dir}"
  cc_prune_artifacts "${unit}" "${kept}" "${prev_artifact}"
}

# Keep the newest RELEASE_RETENTION artifacts plus whatever current/previous
# point at.
cc_prune_artifacts() {
  local unit="$1" keep_a="$2" keep_b="$3" dir f
  dir="$(cc_record_dir "${unit}")"
  ls -1t "${dir}"/*.tar.gz 2>/dev/null | tail -n +$((RELEASE_RETENTION + 1)) | while read -r f; do
    [[ "${f}" == "${keep_a}" || "${f}" == "${keep_b}" ]] && continue
    rm -f "${f}"
  done
}

# --- API unit -----------------------------------------------------------------

# Copy an extracted API artifact into INSTALL_DIR. Only the paths the API
# ships are touched, so a source-installed VM keeps everything else in place.
cc_sync_api_release() {
  local src="$1"
  [[ -f "${src}/apps/api/dist/index.js" ]] || cc_die "Not an API artifact: apps/api/dist/index.js missing."
  mkdir -p "${INSTALL_DIR}/apps/api" "${INSTALL_DIR}/packages/types" "${INSTALL_DIR}/node_modules"
  rsync -a --delete "${src}/apps/api/dist/" "${INSTALL_DIR}/apps/api/dist/"
  cp -f "${src}/apps/api/package.json" "${INSTALL_DIR}/apps/api/package.json"
  rsync -a --delete "${src}/packages/types/dist/" "${INSTALL_DIR}/packages/types/dist/"
  cp -f "${src}/packages/types/package.json" "${INSTALL_DIR}/packages/types/package.json"
  rsync -a --delete "${src}/node_modules/" "${INSTALL_DIR}/node_modules/"
  cp -f "${src}/package.json" "${INSTALL_DIR}/package.json"
  cp -f "${src}/package-lock.json" "${INSTALL_DIR}/package-lock.json"
  chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}/apps/api" "${INSTALL_DIR}/packages/types" \
    "${INSTALL_DIR}/node_modules" "${INSTALL_DIR}/package.json" "${INSTALL_DIR}/package-lock.json"
}

cc_api_backup_db() {
  sudo -u "${APP_USER}" env CARECONNECT_DATA_DIR="${CARECONNECT_DATA_DIR}" \
    node "${INSTALL_DIR}/apps/api/dist/db/backup-cli.js"
}

cc_api_migrate() {
  sudo -u "${APP_USER}" env CARECONNECT_DATA_DIR="${CARECONNECT_DATA_DIR}" \
    node "${INSTALL_DIR}/apps/api/dist/db/run-migrations.js"
}

cc_wait_for_api() {
  local port="${1:-${API_PORT}}" attempts="${2:-30}" i
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf "http://127.0.0.1:${port}/health" 2>/dev/null | grep -q '"service"[[:space:]]*:[[:space:]]*"careconnect-api"'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# --- Frontend units (ehr, portal) ---------------------------------------------

# cc_publish_frontend <app> <src-dir> <release-id>
# Copies a built bundle into ${WWW_ROOT}/releases/<app>/<release-id> and
# atomically points ${WWW_ROOT}/<app> at it. The previous target is kept for
# rollback; older releases are pruned to RELEASE_RETENTION. Bookkeeping lives
# in ${WWW_ROOT}/releases/<app>/.current, .previous and .history.
cc_publish_frontend() {
  local app="$1" src="$2" release_id="$3"
  local releases="${WWW_ROOT}/releases/${app}" link="${WWW_ROOT}/${app}" target
  [[ -f "${src}/index.html" ]] || cc_die "${app}: no index.html in ${src} — nothing to publish."
  target="${releases}/${release_id}"

  mkdir -p "${releases}"
  rsync -a --delete "${src}/" "${target}/"

  # A pre-release-dir install left a real directory here; preserve it as a
  # release so the first symlinked deploy can still roll back.
  if [[ -d "${link}" && ! -L "${link}" ]]; then
    local legacy_id="legacy-$(date -u +%Y%m%dT%H%M%SZ)"
    cc_log "${app}: converting existing directory to release ${legacy_id}"
    mv "${link}" "${releases}/${legacy_id}"
    echo "${legacy_id}" >> "${releases}/.history"
    echo "${legacy_id}" > "${releases}/.current"
  fi

  chown -R www-data:www-data "${releases}"
  cc_switch_frontend "${app}" "${release_id}"
  cc_prune_frontend_releases "${app}"
}

cc_frontend_current() { cat "${WWW_ROOT}/releases/$1/.current" 2>/dev/null || true; }
cc_frontend_previous() { cat "${WWW_ROOT}/releases/$1/.previous" 2>/dev/null || true; }

# cc_switch_frontend <app> <release-id> — re-point the live symlink (atomic
# rename over the old symlink) and record what it replaced.
cc_switch_frontend() {
  local app="$1" release_id="$2"
  local releases="${WWW_ROOT}/releases/${app}" link="${WWW_ROOT}/${app}" current
  [[ -f "${releases}/${release_id}/index.html" ]] || cc_die "${app}: release '${release_id}' not found under ${releases}."
  current="$(cc_frontend_current "${app}")"
  ln -sfn "${releases}/${release_id}" "${link}.tmp" && mv -T "${link}.tmp" "${link}"
  [[ -n "${current}" && "${current}" != "${release_id}" ]] && echo "${current}" > "${releases}/.previous"
  echo "${release_id}" > "${releases}/.current"
  echo "${release_id}" >> "${releases}/.history"
}

# Keep the RELEASE_RETENTION most recently activated releases, plus whatever
# .current/.previous point at. Ordered by .history, not mtime — rsync -a
# preserves source timestamps, so mtimes say nothing about deploy order.
cc_prune_frontend_releases() {
  local app="$1" releases="${WWW_ROOT}/releases/${app}" current previous keep d
  current="$(cc_frontend_current "${app}")"
  previous="$(cc_frontend_previous "${app}")"
  keep="$(tail -n "${RELEASE_RETENTION}" "${releases}/.history" 2>/dev/null | sort -u)"
  for d in "${releases}"/*/; do
    d="$(basename "${d}")"
    [[ "${d}" == "${current}" || "${d}" == "${previous}" ]] && continue
    grep -qx "${d}" <<<"${keep}" && continue
    rm -rf "${releases:?}/${d}"
  done
  # Drop pruned ids from the history so it doesn't grow forever.
  if [[ -f "${releases}/.history" ]]; then
    tail -n $((RELEASE_RETENTION * 4)) "${releases}/.history" > "${releases}/.history.tmp" \
      && mv -f "${releases}/.history.tmp" "${releases}/.history"
  fi
}
