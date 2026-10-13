#!/usr/bin/env bash
#
# deploy/update.sh — rebuild every unit from the source in /opt/careconnect and
# redeploy it in place. For ad-hoc rebuilds on a VM that was installed from
# source; CI-driven deploys use deploy-artifact.sh, one unit at a time.
#
#   sudo deploy/update.sh [config-file]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

CONFIG_FILE="${1:-/etc/careconnect/careconnect.env}"

cc_require_root "$@"
cc_load_config "${CONFIG_FILE}"

cc_log "Rebuilding CareConnect from ${INSTALL_DIR}..."
# Every workspace, the design system included, is private and built from source
# here, so npm needs no registry credentials on this VM.
sudo -u "${APP_USER}" env HOME="${INSTALL_DIR}" bash "${INSTALL_DIR}/deploy/build-production.sh" "${CONFIG_FILE}" all

RELEASE_ID="source-$(git -C "${INSTALL_DIR}" rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%dT%H%M%SZ)"

cc_log "Publishing frontends as release ${RELEASE_ID}..."
cc_publish_frontend portal "${INSTALL_DIR}/apps/portal/dist" "${RELEASE_ID}"
cc_publish_frontend ehr "${INSTALL_DIR}/apps/ehr/dist" "${RELEASE_ID}"

cc_log "Restarting services..."
systemctl restart careconnect-api
systemctl reload nginx

cc_log "Waiting for API health..."
if cc_wait_for_api "${API_PORT}" 30; then
  cc_log "Update complete — API healthy."
  exit 0
fi

cc_warn "API health check failed — run: journalctl -u careconnect-api -n 50"
exit 1
