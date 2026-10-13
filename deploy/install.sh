#!/usr/bin/env bash
#
# CareConnect installer — Ubuntu VM (production) or --local (macOS dev)
#
# Production (Ubuntu VM):
#   sudo ./deploy/install.sh --config deploy/<environment>.env
#
# Local development (macOS/Linux, no sudo):
#   ./deploy/install.sh --local
#   ./deploy/install.sh --local --config deploy/<environment>.env
#
# Remote VM deploy from Mac:
#   ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=deploy/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

# Defaults
CONFIG_FILE="/etc/careconnect/careconnect.env"
SKIP_SSL=true
CLI_SSL_EMAIL=""
LOCAL_INSTALL=false

is_debian_ubuntu() {
  grep -qi 'ubuntu\|debian' /etc/os-release 2>/dev/null && command -v apt-get >/dev/null 2>&1
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# GNU sed (Linux) vs BSD sed (macOS) compatible in-place edit
sed_inplace() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

wait_for_api() {
  local port="${1:-5000}"
  local attempts="${2:-45}"
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf "http://127.0.0.1:${port}/health" 2>/dev/null | grep -q '"service"[[:space:]]*:[[:space:]]*"careconnect-api"'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

check_api_port() {
  local port="${1:-5000}"
  if ! curl -sf "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    return 0
  fi
  if curl -sf "http://127.0.0.1:${port}/health" 2>/dev/null | grep -q '"service"[[:space:]]*:[[:space:]]*"careconnect-api"'; then
    return 0
  fi
  warn "Port ${port} responds to /health but is NOT careconnect-api (another service may be bound)."
  warn "Stop the conflicting service, then: systemctl restart careconnect-api"
  ss -tlnp 2>/dev/null | grep ":${port} " || true
  return 1
}

usage() {
  cat <<'EOF'
CareConnect Installer

Usage:
  Production (Ubuntu VM — requires sudo):
    sudo deploy/install.sh [options]

  Local development (macOS/Linux — no sudo):
    deploy/install.sh --local [--config PATH]

Options:
  --local            Dev setup on this machine (npm + API env, no nginx/systemd)
  --config PATH      Environment file
  --ssl              Enable Let's Encrypt HTTPS (requires DNS on this VM)
  --email EMAIL      Contact email for Let's Encrypt
  --mode MODE        subdomain | path | ports
  --domain DOMAIN    Primary domain (e.g. se-tools.net)
  --portal-host H    Subdomain for portal (default: portal)
  --ehr-host H       Subdomain for EHR (default: ehr)
  --portal-port N    HTTP port for portal (default: 80)
  --ehr-port N       HTTP port for EHR (default: 80)
  --help             Show this help

Examples:
  deploy/install.sh --local
  sudo deploy/install.sh --config deploy/<environment>.env
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) LOCAL_INSTALL=true; shift ;;
    --config) CONFIG_FILE="$2"; shift 2 ;;
    --ssl) SKIP_SSL=false; shift ;;
    --email) CLI_SSL_EMAIL="$2"; shift 2 ;;
    --mode) DEPLOY_MODE_OVERRIDE="$2"; shift 2 ;;
    --domain) DOMAIN_OVERRIDE="$2"; shift 2 ;;
    --portal-host) PORTAL_HOST_OVERRIDE="$2"; shift 2 ;;
    --ehr-host) EHR_HOST_OVERRIDE="$2"; shift 2 ;;
    --portal-port) PORTAL_PORT_OVERRIDE="$2"; shift 2 ;;
    --ehr-port) EHR_PORT_OVERRIDE="$2"; shift 2 ;;
    --help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

if [[ "${LOCAL_INSTALL}" == "true" ]]; then
  if [[ "${CONFIG_FILE}" == "/etc/careconnect/careconnect.env" ]]; then
    exec "${SCRIPT_DIR}/install-local.sh"
  else
    exec "${SCRIPT_DIR}/install-local.sh" --config "${CONFIG_FILE}"
  fi
fi

if [[ "$(id -u)" -ne 0 ]]; then
  die "Production install requires root: sudo deploy/install.sh

For local development on macOS:
  deploy/install.sh --local

To deploy to an Ubuntu VM:
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env"
fi

if ! is_debian_ubuntu; then
  die "Production install requires Ubuntu/Debian (apt-get, nginx, systemd).

You appear to be on: $(uname -s)

For local development:
  deploy/install.sh --local --config deploy/<environment>.env

To deploy to your Ubuntu VM:
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env"
fi

# Load or seed config
if [[ "${CONFIG_FILE}" != /* ]]; then
  if [[ -f "${PROJECT_ROOT}/${CONFIG_FILE}" ]]; then
    CONFIG_FILE="${PROJECT_ROOT}/${CONFIG_FILE}"
  elif [[ -f "${CONFIG_FILE}" ]]; then
    CONFIG_FILE="$(cd "$(dirname "${CONFIG_FILE}")" && pwd)/$(basename "${CONFIG_FILE}")"
  fi
fi

mkdir -p "$(dirname "${CONFIG_FILE}")"
if [[ ! -f "${CONFIG_FILE}" ]]; then
  log "Creating config at ${CONFIG_FILE}"
  cp "${SCRIPT_DIR}/careconnect.env.example" "${CONFIG_FILE}"
fi

# Load deploy config before resolving canonical path (CONFIG_DIR lives in the env file)
# shellcheck disable=SC1090
source "${CONFIG_FILE}"

: "${CONFIG_DIR:=/etc/careconnect}"

# Production installs always keep canonical config under /etc/careconnect
CANONICAL_CONFIG="${CONFIG_DIR}/careconnect.env"
if [[ "${CONFIG_FILE}" != "${CANONICAL_CONFIG}" ]]; then
  mkdir -p "${CONFIG_DIR}"
  cp "${CONFIG_FILE}" "${CANONICAL_CONFIG}"
  CONFIG_FILE="${CANONICAL_CONFIG}"
  # shellcheck disable=SC1090
  source "${CONFIG_FILE}"
fi

# Apply CLI overrides
[[ -n "${DEPLOY_MODE_OVERRIDE:-}" ]] && DEPLOY_MODE="${DEPLOY_MODE_OVERRIDE}"
[[ -n "${DOMAIN_OVERRIDE:-}" ]] && DOMAIN="${DOMAIN_OVERRIDE}"
[[ -n "${PORTAL_HOST_OVERRIDE:-}" ]] && PORTAL_HOST="${PORTAL_HOST_OVERRIDE}"
[[ -n "${EHR_HOST_OVERRIDE:-}" ]] && EHR_HOST="${EHR_HOST_OVERRIDE}"
[[ -n "${PORTAL_PORT_OVERRIDE:-}" ]] && PORTAL_PORT="${PORTAL_PORT_OVERRIDE}"
[[ -n "${EHR_PORT_OVERRIDE:-}" ]] && EHR_PORT="${EHR_PORT_OVERRIDE}"
[[ -n "${CLI_SSL_EMAIL}" ]] && SSL_EMAIL="${CLI_SSL_EMAIL}"
[[ "${SKIP_SSL}" == "false" ]] && ENABLE_SSL="true"

# Defaults for optional vars (older config files may omit these)
: "${API_PORT:=5000}"
: "${CARECONNECT_DATA_DIR:=/var/lib/careconnect}"
: "${APP_USER:=careconnect}"
: "${INSTALL_DIR:=/opt/careconnect}"
: "${WWW_ROOT:=/var/www/careconnect}"
: "${CONFIG_DIR:=/etc/careconnect}"
: "${NODE_MAJOR:=22}"
: "${ENABLE_SSL:=false}"
: "${SSL_EMAIL:=admin@se-tools.net}"

# Generate JWT secret on first install
if [[ -z "${JWT_SECRET:-}" ]]; then
  if [[ -f "${CONFIG_DIR}/careconnect-api.env" ]] && grep -q '^JWT_SECRET=' "${CONFIG_DIR}/careconnect-api.env" 2>/dev/null; then
    JWT_SECRET="$(grep '^JWT_SECRET=' "${CONFIG_DIR}/careconnect-api.env" | cut -d= -f2-)"
  else
    JWT_SECRET="$(openssl rand -hex 32)"
    log "Generated new JWT_SECRET"
  fi
fi

# Generate the seeded demo accounts' password on first install. The documented
# default is public, and the API refuses it under NODE_ENV=production.
if [[ -z "${SEEDED_PASSWORD:-}" ]]; then
  if [[ -f "${CONFIG_DIR}/careconnect-api.env" ]] && grep -q '^SEEDED_PASSWORD=' "${CONFIG_DIR}/careconnect-api.env" 2>/dev/null; then
    SEEDED_PASSWORD="$(grep '^SEEDED_PASSWORD=' "${CONFIG_DIR}/careconnect-api.env" | cut -d= -f2-)"
  else
    SEEDED_PASSWORD="$(openssl rand -hex 12)"
    log "Generated new SEEDED_PASSWORD (in ${CONFIG_DIR}/careconnect-api.env)"
  fi
fi

# Persist config
persist_config() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${CONFIG_FILE}" 2>/dev/null; then
    sed_inplace "s|^${key}=.*|${key}=\"${val}\"|" "${CONFIG_FILE}"
  else
    echo "${key}=\"${val}\"" >> "${CONFIG_FILE}"
  fi
}

persist_config_num() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${CONFIG_FILE}" 2>/dev/null; then
    sed_inplace "s|^${key}=.*|${key}=${val}|" "${CONFIG_FILE}"
  else
    echo "${key}=${val}" >> "${CONFIG_FILE}"
  fi
}

persist_config DEPLOY_MODE "${DEPLOY_MODE}"
persist_config DOMAIN "${DOMAIN}"
persist_config PORTAL_HOST "${PORTAL_HOST}"
persist_config EHR_HOST "${EHR_HOST}"
persist_config_num PORTAL_PORT "${PORTAL_PORT}"
persist_config_num EHR_PORT "${EHR_PORT}"
persist_config JWT_SECRET "${JWT_SECRET}"

log "CareConnect installer"
log "  Domain:    ${DOMAIN}"
log "  Mode:      ${DEPLOY_MODE}"
if [[ "${DEPLOY_MODE}" == "subdomain" ]]; then
  log "  Portal:    ${PORTAL_HOST}.${DOMAIN}:${PORTAL_PORT}"
  log "  EHR:       ${EHR_HOST}.${DOMAIN}:${EHR_PORT}"
fi
log "  Source:    ${PROJECT_ROOT}"
log "  Install:   ${INSTALL_DIR}"

# --- System packages ---
log "Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  ca-certificates \
  curl \
  gnupg \
  nginx \
  gettext-base \
  rsync \
  unzip \
  git \
  ufw \
  openssl

# --- Node.js ---
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "${NODE_MAJOR}" ]]; then
  log "Installing Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "Node $(node -v) · npm $(npm -v)"

# --- App user ---
if ! id "${APP_USER}" &>/dev/null; then
  log "Creating system user: ${APP_USER}"
  useradd --system --home-dir "${INSTALL_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi

# --- Deploy application source ---
log "Syncing application to ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"

# Legacy dirs from pre-monorepo stacks block rsync --delete
for legacy in admin-portal patient-portal provider-portal provider-mobile .cache; do
  if [[ -d "${INSTALL_DIR}/${legacy}" ]]; then
    log "Removing legacy directory: ${INSTALL_DIR}/${legacy}"
    rm -rf "${INSTALL_DIR}/${legacy}"
  fi
done

rsync -a --delete --force \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude .turbo \
  --exclude .remember \
  "${PROJECT_ROOT}/" "${INSTALL_DIR}/"

chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}"

# --- Build (npm ci + all workspace builds) ---
# Every workspace, the design system included, is private and built from source
# here, so npm needs no registry credentials on this VM.
log "Building production assets..."
sudo -u "${APP_USER}" env HOME="${INSTALL_DIR}" DEPLOY_MODE="${DEPLOY_MODE}" \
  bash "${INSTALL_DIR}/deploy/build-production.sh" "${CONFIG_FILE}" all

# --- Publish static files ---
# Frontends live in ${WWW_ROOT}/releases/<app>/<release-id> behind a symlink,
# the same layout deploy-artifact.sh uses, so CI deploys and rollbacks of one
# frontend never touch the other.
cc_apply_config_defaults
RELEASE_ID="source-$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%dT%H%M%SZ)"
log "Publishing to ${WWW_ROOT} (release ${RELEASE_ID})..."
cc_publish_frontend portal "${INSTALL_DIR}/apps/portal/dist" "${RELEASE_ID}"
cc_publish_frontend ehr "${INSTALL_DIR}/apps/ehr/dist" "${RELEASE_ID}"

# --- API environment + systemd (survives reboot) ---
log "Setting up CareConnect API service..."
mkdir -p "${CONFIG_DIR}" "${CARECONNECT_DATA_DIR}"
chown "${APP_USER}:${APP_USER}" "${CARECONNECT_DATA_DIR}"

check_api_port "${API_PORT}" || true

cat > "${CONFIG_DIR}/careconnect-api.env" <<EOF
NODE_ENV=production
PORT=${API_PORT}
CARECONNECT_DATA_DIR=${CARECONNECT_DATA_DIR}
JWT_SECRET=${JWT_SECRET}
SEEDED_PASSWORD=${SEEDED_PASSWORD}
EOF
chmod 600 "${CONFIG_DIR}/careconnect-api.env"
chown root:root "${CONFIG_DIR}/careconnect-api.env"

cp "${INSTALL_DIR}/deploy/systemd/careconnect-api.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable careconnect-api
systemctl restart careconnect-api

log "Waiting for API to become healthy..."
if wait_for_api "${API_PORT}" 45; then
  log "API is healthy on port ${API_PORT}"
else
  warn "CareConnect API health check failed — inspect: journalctl -u careconnect-api -n 50 --no-pager"
  check_api_port "${API_PORT}" || true
fi

# --- nginx (survives reboot) ---
log "Configuring nginx..."
NGINX_CONF="/etc/nginx/sites-available/careconnect.conf"
NGINX_TEMPLATE="${SCRIPT_DIR}/nginx/${DEPLOY_MODE}.conf.template"

case "${DEPLOY_MODE}" in
  subdomain|path|ports) ;;
  *) die "Invalid DEPLOY_MODE: ${DEPLOY_MODE} (use subdomain, path, or ports)" ;;
esac

[[ -f "${NGINX_TEMPLATE}" ]] || die "Missing nginx template: ${NGINX_TEMPLATE}"

env \
  DOMAIN="${DOMAIN}" \
  PORTAL_HOST="${PORTAL_HOST}" \
  EHR_HOST="${EHR_HOST}" \
  PORTAL_PORT="${PORTAL_PORT}" \
  EHR_PORT="${EHR_PORT}" \
  WWW_ROOT="${WWW_ROOT}" \
  envsubst '${DOMAIN} ${PORTAL_HOST} ${EHR_HOST} ${PORTAL_PORT} ${EHR_PORT} ${WWW_ROOT}' \
  < "${NGINX_TEMPLATE}" > "${NGINX_CONF}"

ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/careconnect.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# --- Firewall ---
if command -v ufw >/dev/null 2>&1; then
  log "Configuring firewall..."
  ufw allow OpenSSH >/dev/null 2>&1 || true
  if [[ "${DEPLOY_MODE}" == "ports" ]]; then
    ufw allow "${PORTAL_PORT}/tcp" >/dev/null 2>&1 || true
    ufw allow "${EHR_PORT}/tcp" >/dev/null 2>&1 || true
  elif [[ "${DEPLOY_MODE}" == "subdomain" ]]; then
    ufw allow "${PORTAL_PORT}/tcp" >/dev/null 2>&1 || true
    ufw allow "${EHR_PORT}/tcp" >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
  else
    ufw allow 'Nginx Full' >/dev/null 2>&1 || ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1 || true
  fi
  ufw --force enable >/dev/null 2>&1 || true
fi

# --- SSL (optional) ---
if [[ "${ENABLE_SSL}" == "true" && "${DEPLOY_MODE}" == "subdomain" ]]; then
  log "Requesting Let's Encrypt certificates..."
  apt-get install -y -qq certbot python3-certbot-nginx
  certbot --nginx --non-interactive --agree-tos --email "${SSL_EMAIL}" \
    -d "${PORTAL_HOST}.${DOMAIN}" \
    -d "${EHR_HOST}.${DOMAIN}" || warn "Certbot failed — check DNS records"
  systemctl reload nginx
fi

# --- Verify services enabled for boot ---
log "Verifying services will start on boot..."
systemctl is-enabled careconnect-api >/dev/null || die "careconnect-api is not enabled"
systemctl is-enabled nginx >/dev/null || die "nginx is not enabled"

# --- Summary ---
VM_IP="$(hostname -I | awk '{print $1}')"
API_STATUS="$(curl -sf "http://127.0.0.1:${API_PORT}/health" 2>/dev/null || echo 'unreachable')"

cat <<EOF

╔══════════════════════════════════════════════════════════════╗
║           CareConnect installed successfully                 ║
╚══════════════════════════════════════════════════════════════╝

Mode: ${DEPLOY_MODE}
Domain: ${DOMAIN}
API health: ${API_STATUS}

Services (enabled on boot):
  careconnect-api  →  systemctl status careconnect-api
  nginx            →  systemctl status nginx

EOF

case "${DEPLOY_MODE}" in
  subdomain)
    cat <<EOF
  Patient Portal : http://${PORTAL_HOST}.${DOMAIN}
  Staff EHR      : http://${EHR_HOST}.${DOMAIN}

DNS A records required (→ ${VM_IP}):
  ${PORTAL_HOST}.${DOMAIN}
  ${EHR_HOST}.${DOMAIN}
EOF
    ;;
  path)
    cat <<EOF
  Patient Portal : http://${DOMAIN}/
  Staff EHR      : http://${DOMAIN}/ehr/
EOF
    ;;
  ports)
    cat <<EOF
  Patient Portal : http://${VM_IP}:${PORTAL_PORT}
  Staff EHR      : http://${VM_IP}:${EHR_PORT}
EOF
    ;;
esac

cat <<EOF

Config : ${CONFIG_FILE}
API env: ${CONFIG_DIR}/careconnect-api.env
Logs   : journalctl -u careconnect-api -f
         journalctl -u nginx -f
Update : sudo ${INSTALL_DIR}/deploy/update.sh

EOF
