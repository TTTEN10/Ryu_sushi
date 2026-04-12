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

# Prefer dedicated chatbot VM. If SSH (or routing) to it fails, colocate chatbot on the app server so
# deploy-app.sh can use SINGLE_HOST + host.docker.internal (avoids broken app↔chatbot public paths).
COLOCATE_CHATBOT_ON_APP=0
if ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "exit" 2>/dev/null; then
  log "STEP 3 — Sync repo slice and start chatbot compose on ${CHATBOT_HOST}"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"

  run_ssh "${CHATBOT_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"

  log "STEP 4 — Verify chatbot /health (local curl and/or on-host curl)"
  ok=0
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 5 "http://${CHATBOT_HOST}:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    if ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "curl -fsS --max-time 5 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 3
  done
  [[ "${ok}" -eq 1 ]] || die "Chatbot health check failed on ${CHATBOT_HOST} (public :8000 and on-host loopback)"
else
  COLOCATE_CHATBOT_ON_APP=1
  log "WARN — Cannot SSH to chatbot host ${CHATBOT_HOST} (timeout/refused). Colocating chatbot on app server ${APP_HOST}."
  log "STEP 3b — Sync chatbot compose to ${APP_HOST} and start it"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"

  run_ssh "${APP_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"

  log "STEP 4b — Verify colocated chatbot /health on app host (loopback)"
  ok=0
  for i in $(seq 1 36); do
    if ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 5
  done
  [[ "${ok}" -eq 1 ]] || die "Colocated chatbot health check failed on ${APP_HOST} (http://127.0.0.1:8000/health)"
fi

log "STEP 5 — App stack (deploy-app.sh with SKIP_VLLM_DEPLOY + chatbot URL)"
export APP_DOMAIN
export CADDY_SITE_NAMES
export APP_IP="${APP_HOST}"
export SKIP_VLLM_DEPLOY=1
export CHATBOT_HEALTH_PATH=/health
if [[ "${COLOCATE_CHATBOT_ON_APP}" -eq 1 ]]; then
  export SINGLE_HOST=1
  export API_IP="${APP_HOST}"
  unset MODEL_API_URL_FOR_COMPOSE || true
  unset MODEL_API_URL_ALT_FOR_COMPOSE || true
else
  export SINGLE_HOST=0
  export API_IP="${CHATBOT_HOST}"
  export MODEL_API_URL_FOR_COMPOSE="http://${CHATBOT_HOST}:8000"
  export MODEL_API_URL_ALT_FOR_COMPOSE="http://${CHATBOT_PRIVATE_IP}:8000"
fi
exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
