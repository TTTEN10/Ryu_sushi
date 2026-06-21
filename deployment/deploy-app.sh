#!/usr/bin/env bash
set -euo pipefail

# App stack deploy (Caddy + Vite SPA + Python API proxy). Invoked by deployment/deploy.sh — prefer that entrypoint.
#
# Direct use only for debugging or DEPLOY_LEGACY=1:
#   DEPLOY_LEGACY=1 ./deployment/deploy.sh
#   # or: USE_SCALEWAY_DIRECT=1 SCALEWAY_API_KEY=... ./deployment/deploy-app.sh
#
# Instance-aware end-to-end deployment script for:
# - API server (vLLM/OpenAI-compatible endpoint) — legacy when USE_SCALEWAY_DIRECT=0
# - App server (frontend + Python API proxy + caddy)
#
# LLM routing (see documentation/private documentation/chatbot.md and documentation/private documentation/chatbot.md):
#   USE_SCALEWAY_DIRECT=1  — Python proxy → Scaleway Generative API (no chatbot :8000)
#   USE_SCALEWAY_DIRECT=0  — Python proxy → FastAPI chatbot (MODEL_API_URL / SKIP_VLLM_DEPLOY)
#
# Strict order:
# 1) Deploy API server first
# 2) Verify API responds
# 3) Deploy APP server stack
# 4) Validate backend -> API connectivity
# 5) Harden API exposure
#
# Usage:
#   chmod +x deployment/deploy-app.sh
#   ./deployment/deploy-app.sh
#
# Optional overrides:
#   APP_IP=... API_IP=... CADDY_SITE_NAMES=... APP_USER=... SSH_KEY=... \
#   VLLM_IMAGE=... VLLM_DOCKER_GPU_ARGS=... VLLM_TOKENIZER_MODE=... VLLM_CPU_KVCACHE_SPACE=... VLLM_DTYPE=... \
#   MODEL_ID=... FALLBACK_MODEL_ID=... MAX_MODEL_LEN=... \
#   VLLM_TENSOR_PARALLEL_SIZE=... VLLM_EXTRA_DOCKER_ARGS=... \
#   VLLM_DOCKER_MEMORY=... ./deployment/deploy-app.sh
#
# CADDY_SITE_NAMES: comma-separated hostnames for one Caddy site block (ACME cert covers all).
#   Default: polinapsycho.com, www.polinapsycho.com
#
# SINGLE_HOST=1: run vLLM on APP_IP only (bind 127.0.0.1:8000). Use when SSH to API_IP fails or there is no separate API VM.
#   Example: SINGLE_HOST=1 APP_IP=51.159.149.66 ./deployment/deploy-app.sh
#
# REUSE_CONTAINERS=1: restart existing Docker containers only (docker restart vllm; docker compose restart).
#   No rm/run, no compose --build, no frontend sync. Requires a prior full deploy on the host(s).
#
# DEPLOY_FRESH_CONTAINERS=1: on the app host, docker compose down --remove-orphans, compose build --no-cache,
#   then up --force-recreate (full image rebuild for frontend/backend). Ignored when REUSE_CONTAINERS=1.
#
# USE_SCALEWAY_DIRECT=1: skip chatbot/vLLM health gates; backend calls Scaleway (requires SCALEWAY_API_KEY on deploy host).
# SKIP_CHATBOT_DEPLOY=1: same skip semantics when invoked from deployment/deploy.sh.

# Defaults: scw-happy-app (app+frontend) and scw-new-psy (FastAPI chatbot / LLM API — legacy)
APP_IP="${APP_IP:-151.115.151.231}"
API_IP="${API_IP:-151.115.151.231}"
SINGLE_HOST="${SINGLE_HOST:-0}"
REUSE_CONTAINERS="${REUSE_CONTAINERS:-0}"
DEPLOY_FRESH_CONTAINERS="${DEPLOY_FRESH_CONTAINERS:-0}"
# When 1, do not run the vLLM docker container; use an external FastAPI chatbot (e.g. docker compose on API_IP).
SKIP_VLLM_DEPLOY="${SKIP_VLLM_DEPLOY:-0}"
CHATBOT_HEALTH_PATH="${CHATBOT_HEALTH_PATH:-/health}"
# Canonical browser URL (used in success output / checks)
APP_DOMAIN="${APP_DOMAIN:-polinapsycho.com}"
# Vite build-time vars (baked into SPA bundle on deploy)
VITE_WALLETCONNECT_PROJECT_ID="${VITE_WALLETCONNECT_PROJECT_ID:-391299af5aedd1d51ef83d5e79e1a46d}"
# Hostnames Caddy will terminate TLS for (must match DNS A/AAAA to this server)
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-polinapsycho.com, www.polinapsycho.com}"
APP_USER="${APP_USER:-safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"
# When 1, deployment must not fail if chatbot/vLLM is unavailable.
ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-0}"
SKIP_CHATBOT_DEPLOY="${SKIP_CHATBOT_DEPLOY:-0}"
USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-}"
if [[ "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  SKIP_CHATBOT_DEPLOY=1
  SKIP_VLLM_DEPLOY=1
fi
SCALEWAY_API_KEY="${SCALEWAY_API_KEY:-}"
SCALEWAY_PROJECT_ID="${SCALEWAY_PROJECT_ID:-5dad0cb7-c16a-4447-9a25-e89bd3448e8a}"
SCALEWAY_MODEL="${SCALEWAY_MODEL:-mistral-small-3.2-24b-instruct-2506}"
SCALEWAY_API_BASE_URL="${SCALEWAY_API_BASE_URL:-}"

API_PORT="${API_PORT:-8000}"
# Dolphin 24B needs a CUDA image + GPU; override for CPU-only dev (e.g. smaller MODEL_ID + vllm/vllm-openai-cpu:latest).
VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai:latest}"
VLLM_DOCKER_GPU_ARGS="${VLLM_DOCKER_GPU_ARGS:---gpus all}"
# Primary: dphn/Dolphin-Mistral-24B-Venice-Edition (Mistral tokenizer). Fallback: Qwen (no --tokenizer-mode on fallback).
MODEL_ID="${MODEL_ID:-dphn/Dolphin-Mistral-24B-Venice-Edition}"
FALLBACK_MODEL_ID="${FALLBACK_MODEL_ID:-Qwen/Qwen2.5-3B-Instruct}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
FALLBACK_MAX_MODEL_LEN="${FALLBACK_MAX_MODEL_LEN:-8192}"
VLLM_CPU_KVCACHE_SPACE="${VLLM_CPU_KVCACHE_SPACE:-1}"
VLLM_DTYPE="${VLLM_DTYPE:-auto}"
VLLM_TENSOR_PARALLEL_SIZE="${VLLM_TENSOR_PARALLEL_SIZE:-1}"
# Applied only to MODEL_ID (see https://huggingface.co/dphn/Dolphin-Mistral-24B-Venice-Edition — vLLM + tokenizer_mode mistral).
VLLM_TOKENIZER_MODE="${VLLM_TOKENIZER_MODE:-mistral}"
# Example GPU image extras: VLLM_EXTRA_DOCKER_ARGS='--gpu-memory-utilization 0.9'
VLLM_EXTRA_DOCKER_ARGS="${VLLM_EXTRA_DOCKER_ARGS:-}"
# cgroup cap; 24B BF16 needs substantial host RAM / VRAM — raise if the instance allows.
VLLM_DOCKER_MEMORY="${VLLM_DOCKER_MEMORY:-80g}"

APP_BASE_DIR="/home/${APP_USER}/app"
API_BASE_DIR="/home/${APP_USER}/llm-api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_SRC_DIR="${WEB_SRC_DIR:-${REPO_ROOT}/apps/web}"
NODE_API_DOCKERFILE="${SCRIPT_DIR}/local-app/node-api/Dockerfile"
SCRIPT_VERSION="2026-04-07.1"

# Node API (wallet SIWE, DID, encrypted chat) — required for /api/auth/* on production (Python proxy is LLM-only).
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
  set +a
fi
JWT_SECRET="${JWT_SECRET:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"
IP_SALT="${IP_SALT:-}"
IP_HASHING_ENABLED="${IP_HASHING_ENABLED:-true}"
if [[ "${APP_DOMAIN}" == www.* ]]; then
  NODE_API_FRONTEND_URL="https://${APP_DOMAIN}"
else
  NODE_API_FRONTEND_URL="https://${APP_DOMAIN},https://www.${APP_DOMAIN}"
fi
SIWE_DOMAIN="${SIWE_DOMAIN:-${APP_DOMAIN}}"
SIWE_URI="${SIWE_URI:-https://${APP_DOMAIN}}"

# Node API: Sepolia DID reads + Prisma encrypted chat (wallet funnel after SIWE).
NODE_API_RPC_URL="${RPC_URL:-${ETH_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}}"
NODE_API_DID_REGISTRY="${DID_REGISTRY_ADDRESS:-0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5}"
NODE_API_DID_IDENTITY="${DID_IDENTITY_TOKEN_ADDRESS:-0x103eAd096f898132E138ad228E35296db983A053}"
WEB_VITE_DID="${VITE_DID_IDENTITY_TOKEN_ADDRESS:-${NODE_API_DID_IDENTITY}}"
WEB_VITE_RPC="${VITE_RPC_URL:-${NODE_API_RPC_URL}}"
NODE_API_DATABASE_URL="${DATABASE_URL:-}"
APP_ENABLE_POSTGRES=0
APP_PG_USER="safepsy_user"
APP_PG_PASS=""
APP_PG_DB="safepsy"
if [[ -n "${NODE_API_DATABASE_URL}" ]]; then
  eval "$(
    DATABASE_URL="${NODE_API_DATABASE_URL}" node <<'NODE'
const u = new URL(process.env.DATABASE_URL);
const host = u.hostname;
const needsPostgres = host === 'localhost' || host === '127.0.0.1';
const composeUrl = needsPostgres
  ? process.env.DATABASE_URL.replace(host, 'postgres')
  : process.env.DATABASE_URL;
const esc = (s) => JSON.stringify(s);
console.log(`export NODE_API_DATABASE_URL=${esc(composeUrl)}`);
console.log(`export APP_ENABLE_POSTGRES=${needsPostgres ? '1' : '0'}`);
console.log(`export APP_PG_USER=${esc(u.username || 'safepsy_user')}`);
console.log(`export APP_PG_PASS=${esc(u.password || '')}`);
console.log(`export APP_PG_DB=${esc((u.pathname || '/safepsy').replace(/^\//, '') || 'safepsy')}`);
NODE
  )"
else
  log "WARN: DATABASE_URL unset — encrypted chat save/load will fail until Postgres is configured"
fi

NODE_API_DID_BACKEND_SIGNER="${DID_BACKEND_SIGNER_PRIVATE_KEY:-}"
NODE_API_REDIS_URL="${REDIS_URL:-}"
APP_ENABLE_REDIS=0
if [[ -n "${NODE_API_REDIS_URL}" ]]; then
  eval "$(
    REDIS_URL="${NODE_API_REDIS_URL}" node <<'NODE'
const raw = process.env.REDIS_URL;
const normalized = raw.replace(/^redis:\/\//, 'http://').replace(/^rediss:\/\//, 'https://');
let host = '';
try {
  host = new URL(normalized).hostname;
} catch {
  process.exit(0);
}
const needsRedis = host === 'localhost' || host === '127.0.0.1' || host === 'redis';
const composeUrl =
  host === 'localhost' || host === '127.0.0.1' ? raw.replace(host, 'redis') : raw;
const esc = (s) => JSON.stringify(s);
console.log(`export NODE_API_REDIS_URL=${esc(composeUrl)}`);
console.log(`export APP_ENABLE_REDIS=${needsRedis ? '1' : '0'}`);
NODE
  )"
fi

NODE_API_DEPENDS_BLOCK=""
APP_POSTGRES_SERVICE_BLOCK=""
APP_REDIS_SERVICE_BLOCK=""
NODE_API_DEPENDS_LINES=""
if [[ "${APP_ENABLE_POSTGRES}" == "1" ]]; then
  NODE_API_DEPENDS_LINES="${NODE_API_DEPENDS_LINES}
      postgres:
        condition: service_healthy"
  APP_POSTGRES_SERVICE_BLOCK="
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${APP_PG_USER}
      POSTGRES_PASSWORD: ${APP_PG_PASS}
      POSTGRES_DB: ${APP_PG_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [\"CMD-SHELL\", \"pg_isready -U ${APP_PG_USER} -d ${APP_PG_DB}\"]
      interval: 5s
      timeout: 5s
      retries: 10
"
fi
if [[ "${APP_ENABLE_REDIS}" == "1" ]]; then
  NODE_API_DEPENDS_LINES="${NODE_API_DEPENDS_LINES}
      redis:
        condition: service_healthy"
  APP_REDIS_SERVICE_BLOCK="
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: [\"redis-server\", \"--appendonly\", \"yes\"]
    healthcheck:
      test: [\"CMD\", \"redis-cli\", \"ping\"]
      interval: 5s
      timeout: 5s
      retries: 5
"
fi
if [[ -n "${NODE_API_DEPENDS_LINES}" ]]; then
  NODE_API_DEPENDS_BLOCK="
    depends_on:${NODE_API_DEPENDS_LINES}"
fi

# Where vLLM / chatbot runs and how the app backend reaches it (set MODEL_API_URL_FOR_COMPOSE before this script to override).
if [[ "${SINGLE_HOST}" == "1" ]]; then
  VLLM_SSH_HOST="${APP_IP}"
  VLLM_PUBLISH="-p 127.0.0.1:${API_PORT}:8000"
  if [[ -z "${MODEL_API_URL_FOR_COMPOSE:-}" ]]; then
    MODEL_API_URL_FOR_COMPOSE="http://host.docker.internal:${API_PORT}"
  fi
else
  VLLM_SSH_HOST="${API_IP}"
  VLLM_PUBLISH="-p ${API_PORT}:8000"
  if [[ -z "${MODEL_API_URL_FOR_COMPOSE:-}" ]]; then
    MODEL_API_URL_FOR_COMPOSE="http://${API_IP}:${API_PORT}"
  fi
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { printf "\n[WARN] %s\n" "$*" >&2; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

_ssh_probe_once() {
  local host="$1"
  ssh "${SSH_OPTS[@]}" "root@${host}" "echo ok" >/dev/null 2>&1
}

# Poll sshd after heavy remote Docker work (same env as deploy.sh).
wait_for_ssh_ready() {
  local host="$1"
  local max_wait="${SSH_BOOT_WAIT_SEC:-0}"
  [[ "${max_wait}" -gt 0 ]] || return 0
  local elapsed=0 step=5
  log "[SSH WAIT] Up to ${max_wait}s for sshd on ${host} before app deploy"
  while [[ "${elapsed}" -lt "${max_wait}" ]]; do
    if _ssh_probe_once "${host}"; then
      log "[SSH WAIT] sshd ready (~${elapsed}s)"
      return 0
    fi
    sleep "${step}"
    elapsed=$((elapsed + step))
  done
  return 1
}

wait_http() {
  local url="$1"
  local retries="${2:-30}"
  local delay="${3:-2}"
  local i
  for ((i=1; i<=retries; i++)); do
    if curl -fsS --max-time 4 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done
  return 1
}

log "Preflight: checking SSH access"
log "Running deploy-app.sh v${SCRIPT_VERSION}"
if [[ "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  log "LLM routing: Scaleway Generative API direct (USE_SCALEWAY_DIRECT=1)"
  if [[ -z "${SCALEWAY_API_KEY}" ]]; then
    die "USE_SCALEWAY_DIRECT=1 requires SCALEWAY_API_KEY in the deploy environment"
  fi
elif [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
  log "LLM routing: legacy FastAPI chatbot (MODEL_API_URL → :8000)"
else
  log "LLM routing: vLLM container on API host"
fi
wait_for_ssh_ready "${APP_IP}" || warn "SSH_BOOT_WAIT_SEC exhausted before preflight; trying SSH anyway"
if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "REUSE_CONTAINERS=1: will docker restart vllm and docker compose restart (no new containers / no --build)"
fi
if [[ "${SINGLE_HOST}" == "1" ]]; then
  log "SINGLE_HOST=1: vLLM + app stack on APP_IP=${APP_IP} (no SSH to API_IP)"
  run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"
  if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
    log "ALLOW_DEGRADED_CHATBOT=1: swap + pause chatbot before app build (free RAM on 4GB host)"
    run_ssh "${APP_IP}" "bash -s" <<'EOS' || true
set -euo pipefail
if ! grep -qE '^/swapfile[[:space:]]' /proc/swaps 2>/dev/null; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -qE '^/swapfile[[:space:]]' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
docker stop safepsy-chatbot-api 2>/dev/null || true
EOS
  fi
else
  run_ssh "${API_IP}" "echo 'API SSH OK on $(hostname)'" || die "Cannot SSH to API server ${API_IP}. If vLLM runs on the app host: SINGLE_HOST=1 ./deployment/deploy.sh"
  run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"
fi

log "STEP 1: Ensure ${APP_USER} exists and has docker group on target server(s)"
if [[ "${SINGLE_HOST}" != "1" ]]; then
  run_ssh "${API_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"
fi
run_ssh "${APP_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"

log "STEP 2: Install Docker and Compose plugin (if missing)"
for HOST in $([[ "${SINGLE_HOST}" == "1" ]] && echo "${APP_IP}" || echo "${API_IP} ${APP_IP}"); do
  run_ssh "${HOST}" "bash -lc '
    set -e
    if ! command -v docker >/dev/null 2>&1; then
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
      apt-get install -y docker.io docker-compose-plugin curl ca-certificates
      systemctl enable docker
      systemctl start docker
    fi
    if ! docker compose version >/dev/null 2>&1; then
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
      apt-get install -y docker-compose-plugin || true
    fi
  '"
done

if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    log "STEP 3: REUSE_CONTAINERS=1 and SKIP_VLLM_DEPLOY=1 — skip vLLM restart (external chatbot)"
  else
    log "STEP 3: Restart existing vLLM container on ${VLLM_SSH_HOST} (REUSE_CONTAINERS=1)"
    run_ssh "${VLLM_SSH_HOST}" "bash -lc '
      set -euo pipefail
      if ! docker ps -a --format \"{{.Names}}\" | grep -qx vllm; then
        echo \"No container named vllm. Run a full deploy without REUSE_CONTAINERS=1 first.\" >&2
        exit 1
      fi
      docker restart vllm
      for i in {1..120}; do
        if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
          echo \"vLLM healthy after restart\"
          exit 0
        fi
        sleep 3
      done
      docker logs --tail=120 vllm || true
      exit 1
    '"
  fi
elif [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
  log "STEP 3: SKIP_VLLM_DEPLOY=1 — skipping vLLM container (use FastAPI chatbot + compose on ${VLLM_SSH_HOST})"
else
  log "STEP 3: Deploy vLLM on ${VLLM_SSH_HOST} (OpenAI server, chunked prefill, tensor-parallel-size fallback chain)"
  run_ssh "${VLLM_SSH_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p ${API_BASE_DIR}
    chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

    docker rm -f vllm >/dev/null 2>&1 || true

    run_model() {
      local model=\"\$1\"
      local maxlen=\"\$2\"
      local tokenizer_mode=\"\$3\"
      extra_tok=
      if [ -n \"\$tokenizer_mode\" ]; then
        extra_tok=\"--tokenizer-mode \$tokenizer_mode\"
      fi
      docker run -d \
        ${VLLM_DOCKER_GPU_ARGS} \
        --name vllm \
        ${VLLM_PUBLISH} \
        --restart unless-stopped \
        --memory=${VLLM_DOCKER_MEMORY} \
        --cpus=3 \
        -e VLLM_CPU_KVCACHE_SPACE=${VLLM_CPU_KVCACHE_SPACE} \
        ${VLLM_IMAGE} \
        --model \"\${model}\" \
        --dtype ${VLLM_DTYPE} \
        --max-model-len \"\${maxlen}\" \
        --enable-chunked-prefill \
        --tensor-parallel-size ${VLLM_TENSOR_PARALLEL_SIZE} \
        \${extra_tok} \
        ${VLLM_EXTRA_DOCKER_ARGS}
    }

    run_model \"${MODEL_ID}\" \"${MAX_MODEL_LEN}\" \"${VLLM_TOKENIZER_MODE}\"

    for i in {1..120}; do
      if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
        echo \"vLLM primary model healthy\"
        exit 0
      fi
      sleep 3
    done

    echo \"Primary model failed. Falling back to ${FALLBACK_MODEL_ID} / max-len ${FALLBACK_MAX_MODEL_LEN}\"
    docker rm -f vllm >/dev/null 2>&1 || true
    run_model \"${FALLBACK_MODEL_ID}\" \"${FALLBACK_MAX_MODEL_LEN}\" \"\"

    for i in {1..120}; do
      if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
        echo \"vLLM fallback healthy\"
        exit 0
      fi
      sleep 3
    done

    echo \"vLLM failed with both primary and fallback models\"
    docker logs --tail=120 vllm || true
    exit 1
  '"
fi

log "STEP 4: Verify inference endpoint is reachable"
if [[ "${SKIP_CHATBOT_DEPLOY}" == "1" || "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  log "SKIP_CHATBOT_DEPLOY / USE_SCALEWAY_DIRECT — skipping FastAPI chatbot inference health gate"
elif [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
  log "ALLOW_DEGRADED_CHATBOT=1: skipping inference health gate"
else
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    if [[ "${SINGLE_HOST}" == "1" ]]; then
      run_ssh "${APP_IP}" "bash -lc 'for i in {1..80}; do curl -fsS http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null && exit 0; sleep 3; done; exit 1'" \
        || die "Chatbot not healthy on APP host loopback http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH}"
    else
      wait_http "http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH}" 120 3 || die "Chatbot not reachable at http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH}"
    fi
  elif [[ "${SINGLE_HOST}" == "1" ]]; then
    run_ssh "${APP_IP}" "bash -lc 'for i in {1..80}; do curl -fsS http://127.0.0.1:${API_PORT}/v1/models >/dev/null && exit 0; sleep 3; done; exit 1'" \
      || die "vLLM not healthy on APP host loopback http://127.0.0.1:${API_PORT}/v1/models"
  else
    wait_http "http://${API_IP}:${API_PORT}/v1/models" 120 3 || die "API endpoint is not reachable at http://${API_IP}:${API_PORT}/v1/models"
  fi
fi

if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "STEP 5: Restart existing app stack on APP server (REUSE_CONTAINERS=1; no build, no new containers)"
  run_ssh "${APP_IP}" "bash -lc '
    set -euo pipefail
    cd ${APP_BASE_DIR}
    if [[ ! -f docker-compose.yml ]]; then
      echo \"${APP_BASE_DIR}/docker-compose.yml missing. Run a full deploy without REUSE_CONTAINERS=1 first.\" >&2
      exit 1
    fi
    docker compose restart
    docker compose ps
    curl -fsS http://localhost >/dev/null
  '"
else
  log "STEP 5: Deploy app stack on APP server (apps/web frontend + backend + caddy)"
  [[ -d "${WEB_SRC_DIR}" ]] || die "Frontend source directory not found: ${WEB_SRC_DIR}"

  log "STEP 5a: Sync local apps/web -> ${APP_IP}:${APP_BASE_DIR}/frontend"
  run_ssh "${APP_IP}" "bash -lc 'mkdir -p ${APP_BASE_DIR}/frontend && rm -rf ${APP_BASE_DIR}/frontend/*'"
  COPYFILE_DISABLE=1 tar -C "${WEB_SRC_DIR}" -cf - . | run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/frontend -xf -'"

  BACKEND_SRC="${SCRIPT_DIR}/local-app/backend"
  [[ -d "${BACKEND_SRC}" ]] || die "Backend source directory not found: ${BACKEND_SRC}"
  log "STEP 5a-backend: Sync ${BACKEND_SRC} -> ${APP_IP}:${APP_BASE_DIR}/backend"
  run_ssh "${APP_IP}" "bash -lc 'mkdir -p ${APP_BASE_DIR}/backend && rm -rf ${APP_BASE_DIR}/backend/*'"
  COPYFILE_DISABLE=1 tar -C "${BACKEND_SRC}" -cf - . | run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/backend -xf -'"

  [[ -f "${NODE_API_DOCKERFILE}" ]] || die "Missing ${NODE_API_DOCKERFILE}"
  [[ -n "${JWT_SECRET}" ]] || die "JWT_SECRET must be set in repo .env for Node API (wallet auth on production)"
  [[ -n "${ADMIN_SECRET}" ]] || die "ADMIN_SECRET must be set in repo .env for Node API (admin auth + production startup guard)"
  [[ -n "${NODE_API_DID_BACKEND_SIGNER}" ]] || die "DID_BACKEND_SIGNER_PRIVATE_KEY must be set in repo .env for Node API (sponsored DID mint)"
  log "STEP 5a-node: Sync monorepo node-api build context -> ${APP_IP}:${APP_BASE_DIR}/node-api-src"
  run_ssh "${APP_IP}" "bash -lc 'mkdir -p ${APP_BASE_DIR}/node-api-src && rm -rf ${APP_BASE_DIR}/node-api-src/*'"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - \
    package.json package-lock.json apps/api apps/web/package.json | \
    run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/node-api-src -xf -'"
  COPYFILE_DISABLE=1 tar -C "${SCRIPT_DIR}/local-app/node-api" -cf - Dockerfile | \
    run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/node-api-src -xf -'"

  run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  export DEPLOY_FRESH=${DEPLOY_FRESH_CONTAINERS:-0}
  mkdir -p ${APP_BASE_DIR}/frontend ${APP_BASE_DIR}/backend
  cd ${APP_BASE_DIR}

  cat > frontend/Dockerfile <<\"EOF\"
FROM node:20-alpine
WORKDIR /app
COPY . .
  # apps/web currently has strict TS errors in some files; build production bundle via Vite.
  # API base: unset — browser uses same-origin /api (Caddy → node-api). Avoids www vs apex CORS.
ENV VITE_WALLETCONNECT_PROJECT_ID=${VITE_WALLETCONNECT_PROJECT_ID}
ENV VITE_DID_IDENTITY_TOKEN_ADDRESS=${WEB_VITE_DID}
ENV VITE_RPC_URL=${WEB_VITE_RPC}
RUN npm install --legacy-peer-deps && npx vite build
RUN npm install -g serve
CMD [\"serve\", \"-s\", \"dist\", \"-l\", \"3000\"]
EOF

  cat > docker-compose.yml <<\"EOF\"
services:
  frontend:
    build: ./frontend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  node-api:
    build: ./node-api-src
    restart: unless-stopped${NODE_API_DEPENDS_BLOCK}
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_SECRET=${ADMIN_SECRET}
      - FRONTEND_URL=${NODE_API_FRONTEND_URL}
      - SIWE_DOMAIN=${SIWE_DOMAIN}
      - SIWE_URI=${SIWE_URI}
      - RPC_URL=${NODE_API_RPC_URL}
      - ETH_RPC_URL=${NODE_API_RPC_URL}
      - DID_REGISTRY_ADDRESS=${NODE_API_DID_REGISTRY}
      - DID_IDENTITY_TOKEN_ADDRESS=${NODE_API_DID_IDENTITY}
      - DATABASE_URL=${NODE_API_DATABASE_URL}
      - DID_BACKEND_SIGNER_PRIVATE_KEY=${NODE_API_DID_BACKEND_SIGNER}
      - REDIS_URL=${NODE_API_REDIS_URL}
      - IP_SALT=${IP_SALT}
      - IP_HASHING_ENABLED=${IP_HASHING_ENABLED}
      - USE_SCALEWAY_DIRECT=${USE_SCALEWAY_DIRECT:-0}
      - SCALEWAY_API_KEY=${SCALEWAY_API_KEY:-}
      - SCALEWAY_PROJECT_ID=${SCALEWAY_PROJECT_ID:-}
      - SCALEWAY_MODEL=${SCALEWAY_MODEL:-}
      - SCALEWAY_API_BASE_URL=${SCALEWAY_API_BASE_URL:-}
    deploy:
      resources:
        limits:
          memory: 1G
${APP_POSTGRES_SERVICE_BLOCK}${APP_REDIS_SERVICE_BLOCK}
  backend:
    build: ./backend
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    environment:
      - MODEL_API_URL=${MODEL_API_URL_FOR_COMPOSE}
      - MODEL_API_URL_ALT=${MODEL_API_URL_ALT_FOR_COMPOSE:-}
      - USE_SCALEWAY_DIRECT=${USE_SCALEWAY_DIRECT:-0}
      - SCALEWAY_API_KEY=${SCALEWAY_API_KEY:-}
      - SCALEWAY_PROJECT_ID=${SCALEWAY_PROJECT_ID:-}
      - SCALEWAY_MODEL=${SCALEWAY_MODEL:-}
      - SCALEWAY_API_BASE_URL=${SCALEWAY_API_BASE_URL:-}
    deploy:
      resources:
        limits:
          memory: 1G

  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - \"80:80\"
      - \"443:443\"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  redis_data:
EOF

  cat > Caddyfile <<\"EOF\"
${CADDY_SITE_NAMES} {
  encode gzip
  handle /api/auth/* {
    reverse_proxy node-api:3001
  }
  handle /api/did/* {
    reverse_proxy node-api:3001
  }
  handle /api/chat/save {
    reverse_proxy node-api:3001
  }
  handle /api/chat/load* {
    reverse_proxy node-api:3001
  }
  handle /api/chat/summary {
    reverse_proxy node-api:3001
  }
  handle /api/chat/export {
    reverse_proxy node-api:3001
  }
  handle /api/chat/concurrency {
    reverse_proxy node-api:3001
  }
  handle /api/chat/quota {
    reverse_proxy node-api:3001
  }
  handle /api/analytics/* {
    reverse_proxy node-api:3001
  }
  handle /api/metrics/* {
    reverse_proxy node-api:3001
  }
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}

# Plain HTTP for direct-IP access only (no public cert for raw IPs — avoids breaking :443 for real domains)
http://${APP_IP} {
  encode gzip
  handle /api/auth/* {
    reverse_proxy node-api:3001
  }
  handle /api/did/* {
    reverse_proxy node-api:3001
  }
  handle /api/chat/save {
    reverse_proxy node-api:3001
  }
  handle /api/chat/load* {
    reverse_proxy node-api:3001
  }
  handle /api/chat/summary {
    reverse_proxy node-api:3001
  }
  handle /api/chat/export {
    reverse_proxy node-api:3001
  }
  handle /api/chat/concurrency {
    reverse_proxy node-api:3001
  }
  handle /api/chat/quota {
    reverse_proxy node-api:3001
  }
  handle /api/analytics/* {
    reverse_proxy node-api:3001
  }
  handle /api/metrics/* {
    reverse_proxy node-api:3001
  }
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}
EOF

  if [[ \"\$DEPLOY_FRESH\" == \"1\" ]]; then
    echo \"[deploy-app] DEPLOY_FRESH_CONTAINERS=1: compose down, build --no-cache, force-recreate\"
    docker compose down --remove-orphans || true
    docker compose build --no-cache
    docker compose up -d --force-recreate
  else
    docker compose up -d --build --force-recreate
  fi
  if [[ -n \"${NODE_API_DATABASE_URL}\" ]]; then
    echo \"[deploy-app] Applying Prisma schema to Postgres (encrypted chat tables)\"
    for _p in \$(seq 1 30); do
      if docker compose exec -T node-api npx prisma db push --schema=schema.prisma --skip-generate 2>/dev/null; then
        break
      fi
      sleep 2
    done
  fi
  docker compose ps
  curl -fsS http://localhost >/dev/null
'"
fi

log "STEP 6: Validate APP -> inference from APP server"
if [[ "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  log "STEP 6: Scaleway direct — probe POST /api/chat/completions (guest, non-stream)"
  run_ssh "${APP_IP}" "bash -lc '
    set -euo pipefail
    _probe_ok=0
    for _i in \$(seq 1 30); do
      if curl -fsS --resolve \"${APP_DOMAIN}:443:127.0.0.1\" \
        -X POST \"https://${APP_DOMAIN}/api/chat/completions\" \
        -H \"Content-Type: application/json\" \
        -d \"{\\\"messages\\\":[{\\\"role\\\":\\\"user\\\",\\\"content\\\":\\\"Reply with OK only.\\\"}],\\\"stream\\\":false,\\\"mode\\\":\\\"guest\\\",\\\"maxTokens\\\":16}\" \
        2>/dev/null | grep -q \"\\\"choices\\\"\"; then
        _probe_ok=1
        break
      fi
      sleep 2
    done
    [[ \"\${_probe_ok}\" -eq 1 ]] || { echo \"Scaleway chat probe timed out after ~60s\"; exit 1; }
    docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
  '" || die "Scaleway direct chat probe failed on APP host (check SCALEWAY_API_KEY in backend env)"
elif [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
  log "ALLOW_DEGRADED_CHATBOT=1: skipping APP -> inference validation"
  run_ssh "${APP_IP}" "bash -lc '
    set -euo pipefail
    docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
    docker logs --tail=120 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
  '"
else
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    if [[ "${SINGLE_HOST}" == "1" ]]; then
      run_ssh "${APP_IP}" "bash -lc '
        set -euo pipefail
        curl -fsS http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null
        docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
        docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
      '"
    else
      run_ssh "${APP_IP}" "bash -lc '
        set -euo pipefail
        curl -fsS http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null
        docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
        docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
      '"
    fi
  elif [[ "${SINGLE_HOST}" == "1" ]]; then
    run_ssh "${APP_IP}" "bash -lc '
      set -euo pipefail
      curl -fsS http://127.0.0.1:${API_PORT}/v1/models >/dev/null
      docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
      docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
    '"
  else
    run_ssh "${APP_IP}" "bash -lc '
      set -euo pipefail
      curl -fsS http://${API_IP}:${API_PORT}/v1/models >/dev/null
      docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
      docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
    '"
  fi
fi

log "STEP 7: Security hardening on API server (UFW allow app IP only on ${API_PORT})"
if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "REUSE_CONTAINERS=1: skip UFW (unchanged from prior deploy)"
elif [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
  log "SKIP_VLLM_DEPLOY=1: skip UFW on API host (chatbot exposure managed via Scaleway security groups / compose)"
elif [[ "${SINGLE_HOST}" == "1" ]]; then
  log "SINGLE_HOST=1: skip UFW on separate API host (vLLM bound to 127.0.0.1 on APP)"
else
  run_ssh "${API_IP}" "bash -lc '
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ufw
    ufw --force enable || true
    ufw allow OpenSSH
    ufw allow from ${APP_IP} to any port ${API_PORT} proto tcp
    ufw deny ${API_PORT}/tcp || true
    ufw status verbose
  '"
fi

log "STEP 8: Final checks"
wait_http "http://${APP_IP}" 30 2 || die "App root is not reachable at http://${APP_IP}"
run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/healthz && echo'"
if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
  log "ALLOW_DEGRADED_CHATBOT=1: skipping /api/models (chatbot may be down)"
elif [[ "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/v1/models >/dev/null && echo scaleway_direct_models_ok'"
else
  run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/models >/dev/null && echo backend_to_api_ok'"
fi

log "STEP 8b: HTTPS / domain (Caddy auto-HTTPS; requires DNS → ${APP_IP})"
if wait_http "https://${APP_DOMAIN}" 25 3; then
  curl -fsS --max-time 15 "https://${APP_DOMAIN}/api/healthz" >/dev/null && echo "domain_https_ok"
else
  printf "\n[WARN] https://%s not reachable from here yet (DNS/propagation/firewall). App still OK on http://%s\n" "${APP_DOMAIN}" "${APP_IP}"
fi

cat <<EOF

SUCCESS
- Frontend reachable:  http://${APP_IP}
- Domain (HTTPS):       https://${APP_DOMAIN}  (also ${CADDY_SITE_NAMES})
- LLM routing:          $([[ "${USE_SCALEWAY_DIRECT}" == "1" ]] && echo "Scaleway Generative API direct (model ${SCALEWAY_MODEL})" || ([[ "${SKIP_VLLM_DEPLOY}" == "1" ]] && echo "FastAPI chatbot http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH}" || echo "vLLM http://${API_IP}:${API_PORT}/v1/models"))
- App stack path:       ${APP_BASE_DIR}
- Inference container:  $([[ "${USE_SCALEWAY_DIRECT}" == "1" ]] && echo "(none — Scaleway SaaS)" || ([[ "${SKIP_VLLM_DEPLOY}" == "1" ]] && echo "safepsy-chatbot-api (compose)" || echo "vllm"))

Useful follow-ups:
- App logs: ssh root@${APP_IP} \"cd ${APP_BASE_DIR} && docker compose logs -f backend\"
- Verify prod: CHECK_LLM=1 USE_SCALEWAY_DIRECT=${USE_SCALEWAY_DIRECT:-0} bash deployment/verify-production.sh
$([[ "${USE_SCALEWAY_DIRECT}" != "1" && "${SKIP_VLLM_DEPLOY}" != "1" ]] && echo "- vLLM logs: ssh root@${VLLM_SSH_HOST} \"docker logs -f vllm\"")
EOF
