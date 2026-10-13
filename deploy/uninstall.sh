#!/usr/bin/env bash
#
# Remove CareConnect from this VM (keeps Node.js and nginx installed).
#
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Run as root: sudo deploy/uninstall.sh" >&2
  exit 1
fi

read -r -p "Remove CareConnect? This deletes /opt/careconnect and /var/www/careconnect [y/N] " confirm
[[ "${confirm}" =~ ^[Yy]$ ]] || exit 0

systemctl stop careconnect-api 2>/dev/null || true
systemctl disable careconnect-api 2>/dev/null || true
rm -f /etc/systemd/system/careconnect-api.service
systemctl daemon-reload

systemctl stop nginx 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/careconnect.conf
rm -f /etc/nginx/sites-available/careconnect.conf

rm -rf /opt/careconnect /var/www/careconnect /etc/careconnect /var/lib/careconnect

if id careconnect &>/dev/null; then
  userdel careconnect 2>/dev/null || true
fi

systemctl enable nginx 2>/dev/null || true
systemctl start nginx 2>/dev/null || true
echo "CareConnect removed."
