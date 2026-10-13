#!/usr/bin/env bash
#
# CareConnect local development setup (macOS or Linux, no root required).
# Installs npm deps, builds shared types + design system, writes runtime env for the API.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CONFIG_FILE="${PROJECT_ROOT}/deploy/local.env"
API_PORT=5000

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

sed_inplace() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG_FILE="$2"
      [[ "${CONFIG_FILE}" != /* ]] && CONFIG_FILE="${PROJECT_ROOT}/${CONFIG_FILE}"
      shift 2
      ;;
    --help)
      echo "Usage: deploy/install-local.sh [--config deploy/<environment>.env]"
      exit 0
      ;;
    *) die "Unknown option: $1" ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  die "Node.js is required. Install Node 20+ (nvm, Homebrew, or nodesource)."
fi

if ! command -v npm >/dev/null 2>&1; then
  die "npm is required."
fi

# Optional: load domain config for reference (ports ignored in dev — Vite uses 4000–4001)
if [[ -f "${CONFIG_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
fi

: "${API_PORT:=5000}"
RUNTIME_DIR="${PROJECT_ROOT}/deploy/runtime"
DATA_DIR="${PROJECT_ROOT}/data"

mkdir -p "${RUNTIME_DIR}" "${DATA_DIR}"

if [[ -f "${RUNTIME_DIR}/careconnect-api.env" ]] && grep -q '^JWT_SECRET=' "${RUNTIME_DIR}/careconnect-api.env"; then
  JWT_SECRET="$(grep '^JWT_SECRET=' "${RUNTIME_DIR}/careconnect-api.env" | cut -d= -f2-)"
else
  JWT_SECRET="$(openssl rand -hex 32)"
  log "Generated JWT_SECRET"
fi

cat > "${RUNTIME_DIR}/careconnect-api.env" <<EOF
NODE_ENV=development
PORT=${API_PORT}
CARECONNECT_DATA_DIR=${DATA_DIR}
JWT_SECRET=${JWT_SECRET}
EOF
chmod 600 "${RUNTIME_DIR}/careconnect-api.env"

log "Installing npm dependencies..."
cd "${PROJECT_ROOT}"
npm ci --include=dev

log "Building shared types..."
npm run build --workspace=@careconnect/types

# EHR and Portal resolve @careconnect/design-system through its package
# exports, which point at dist/ -- so the library must be built before the
# Vite dev servers can start. (turbo does this for `npm run build`, but the
# per-app dev scripts bypass turbo.)
log "Building design system..."
npm run build --workspace=@careconnect/design-system

log "Building API..."
npm run build --workspace=@careconnect/api

# Convenience launcher
cat > "${SCRIPT_DIR}/start-local.sh" <<'LAUNCHER'
#!/usr/bin/env bash
# Start all CareConnect dev services. Ctrl+C stops all.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
set -a && source "${ROOT}/deploy/runtime/careconnect-api.env" && set +a

cleanup() { jobs -p | xargs -r kill 2>/dev/null || true; }
trap cleanup EXIT INT TERM

cd "${ROOT}"
echo "API      http://localhost:${PORT:-5000}"
echo "EHR      http://localhost:4000  (staff login: admin@se-tools.net / seeded demo password)"
echo "Portal   http://localhost:4001"
echo ""

npm run api:dev &
npm run ehr:dev &
npm run portal:dev &
wait
LAUNCHER
chmod +x "${SCRIPT_DIR}/start-local.sh"

# macOS xargs doesn't have -r
if [[ "$(uname)" == "Darwin" ]]; then
  sed_inplace 's/xargs -r/xargs/g' "${SCRIPT_DIR}/start-local.sh"
fi

cat <<EOF

╔══════════════════════════════════════════════════════════════╗
║        CareConnect local development ready                   ║
╚══════════════════════════════════════════════════════════════╝

API env : ${RUNTIME_DIR}/careconnect-api.env
Database: ${DATA_DIR}/careconnect.db

Start everything:
  ./deploy/start-local.sh

Or start individually (source API env first for api:dev):
  set -a && source deploy/runtime/careconnect-api.env && set +a
  npm run api:dev      # :5000
  npm run ehr:dev      # :4000
  npm run portal:dev   # :4001

Login: admin@se-tools.net / seeded demo password

Production deploy (Ubuntu VM):
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

EOF
