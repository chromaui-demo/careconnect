#!/usr/bin/env bash
#
# deploy/remote-rollback.sh — roll ONE release unit back on a VM over SSH.
# Wraps deploy/rollback.sh on the VM; see that script for the argument forms.
#
#   deploy/remote-rollback.sh [--config <env-file>] api
#   deploy/remote-rollback.sh [--config <env-file>] ehr|portal [<release-id>]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/remote.sh
source "${SCRIPT_DIR}/lib/remote.sh"

CONFIG_FILE=""
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_FILE="$2"; shift 2 ;;
    -h|--help) sed -n '3,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
[[ ${#ARGS[@]} -ge 1 ]] || cc_die "Usage: remote-rollback.sh [--config <env-file>] <api|ehr|portal> [...]"

cc_resolve_ssh_target "${CONFIG_FILE}"

cc_log "Target: ${SSH_TARGET}"
cc_log "Rolling back ${ARGS[0]} on VM (sudo password may be prompted)..."
# shellcheck disable=SC2029
ssh -t "${SSH_OPTS[@]}" "${SSH_TARGET}" "sudo /opt/careconnect/deploy/rollback.sh ${ARGS[*]}" \
  || cc_die "Rollback failed on ${SSH_TARGET} — see output above."
