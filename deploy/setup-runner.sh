#!/usr/bin/env bash
#
# deploy/setup-runner.sh — install a self-hosted GitHub Actions runner on a
# LAN host so the Deploy workflow can reach VMs that GitHub-hosted runners
# cannot. Run from your laptop; the runner is installed over SSH, registered to
# one repository, and runs as its own system user with no sudo and no login.
#
#   deploy/setup-runner.sh --config deploy/<environment>.env
#   RUNNER_REPO=<owner>/<repo> RUNNER_LABELS=<label> RUNNER_USER=<user> \
#     PLAYWRIGHT_DEPS=0 deploy/setup-runner.sh --config deploy/<environment>.env
#
# RUNNER_REPO defaults to the current checkout's repository, RUNNER_LABELS to
# careconnect-lan (what deploy-environment.yml selects), RUNNER_USER to
# gha-<repo>. VM_USER is only the admin account used to install: it needs
# passwordless sudo on the host. Jobs never get sudo, so the host's Playwright
# system libraries are installed here once (PLAYWRIGHT_DEPS=0 skips that, for a
# runner that never runs the end-to-end suite). Minting the registration token
# needs admin on the repository through the GitHub CLI; otherwise pass a token
# from the runner settings page as RUNNER_TOKEN. Re-running re-registers the
# runner (--replace) without reinstalling.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/lib/remote.sh
source "${SCRIPT_DIR}/lib/remote.sh"

CONFIG_FILE=""
case "${1:-}" in
  --config) CONFIG_FILE="${2:-}" ;;
  -h|--help) sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "") ;;
  *) CONFIG_FILE="$1" ;;
esac
cc_resolve_ssh_target "${CONFIG_FILE}"

RUNNER_REPO="${RUNNER_REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
RUNNER_USER="${RUNNER_USER:-gha-${RUNNER_REPO#*/}}"
RUNNER_NAME="${RUNNER_NAME:-$(ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" hostname)-${RUNNER_REPO#*/}}"
RUNNER_LABELS="${RUNNER_LABELS:-careconnect-lan}"
PLAYWRIGHT_DEPS="${PLAYWRIGHT_DEPS:-1}"
PLAYWRIGHT_VERSION="$(node -p "require('${SCRIPT_DIR}/../package-lock.json').packages['node_modules/playwright']?.version || ''" 2>/dev/null || true)"
VERSION="$(gh api repos/actions/runner/releases/latest --jq '.tag_name' | sed 's/^v//')"

[[ "${RUNNER_USER}" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || cc_die "RUNNER_USER must be a valid Linux user name: ${RUNNER_USER}"

cc_log "Registering runner '${RUNNER_NAME}' (labels: ${RUNNER_LABELS}) for ${RUNNER_REPO} on ${SSH_TARGET}, running as ${RUNNER_USER}"
TOKEN="${RUNNER_TOKEN:-$(gh api -X POST "repos/${RUNNER_REPO}/actions/runners/registration-token" --jq .token)}"

# The token goes over stdin into a mode-600 file the remote script consumes
# and deletes, so it never appears in a command line, process list or history
# on this machine.
printf '%s' "${TOKEN}" | ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" 'umask 077; cat > ~/.runner-registration-token'

ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" bash -s -- \
  "${VERSION}" "${RUNNER_REPO}" "${RUNNER_NAME}" "${RUNNER_LABELS}" "${RUNNER_USER}" "${PLAYWRIGHT_DEPS}" "${PLAYWRIGHT_VERSION}" <<'EOF'
set -euo pipefail
VERSION="$1" REPO="$2" RUNNER_NAME="$3" RUNNER_LABELS="$4" RUNNER_USER="$5" PLAYWRIGHT_DEPS="$6" PLAYWRIGHT_VERSION="$7"
TOKEN="$(cat ~/.runner-registration-token)"; rm -f ~/.runner-registration-token

# A system account with no password, no login shell and no sudo. Jobs run as
# this user, so a job can read only what it owns and cannot change the host.
if ! id "${RUNNER_USER}" >/dev/null 2>&1; then
  echo "==> Creating system user ${RUNNER_USER}..."
  sudo useradd --system --create-home --shell /usr/sbin/nologin "${RUNNER_USER}"
fi
if id -nG "${RUNNER_USER}" | tr ' ' '\n' | grep -qxE 'sudo|admin|wheel'; then
  echo "ERROR: ${RUNNER_USER} is in an admin group; remove it before installing a runner." >&2
  exit 1
fi
HOME_DIR="$(getent passwd "${RUNNER_USER}" | cut -d: -f6)"
RUNNER_DIR="${HOME_DIR}/actions-runner"
# The home directory is not readable by the admin account, so every step in it
# runs through sudo: as the runner user, or as root for the service.
in_dir_as_runner() { sudo -u "${RUNNER_USER}" -H bash -c "cd '${RUNNER_DIR}' && $1"; }
in_dir_as_root() { sudo bash -c "cd '${RUNNER_DIR}' && $1"; }

sudo -u "${RUNNER_USER}" -H mkdir -p "${RUNNER_DIR}"
if ! sudo test -x "${RUNNER_DIR}/config.sh"; then
  echo "==> Downloading actions-runner ${VERSION}..."
  in_dir_as_runner "curl -sSL -o runner.tar.gz 'https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz' && tar -xzf runner.tar.gz && rm runner.tar.gz"
fi
if sudo test -f "${RUNNER_DIR}/.runner"; then
  echo "==> Runner already configured; stopping service before re-registering..."
  in_dir_as_root "./svc.sh stop >/dev/null 2>&1; ./svc.sh uninstall >/dev/null 2>&1" || true
fi
echo "==> Configuring..."
# The token goes in on stdin. config.sh takes it as an argument, so it is
# briefly visible to the runner user's own processes; registration tokens are
# single-use and expire within an hour.
printf '%s' "${TOKEN}" | sudo -u "${RUNNER_USER}" -H bash -c "read -r T; cd '${RUNNER_DIR}' && ./config.sh --unattended --replace \
  --url 'https://github.com/${REPO}' --token \"\$T\" \
  --name '${RUNNER_NAME}' --labels '${RUNNER_LABELS}' --work _work" | grep -vi token || true
echo "==> Installing as a systemd service (user ${RUNNER_USER})..."
in_dir_as_root "./svc.sh install '${RUNNER_USER}' | tail -1 && ./svc.sh start | tail -2"

# The deploy job installs Chromium without --with-deps, because it has no sudo.
# Its system libraries are installed here, once, by the admin account.
if [ "${PLAYWRIGHT_DEPS}" = "1" ]; then
  if command -v npx >/dev/null 2>&1; then
    echo "==> Installing Playwright's Chromium system dependencies${PLAYWRIGHT_VERSION:+ (playwright@${PLAYWRIGHT_VERSION})}..."
    sudo npx --yes "playwright@${PLAYWRIGHT_VERSION:-latest}" install-deps chromium >/dev/null
  else
    echo "WARNING: Node.js is not installed; install it, then run 'sudo npx playwright install-deps chromium'." >&2
  fi
fi
EOF

cc_log "Runners registered for ${RUNNER_REPO}:"
gh api "repos/${RUNNER_REPO}/actions/runners" --jq '.runners[] | "  \(.name)  \(.status)  labels=\([.labels[].name] | join(","))"'
