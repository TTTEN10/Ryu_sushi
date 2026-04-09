#!/usr/bin/env bash
# End-to-end deploy: Terraform (prod) → chatbot compose on chatbot host → app stack via deploy-app.sh
#
# Prerequisites: SSH (root) to hosts, Scaleway API keys for Terraform, TF_VAR_* or .tfvars.
#
# Local destructive Docker cleanup (docker system prune) is NOT part of this script.
# Run only when explicitly intended: CONFIRM_DEPLOYMENT_RESET=true docker system prune -a --volumes -f
#
# Legacy one-liner (deploy-app only): DEPLOY_LEGACY=1 ./deployment/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"

# Production site (passed to deploy-app.sh for Vite `VITE_API_URL`, Caddy TLS, HTTPS checks)
APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"

CHATBOT_HOST="${CHATBOT_HOST:-51.159.118.165}"
APP_HOST="${APP_HOST:-51.159.149.66}"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

log "STEP 1 — Build (optional local validation)"
if command -v docker >/dev/null 2>&1; then
  docker build -t safepsy-chatbot:local "${REPO_ROOT}/apps/ai-chatbot" || log "Local docker build skipped or failed (non-fatal)"
else
  log "docker not installed locally; build will happen on ${CHATBOT_HOST}"
fi

log "STEP 2 — Terraform (infra/terraform/envs/prod)"
if ! command -v terraform >/dev/null 2>&1; then
  die "terraform not found in PATH"
fi
# Credentials: (1) export TF_VAR_scaleway_* or TF_VAR_access_key / TF_VAR_secret_key / TF_VAR_project_id, OR
# (2) place infra/terraform/envs/prod/terraform.tfvars (gitignored) with scaleway_* — Terraform loads it automatically.
export TF_VAR_scaleway_access_key="${TF_VAR_scaleway_access_key:-${TF_VAR_access_key:-}}"
export TF_VAR_scaleway_secret_key="${TF_VAR_scaleway_secret_key:-${TF_VAR_secret_key:-}}"
export TF_VAR_scaleway_project_id="${TF_VAR_scaleway_project_id:-${TF_VAR_project_id:-}}"
_tfvars="${TF_DIR}/terraform.tfvars"
if [[ -z "${TF_VAR_scaleway_access_key:-}" || -z "${TF_VAR_scaleway_secret_key:-}" || -z "${TF_VAR_scaleway_project_id:-}" ]]; then
  if [[ -f "${_tfvars}" ]]; then
    log "Using Scaleway credentials from ${_tfvars} (TF_VAR_* not all set)."
  else
    die "Set Scaleway credentials: export TF_VAR_scaleway_access_key, TF_VAR_scaleway_secret_key, TF_VAR_scaleway_project_id (or TF_VAR_access_key, TF_VAR_secret_key, TF_VAR_project_id), OR create ${_tfvars} from terraform.tfvars.example."
  fi
fi
(
  cd "${TF_DIR}"
  terraform init -backend=false
  terraform apply -auto-approve -input=false
)

CHATBOT_PRIVATE_IP="$(cd "${TF_DIR}" && terraform output -raw chatbot_private_ip)"
[[ -n "${CHATBOT_PRIVATE_IP}" ]] || die "terraform output chatbot_private_ip empty"

log "STEP 3 — Sync repo slice and start chatbot compose on ${CHATBOT_HOST}"
tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"

run_ssh "${CHATBOT_HOST}" "bash -lc '
  set -euo pipefail
  mkdir -p /data
  cd \"${REMOTE_BASE}/deployment/chatbot\"
  docker compose pull || true
  docker compose up -d --build
  docker compose ps
'"

log "STEP 4 — Verify chatbot /health (up to 5 attempts)"
ok=0
for i in 1 2 3 4 5; do
  if curl -fsS --max-time 5 "http://${CHATBOT_HOST}:8000/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 3
done
[[ "${ok}" -eq 1 ]] || die "Chatbot health check failed at http://${CHATBOT_HOST}:8000/health"

log "STEP 5 — App stack (deploy-app.sh with SKIP_VLLM_DEPLOY + chatbot URL)"
export APP_DOMAIN
export CADDY_SITE_NAMES
export APP_IP="${APP_HOST}"
export API_IP="${CHATBOT_HOST}"
export SKIP_VLLM_DEPLOY=1
export CHATBOT_HEALTH_PATH=/health
# Primary: public host (routable from app Docker → internet → chatbot SG). Alt: Terraform IP (e.g. same or VPC).
export MODEL_API_URL_FOR_COMPOSE="http://${CHATBOT_HOST}:8000"
export MODEL_API_URL_ALT_FOR_COMPOSE="http://${CHATBOT_PRIVATE_IP}:8000"
exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
