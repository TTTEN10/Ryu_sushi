#!/usr/bin/env bash
# Preset wrapper: single-host app deploy, Scaleway direct (validated prod path).
# See documentation/private documentation/DEPLOY-RUNBOOK.md for infrastructure, secrets, and troubleshooting.
# Local parity: ./deployment/deploy-local-app.sh
#
# Usage:
#   SCALEWAY_API_KEY=... ./deployment/deploy-live-app.sh
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
  set +a
fi
export DEPLOY_LEGACY=1
export USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
export SKIP_CHATBOT_DEPLOY=1
export ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-1}"
export SINGLE_HOST="${SINGLE_HOST:-1}"
export SKIP_VLLM_DEPLOY=1
export DEPLOY_FRESH_CONTAINERS="${DEPLOY_FRESH_CONTAINERS:-1}"
export SSH_BOOT_WAIT_SEC="${SSH_BOOT_WAIT_SEC:-180}"
export APP_IP="${APP_IP:-151.115.151.231}"
export API_IP="${API_IP:-${APP_IP}}"
export APP_DOMAIN="${APP_DOMAIN:-polinapsycho.com}"
export APP_DOMAIN_APP="${APP_DOMAIN_APP:-app.polinapsycho.com}"
export APP_APP_IP="${APP_APP_IP:-51.159.160.246}"
export CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-polinapsycho.com, www.polinapsycho.com}"
# Enable Redis for quota enforcement in production
export APP_ENABLE_REDIS="${APP_ENABLE_REDIS:-1}"
exec "${SCRIPT_DIR}/deploy.sh" "$@"
