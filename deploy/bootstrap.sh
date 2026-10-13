#!/usr/bin/env bash
#
# Bootstrap CareConnect on a fresh Ubuntu VM (clone + install in one step).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/careconnect/main/deploy/bootstrap.sh | sudo bash
#   sudo deploy/bootstrap.sh --repo https://github.com/YOUR_ORG/careconnect.git
#
set -euo pipefail

REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="/opt/careconnect-src"
CLONE_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Run as root" >&2
  exit 1
fi

if [[ -z "${REPO_URL}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "${SCRIPT_DIR}/install.sh" ]]; then
    CLONE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
  else
    echo "ERROR: Provide --repo URL or run from a cloned repository" >&2
    exit 1
  fi
else
  apt-get update -qq
  apt-get install -y -qq git
  rm -rf "${INSTALL_DIR}"
  git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
  CLONE_DIR="${INSTALL_DIR}"
fi

exec "${CLONE_DIR}/deploy/install.sh" "$@"
