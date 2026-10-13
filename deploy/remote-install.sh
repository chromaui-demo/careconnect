#!/usr/bin/env bash
#
# Install CareConnect on a remote Ubuntu VM over SSH, or redeploy the latest
# CI-built artifact(s) to one that is already installed.
#
# Run from your Mac/laptop (not on the VM):
#
#   ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
#   ./deploy/remote-install.sh --unit portal --config deploy/<environment>.env
#   VM_USER=ubuntu VM_HOST=<vm-ip> ./deploy/remote-install.sh --mode path --domain <vm-ip>
#
# The SSH target comes from VM_USER / VM_HOST / VM_PORT / SSH_KEY, which can be
# exported in the environment or set in the (gitignored) --config file. There
# are deliberately no built-in defaults for the host or user.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_DIR="/tmp/careconnect-install"

# --build-from-source opts out of the default artifact-based redeploy (see
# below) and forces the old behavior: rebuild from whatever is in this local
# checkout, directly on the VM. Needed for a brand-new VM (nothing to deploy
# an artifact onto yet) and useful for testing local, not-yet-pushed changes.
BUILD_FROM_SOURCE=false
# Artifact-based redeploys are per release unit: --unit api|ehr|portal, or
# "all" (default) to deploy the latest artifact of every unit, API first.
DEPLOY_UNIT="all"
ARTIFACT_ENVIRONMENT="production"
SHOW_HELP=false
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) SHOW_HELP=true; shift ;;
    --build-from-source) BUILD_FROM_SOURCE=true; shift ;;
    --unit) DEPLOY_UNIT="$2"; shift 2 ;;
    --environment) ARTIFACT_ENVIRONMENT="$2"; shift 2 ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
case "${DEPLOY_UNIT}" in
  api|ehr|portal|all) ;;
  *) echo "ERROR: --unit must be api, ehr, portal or all" >&2; exit 1 ;;
esac

INSTALL_ARGS=(${ARGS[@]+"${ARGS[@]}"})

# Resolve deploy settings from CLI args + optional --config file (for local
# summary), and pick up the SSH target (VM_*) from the config file if it is
# not already set in the environment.
resolve_install_config() {
  DOMAIN=""
  DEPLOY_MODE="path"
  CONFIG_PATH_RESOLVED=""
  local config_path=""
  local env_vm_user="${VM_USER:-}" env_vm_host="${VM_HOST:-}" env_vm_port="${VM_PORT:-}" env_ssh_key="${SSH_KEY:-}"
  local args=(${INSTALL_ARGS[@]+"${INSTALL_ARGS[@]}"})
  local i=0
  while [[ $i -lt ${#args[@]} ]]; do
    case "${args[$i]}" in
      --domain) DOMAIN="${args[$((i + 1))]}"; i=$((i + 2)) ;;
      --mode) DEPLOY_MODE="${args[$((i + 1))]}"; i=$((i + 2)) ;;
      --config) config_path="${args[$((i + 1))]}"; i=$((i + 2)) ;;
      *) i=$((i + 1)) ;;
    esac
  done
  if [[ -n "${config_path}" ]]; then
    local cfg="${config_path}"
    [[ "${cfg}" != /* ]] && cfg="${PROJECT_ROOT}/${cfg}"
    if [[ -f "${cfg}" ]]; then
      # shellcheck disable=SC1090
      source "${cfg}"
      CONFIG_PATH_RESOLVED="${cfg}"
    fi
  fi
  # Environment beats config file for the SSH target.
  VM_USER="${env_vm_user:-${VM_USER:-}}"
  VM_HOST="${env_vm_host:-${VM_HOST:-}}"
  VM_PORT="${env_vm_port:-${VM_PORT:-22}}"
  SSH_KEY="${env_ssh_key:-${SSH_KEY:-}}"
  : "${DOMAIN:=${VM_HOST}}"
  : "${DEPLOY_MODE:=path}"
  : "${PORTAL_HOST:=portal}"
  : "${EHR_HOST:=ehr}"
  : "${PORTAL_PORT:=80}"
  : "${EHR_PORT:=80}"
}

resolve_install_config

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

SSH_OPTS=(-o ConnectTimeout=10 -p "${VM_PORT}")

# With no install options at all, default to path mode on the VM address.
if [[ ${#INSTALL_ARGS[@]} -eq 0 && -n "${VM_HOST}" ]]; then
  INSTALL_ARGS=(--mode path --domain "${VM_HOST}")
fi

usage() {
  cat <<EOF
Install CareConnect on a remote Ubuntu VM via SSH.

Usage:
  ./deploy/remote-install.sh [install options]

SSH target (required; export in the environment or set in the --config file):
  VM_USER   SSH username
  VM_HOST   VM IP or hostname
  VM_PORT   SSH port (default: 22)
  SSH_KEY   Path to private key (optional)

If CareConnect is already installed on the target VM, this deploys the
latest CI-built artifact of each release unit (via deploy/fetch-ci-artifact.sh
+ deploy/remote-deploy.sh) -- the same builds the Deploy workflow ships to
staging/production -- instead of rebuilding from source on the VM. Requires
the GitHub CLI (gh), authenticated.

  --unit U              Which unit to redeploy: api, ehr, portal, or all
                         (default: all, API first).
  --environment E       Which environment's CI artifact to fetch: staging or
                         production (default: production). Frontend bundles
                         bake in DEPLOY_MODE, so this must match the VM.
  --build-from-source   Skip the artifacts and rebuild every unit from this
                         local checkout on the VM instead (required for a VM
                         with no prior install; also useful to test local,
                         not-yet-pushed changes).

Install options (passed to install.sh; only used for a fresh install, or
with --build-from-source):
  --mode subdomain|path|ports
  --domain se-tools.net
  --ssl --email admin@se-tools.net

Examples:
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
  ./deploy/remote-install.sh --unit portal --config deploy/<environment>.env
  VM_USER=ubuntu VM_HOST=<vm-ip> ./deploy/remote-install.sh --mode path --domain <vm-ip>
  VM_USER=ubuntu VM_HOST=<vm-ip> ./deploy/remote-install.sh --mode subdomain --domain example.com
EOF
}

[[ "${SHOW_HELP}" == "true" ]] && usage && exit 0

[[ -n "${VM_HOST}" && -n "${VM_USER}" ]] \
  || die "VM_HOST and VM_USER must be set — export them, or put them in the --config file. See --help."

if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
fi

SSH_TARGET="${VM_USER}@${VM_HOST}"

log "Target: ${SSH_TARGET}"
log "Testing SSH connection..."
ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "echo 'SSH OK — $(hostname) running $(lsb_release -ds 2>/dev/null || echo Linux)'" \
  || die "Cannot SSH to ${SSH_TARGET}. Check VPN/network, username, and key/password."

ALREADY_INSTALLED=false
if ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" \
    "test -f /etc/careconnect/careconnect.env && test -d /opt/careconnect/deploy" 2>/dev/null; then
  ALREADY_INSTALLED=true
fi

if [[ "${ALREADY_INSTALLED}" == "true" && "${BUILD_FROM_SOURCE}" != "true" ]]; then
  log "CareConnect is already installed on ${SSH_TARGET} — deploying the latest CI-built"
  log "artifact(s) for: ${DEPLOY_UNIT} (${ARTIFACT_ENVIRONMENT}), not rebuilding on the VM."
  log "Use --build-from-source to rebuild in place instead."

  command -v gh >/dev/null 2>&1 \
    || die "GitHub CLI (gh) is required for artifact-based deploys: https://cli.github.com — then: gh auth login
Or pass --build-from-source to rebuild on the VM without gh."

  if [[ "${DEPLOY_UNIT}" == "all" ]]; then
    UNITS=(api ehr portal)
  else
    UNITS=("${DEPLOY_UNIT}")
  fi

  CONFIG_ARG=()
  [[ -n "${CONFIG_PATH_RESOLVED:-}" ]] && CONFIG_ARG=(--config "${CONFIG_PATH_RESOLVED}")

  for unit in "${UNITS[@]}"; do
    log "--- ${unit} ---"
    ARTIFACT_PATH="$("${SCRIPT_DIR}/fetch-ci-artifact.sh" --unit "${unit}" --environment "${ARTIFACT_ENVIRONMENT}")" \
      || die "Could not fetch a CI-built ${unit} artifact (see above). To rebuild from source instead, re-run with --build-from-source."
    "${SCRIPT_DIR}/remote-deploy.sh" ${CONFIG_ARG[@]+"${CONFIG_ARG[@]}"} "${ARTIFACT_PATH}" \
      || die "Deploy of ${unit} failed on ${SSH_TARGET} — see error output above. deploy/remote-rollback.sh ${unit} can recover a bad deploy."
  done
else
  if [[ "${BUILD_FROM_SOURCE}" == "true" ]]; then
    log "Rebuilding from source on the VM (--build-from-source)..."
  else
    log "CareConnect is not yet installed on ${SSH_TARGET} — running the full installer."
  fi

  # Transfer over a tar/ssh pipe rather than rsync: Windows rsync builds (e.g. the
  # Cygwin-based Chocolatey package) misparse local drive-letter paths as remote
  # specs once a real remote destination is involved, and separately fail with a
  # fd dup() error under non-interactive shells. tar+ssh needs no extra tooling
  # and works the same on macOS/Linux/Windows clients.
  log "Copying project to ${SSH_TARGET}:${REMOTE_DIR}..."
  ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "rm -rf '${REMOTE_DIR}' && mkdir -p '${REMOTE_DIR}'" \
    || die "Could not prepare ${REMOTE_DIR} on ${SSH_TARGET}."
  tar -C "${PROJECT_ROOT}" \
    --exclude node_modules \
    --exclude dist \
    --exclude .git \
    --exclude .turbo \
    --exclude .remember \
    -cf - . | ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "tar -C '${REMOTE_DIR}' -xf -" \
    || die "Transfer to ${SSH_TARGET}:${REMOTE_DIR} failed."

  # Normalize CRLF line endings in case the local checkout has git autocrlf=true
  # (common on Windows) — a CRLF shebang or sourced .env line fails on the VM.
  ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" \
    "find '${REMOTE_DIR}' -type f \( -name '*.sh' -o -name '*.env' -o -name '*.env.example' -o -name '*.template' \) -exec sed -i 's/\r\$//' {} +"

  log "Running installer on VM (sudo password may be prompted)..."
  ssh -t "${SSH_OPTS[@]}" "${SSH_TARGET}" \
    "cd '${REMOTE_DIR}' && sudo deploy/install.sh ${INSTALL_ARGS[*]:-}"
fi

log "Done. Fetching install summary from VM..."
VM_IP="${VM_HOST}"
ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "hostname -I 2>/dev/null | awk '{print \$1}'" | read -r VM_IP || true
VM_IP="${VM_IP:-${VM_HOST}}"

cat <<EOF

CareConnect remote install finished.

SSH in to verify:
  ssh ${SSH_TARGET}

VM IP: ${VM_IP}
Mode:  ${DEPLOY_MODE}
Domain: ${DOMAIN}

EOF

case "${DEPLOY_MODE}" in
  subdomain)
    cat <<EOF
Browser URLs (DNS must point to ${VM_IP}):
  http://${PORTAL_HOST}.${DOMAIN}:${PORTAL_PORT}
  http://${EHR_HOST}.${DOMAIN}:${EHR_PORT}

EOF
    ;;
  path)
    cat <<EOF
Browser URLs:
  http://${DOMAIN}/           (portal)
  http://${DOMAIN}/ehr/

EOF
    ;;
  ports)
    cat <<EOF
Browser URLs:
  http://${VM_IP}:${PORTAL_PORT}   (portal)
  http://${VM_IP}:${EHR_PORT}       (ehr)

EOF
    ;;
esac
