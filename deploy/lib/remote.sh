#!/usr/bin/env bash
#
# deploy/lib/remote.sh — SSH target resolution shared by the laptop/CI-side
# scripts (remote-install.sh, remote-deploy.sh, remote-rollback.sh). Source,
# don't run.
#
# The target comes from VM_USER / VM_HOST / VM_PORT / SSH_KEY, exported in the
# environment or set in the (gitignored) config file. Environment wins. There
# are deliberately no built-in defaults for the host or user.

cc_log() { printf '==> %s\n' "$*"; }
cc_die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# cc_resolve_ssh_target [config-file]
# Sets VM_USER, VM_HOST, VM_PORT, SSH_KEY, SSH_OPTS / SCP_OPTS (arrays) and SSH_TARGET.
cc_resolve_ssh_target() {
  local config_path="${1:-}"
  local env_vm_user="${VM_USER:-}" env_vm_host="${VM_HOST:-}" env_vm_port="${VM_PORT:-}" env_ssh_key="${SSH_KEY:-}"
  if [[ -n "${config_path}" ]]; then
    [[ -f "${config_path}" ]] || cc_die "Config file not found: ${config_path}"
    # shellcheck disable=SC1090
    source "${config_path}"
  fi
  VM_USER="${env_vm_user:-${VM_USER:-}}"
  VM_HOST="${env_vm_host:-${VM_HOST:-}}"
  VM_PORT="${env_vm_port:-${VM_PORT:-22}}"
  SSH_KEY="${env_ssh_key:-${SSH_KEY:-}}"
  [[ -n "${VM_HOST}" && -n "${VM_USER}" ]] \
    || cc_die "VM_HOST and VM_USER must be set — export them, or put them in the --config file."
  SSH_OPTS=(-o ConnectTimeout=10 -p "${VM_PORT}")
  # scp spells the port flag -P; lowercase -p means "preserve times" there.
  SCP_OPTS=(-o ConnectTimeout=10 -P "${VM_PORT}")
  if [[ -n "${SSH_KEY}" ]]; then
    SSH_OPTS+=(-i "${SSH_KEY}")
    SCP_OPTS+=(-i "${SSH_KEY}")
  fi
  SSH_TARGET="${VM_USER}@${VM_HOST}"
}
