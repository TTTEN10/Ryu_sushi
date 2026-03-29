#!/usr/bin/env bash
# Run install-scaleway-vmagent.sh on a Scaleway Instance over SSH (as root).
#
# Env:
#   APP_IP    target host (default: 51.159.117.169, same default as install-app-monitor-remote.sh)
#   SSH_KEY   optional path to private key (-i)
#
# Usage:
#   APP_IP=51.159.x.x bash deployment/install-scaleway-vmagent-remote.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_IP="${APP_IP:-51.159.117.169}"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
fi

INSTALLER="${REPO_ROOT}/deployment/install-scaleway-vmagent.sh"

printf 'Installing scaleway-vmagent on root@%s\n' "${APP_IP}"

scp "${SSH_OPTS[@]}" "${INSTALLER}" "root@${APP_IP}:/tmp/install-scaleway-vmagent.sh"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" 'bash /tmp/install-scaleway-vmagent.sh && rm -f /tmp/install-scaleway-vmagent.sh'

printf 'Done.\n'
