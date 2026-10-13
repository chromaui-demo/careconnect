#!/usr/bin/env bash
#
# deploy/prune-backups.sh — keep only the N most recent database backups.
#
set -euo pipefail

DATA_DIR="${1:?Usage: prune-backups.sh <data-dir> [retention-count]}"
RETENTION="${2:-5}"
BACKUPS_DIR="${DATA_DIR}/backups"

if [[ ! -d "${BACKUPS_DIR}" ]]; then
  exit 0
fi

# List newest-first, skip the first RETENTION, delete the rest.
mapfile -t OLD_BACKUPS < <(ls -1t "${BACKUPS_DIR}"/careconnect-*.db 2>/dev/null | tail -n +"$((RETENTION + 1))")
if [[ ${#OLD_BACKUPS[@]} -gt 0 ]]; then
  echo "==> Pruning ${#OLD_BACKUPS[@]} backup(s) beyond retention of ${RETENTION}..."
  rm -f "${OLD_BACKUPS[@]}"
fi
