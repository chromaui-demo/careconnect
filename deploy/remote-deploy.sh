#!/usr/bin/env bash
#
# deploy/remote-deploy.sh — ship ONE release-unit artifact to a VM over SSH and
# deploy it there with deploy-artifact.sh. Used by the Deploy workflow (CI) and
# by remote-install.sh; can also be run by hand from a laptop.
#
#   deploy/remote-deploy.sh [--config <env-file>] <artifact-tarball>
#
# SSH target: VM_USER / VM_HOST / VM_PORT / SSH_KEY from the environment or the
# --config file (environment wins). The VM must already have CareConnect
# installed (install.sh or remote-install.sh --build-from-source).
#
# The artifact carries its own copy of deploy/, and that copy is what runs on
# the VM — so the scripts always match the artifact being deployed.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/remote.sh
source "${SCRIPT_DIR}/lib/remote.sh"

CONFIG_FILE=""
ARTIFACT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config) CONFIG_FILE="$2"; shift 2 ;;
    -h|--help) sed -n '3,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) ARTIFACT="$1"; shift ;;
  esac
done
[[ -n "${ARTIFACT}" && -f "${ARTIFACT}" ]] || cc_die "Artifact tarball not found: ${ARTIFACT:-<none>} (see --help)"

cc_resolve_ssh_target "${CONFIG_FILE}"

REMOTE_ARTIFACT="/tmp/$(basename "${ARTIFACT}")"

cc_log "Target: ${SSH_TARGET}"
cc_log "Copying $(basename "${ARTIFACT}") to ${SSH_TARGET}:${REMOTE_ARTIFACT}..."
scp "${SCP_OPTS[@]}" "${ARTIFACT}" "${SSH_TARGET}:${REMOTE_ARTIFACT}" \
  || cc_die "Failed to copy artifact to ${SSH_TARGET}."

cc_log "Deploying on VM (sudo password may be prompted)..."
# shellcheck disable=SC2029
ssh -t "${SSH_OPTS[@]}" "${SSH_TARGET}" \
  "set -e; T=\$(mktemp -d); tar -xzf '${REMOTE_ARTIFACT}' -C \"\$T\" ./deploy; sudo \"\$T/deploy/deploy-artifact.sh\" '${REMOTE_ARTIFACT}'; rm -rf \"\$T\" '${REMOTE_ARTIFACT}'" \
  || cc_die "Deploy failed on ${SSH_TARGET} — see output above. To recover: deploy/remote-rollback.sh <unit>"

cc_log "Deployed $(basename "${ARTIFACT}") to ${SSH_TARGET}."
