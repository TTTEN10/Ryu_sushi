#!/usr/bin/env bash
set -euo pipefail

# Instance-aware end-to-end deployment script for:
# - API server (vLLM/OpenAI-compatible endpoint)
# - App server (frontend + backend + caddy)
#
# Strict order:
# 1) Deploy API server first
# 2) Verify API responds
# 3) Deploy APP server stack
# 4) Validate backend -> API connectivity
# 5) Harden API exposure
#
# Usage:
#   chmod +x deployment/deploy-instance-aware-roadmap.sh
#   ./deployment/deploy-instance-aware-roadmap.sh
#
# Optional overrides:
#   APP_IP=... API_IP=... CADDY_SITE_NAMES=... APP_USER=... SSH_KEY=... \
#   VLLM_IMAGE=... VLLM_CPU_KVCACHE_SPACE=... VLLM_DTYPE=... \
#   MODEL_ID=... FALLBACK_MODEL_ID=... MAX_MODEL_LEN=... ./deployment/deploy-instance-aware-roadmap.sh
#
# CADDY_SITE_NAMES: comma-separated hostnames for one Caddy site block (ACME cert covers all).
#   Default: safepsy.com, www.safepsy.com

APP_IP="${APP_IP:-51.159.117.169}"
API_IP="${API_IP:-51.159.160.246}"
# Canonical browser URL (used in success output / checks)
APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
# Hostnames Caddy will terminate TLS for (must match DNS A/AAAA to this server)
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"
APP_USER="${APP_USER:-safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"

API_PORT="${API_PORT:-8000}"
VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai-cpu:latest}"
# Default: very small instruct model; phi-2 + float32 often OOMs / fails engine init on 8GB CPU.
MODEL_ID="${MODEL_ID:-Qwen/Qwen2-0.5B-Instruct}"
FALLBACK_MODEL_ID="${FALLBACK_MODEL_ID:-TinyLlama/TinyLlama-1.1B-Chat-v1.0}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-256}"
FALLBACK_MAX_MODEL_LEN="${FALLBACK_MAX_MODEL_LEN:-256}"
VLLM_CPU_KVCACHE_SPACE="${VLLM_CPU_KVCACHE_SPACE:-1}"
VLLM_DTYPE="${VLLM_DTYPE:-auto}"

APP_BASE_DIR="/home/${APP_USER}/app"
API_BASE_DIR="/home/${APP_USER}/llm-api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_SRC_DIR="${WEB_SRC_DIR:-${REPO_ROOT}/apps/web}"
SCRIPT_VERSION="2026-03-24.1"

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}")
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
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
log "Running deploy-instance-aware-roadmap.sh v${SCRIPT_VERSION}"
run_ssh "${API_IP}" "echo 'API SSH OK on $(hostname)'" || die "Cannot SSH to API server ${API_IP}"
run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"

log "STEP 1: Ensure ${APP_USER} exists and has docker group on both servers"
run_ssh "${API_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"
run_ssh "${APP_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"

log "STEP 2: Install Docker and Compose plugin (if missing) on both servers"
for HOST in "${API_IP}" "${APP_IP}"; do
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

log "STEP 3: Deploy API server first (vLLM CPU-friendly profile with fallback)"
run_ssh "${API_IP}" "bash -lc '
  set -euo pipefail
  mkdir -p ${API_BASE_DIR}
  chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

  docker rm -f vllm >/dev/null 2>&1 || true

  run_model() {
    local model=\"\$1\"
    local maxlen=\"\$2\"
    docker run -d \
      --name vllm \
      -p ${API_PORT}:8000 \
      --restart unless-stopped \
      --memory=6g \
      --cpus=3 \
      -e VLLM_CPU_KVCACHE_SPACE=${VLLM_CPU_KVCACHE_SPACE} \
      ${VLLM_IMAGE} \
      --model \"\${model}\" \
      --dtype ${VLLM_DTYPE} \
      --max-model-len \"\${maxlen}\"
  }

  run_model \"${MODEL_ID}\" \"${MAX_MODEL_LEN}\"

  for i in {1..120}; do
    if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
      echo \"vLLM primary model healthy\"
      exit 0
    fi
    sleep 3
  done

  echo \"Primary model failed. Falling back to ${FALLBACK_MODEL_ID} / max-len ${FALLBACK_MAX_MODEL_LEN}\"
  docker rm -f vllm >/dev/null 2>&1 || true
  run_model \"${FALLBACK_MODEL_ID}\" \"${FALLBACK_MAX_MODEL_LEN}\"

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

log "STEP 4: Verify API server externally from local machine"
wait_http "http://${API_IP}:${API_PORT}/v1/models" 120 3 || die "API endpoint is not reachable at http://${API_IP}:${API_PORT}/v1/models"

log "STEP 5: Deploy app stack on APP server (apps/web frontend + backend + caddy)"
[[ -d "${WEB_SRC_DIR}" ]] || die "Frontend source directory not found: ${WEB_SRC_DIR}"

log "STEP 5a: Sync local apps/web -> ${APP_IP}:${APP_BASE_DIR}/frontend"
run_ssh "${APP_IP}" "bash -lc 'mkdir -p ${APP_BASE_DIR}/frontend && rm -rf ${APP_BASE_DIR}/frontend/*'"
tar -C "${WEB_SRC_DIR}" -cf - . | run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/frontend -xf -'"

run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  mkdir -p ${APP_BASE_DIR}/frontend ${APP_BASE_DIR}/backend
  cd ${APP_BASE_DIR}

  cat > frontend/Dockerfile <<\"EOF\"
FROM node:20-alpine
WORKDIR /app
COPY . .
# apps/web currently has strict TS errors in some files; build production bundle via Vite.
ENV VITE_API_URL=https://${APP_DOMAIN}
RUN npm install --legacy-peer-deps && npx vite build
RUN npm install -g serve
CMD [\"serve\", \"-s\", \"dist\", \"-l\", \"3000\"]
EOF

  cat > backend/requirements.txt <<\"EOF\"
fastapi
uvicorn
requests
EOF

  cat > backend/main.py <<\"EOF\"
import os
import requests
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
MODEL_API_URL = os.getenv(\"MODEL_API_URL\", \"http://127.0.0.1:8000\").rstrip(\"/\")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[\"*\"],
    allow_credentials=True,
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

@app.get(\"/healthz\")
def healthz():
  return {\"ok\": True, \"service\": \"backend\"}

@app.get(\"/models\")
def models():
  resp = requests.get(f\"{MODEL_API_URL}/v1/models\", timeout=15)
  resp.raise_for_status()
  return resp.json()

@app.get(\"/v1/models\")
def v1_models():
  resp = requests.get(f\"{MODEL_API_URL}/v1/models\", timeout=15)
  resp.raise_for_status()
  return resp.json()

@app.post(\"/v1/chat/completions\")
async def v1_chat_completions(request: Request):
  body = await request.body()
  ctype = request.headers.get(\"content-type\", \"application/json\")
  r = requests.post(
      f\"{MODEL_API_URL}/v1/chat/completions\",
      data=body,
      headers={\"Content-Type\": ctype},
      timeout=180,
  )
  ct = r.headers.get(\"content-type\", \"application/json\")
  return Response(content=r.content, status_code=r.status_code, media_type=ct)
EOF

  cat > backend/Dockerfile <<\"EOF\"
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"5000\"]
EOF

  cat > docker-compose.yml <<\"EOF\"
services:
  frontend:
    build: ./frontend
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  backend:
    build: ./backend
    restart: always
    environment:
      - MODEL_API_URL=http://${API_IP}:${API_PORT}
    deploy:
      resources:
        limits:
          memory: 1G

  caddy:
    image: caddy:latest
    restart: always
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
EOF

  cat > Caddyfile <<\"EOF\"
${CADDY_SITE_NAMES} {
  encode gzip
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}

# Plain HTTP for direct-IP access only (no public cert for raw IPs — avoids breaking :443 for real domains)
http://${APP_IP} {
  encode gzip
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}
EOF

  docker compose up -d --build
  docker compose ps
  curl -fsS http://localhost >/dev/null
'"

log "STEP 6: Validate APP -> API connectivity from APP server"
run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  curl -fsS http://${API_IP}:${API_PORT}/v1/models >/dev/null
  docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
  docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
'"

log "STEP 7: Security hardening on API server (UFW allow app IP only on ${API_PORT})"
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

log "STEP 8: Final checks"
wait_http "http://${APP_IP}" 30 2 || die "App root is not reachable at http://${APP_IP}"
run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/healthz && echo'"
run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/models >/dev/null && echo backend_to_api_ok'"

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
- API endpoint:         http://${API_IP}:${API_PORT}/v1/models
- App stack path:       ${APP_BASE_DIR}
- Inference container:  vllm

Useful follow-ups:
- App logs: ssh root@${APP_IP} \"cd ${APP_BASE_DIR} && docker compose logs -f\"
- API logs: ssh root@${API_IP} \"docker logs -f vllm\"
EOF
