#!/usr/bin/env bash
# Local production-parity stack: Caddy + Vite SPA + Python API proxy (Scaleway direct).
# Mirrors deployment/deploy-live-app.sh on localhost (no SSH, no legacy chatbot).
#
# Usage (from repo root):
#   ./deployment/deploy-local-app.sh
#   LOCAL_HTTP_PORT=9080 DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-local-app.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_SRC_DIR="${REPO_ROOT}/apps/web"
BACKEND_SRC_DIR="${SCRIPT_DIR}/local-app/backend"
NODE_API_DOCKERFILE="${SCRIPT_DIR}/local-app/node-api/Dockerfile"
LOCAL_STACK_DIR="${LOCAL_STACK_DIR:-${REPO_ROOT}/.local-app-stack}"
LOCAL_HTTP_PORT="${LOCAL_HTTP_PORT:-9080}"
DEPLOY_FRESH_CONTAINERS="${DEPLOY_FRESH_CONTAINERS:-0}"

USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
SCALEWAY_API_KEY="${SCALEWAY_API_KEY:-}"
SCALEWAY_PROJECT_ID="${SCALEWAY_PROJECT_ID:-5dad0cb7-c16a-4447-9a25-e89bd3448e8a}"
SCALEWAY_MODEL="${SCALEWAY_MODEL:-mistral-small-3.2-24b-instruct-2506}"
SCALEWAY_API_BASE_URL="${SCALEWAY_API_BASE_URL:-}"

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
  set +a
fi

command -v docker >/dev/null 2>&1 || die "docker not found"
docker compose version >/dev/null 2>&1 || die "docker compose plugin not found"
[[ -d "${WEB_SRC_DIR}" ]] || die "Missing ${WEB_SRC_DIR}"
[[ -f "${BACKEND_SRC_DIR}/main.py" ]] || die "Missing ${BACKEND_SRC_DIR}/main.py"

if [[ "${USE_SCALEWAY_DIRECT}" == "1" && -z "${SCALEWAY_API_KEY}" ]]; then
  die "USE_SCALEWAY_DIRECT=1 requires SCALEWAY_API_KEY in repo .env or the environment"
fi

log "Local stack → http://localhost:${LOCAL_HTTP_PORT} (Scaleway direct, model ${SCALEWAY_MODEL})"
log "Building Node API on host (wallet auth/DID routes)..."
(cd "${REPO_ROOT}" && npm run build:api) || die "npm run build:api failed"
[[ -d "${REPO_ROOT}/apps/api/dist" ]] || die "apps/api/dist missing after build:api"

log "Materializing stack in ${LOCAL_STACK_DIR}"

[[ -n "${JWT_SECRET}" ]] || die "JWT_SECRET must be set in repo .env for wallet auth (Node API)"
[[ -n "${ADMIN_SECRET}" ]] || die "ADMIN_SECRET must be set in repo .env for Node API"
[[ -n "${METRICS_SECRET}" ]] || die "METRICS_SECRET must be set in repo .env for Node API (/metrics auth)"
NODE_API_DID_BACKEND_SIGNER="${DID_BACKEND_SIGNER_PRIVATE_KEY:-}"
[[ -n "${NODE_API_DID_BACKEND_SIGNER}" ]] || die "DID_BACKEND_SIGNER_PRIVATE_KEY must be set in repo .env for Node API"
ADMIN_SECRET="${ADMIN_SECRET:-}"
IP_SALT="${IP_SALT:-}"
IP_HASHING_ENABLED="${IP_HASHING_ENABLED:-true}"
NODE_API_FRONTEND_URL="http://localhost:${LOCAL_HTTP_PORT}"
SIWE_DOMAIN="${SIWE_DOMAIN:-localhost}"
SIWE_URI="${SIWE_URI:-http://localhost:${LOCAL_HTTP_PORT}}"

NODE_API_RPC_URL="${RPC_URL:-${ETH_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}}"
NODE_API_DID_REGISTRY="${DID_REGISTRY_ADDRESS:-0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5}"
NODE_API_DID_IDENTITY="${DID_IDENTITY_TOKEN_ADDRESS:-0x103eAd096f898132E138ad228E35296db983A053}"
WEB_VITE_DID="${VITE_DID_IDENTITY_TOKEN_ADDRESS:-${NODE_API_DID_IDENTITY}}"
WEB_VITE_RPC="${VITE_RPC_URL:-${NODE_API_RPC_URL}}"

# Crypto Payment (Mainnet) Configuration
PAYMENT_TREASURY_ADDRESS="${PAYMENT_TREASURY_ADDRESS:-0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c}"
PAYMENT_CHAIN_ID="${PAYMENT_CHAIN_ID:-1}"
PAYMENT_RPC_URL="${PAYMENT_RPC_URL:-https://ethereum-rpc.publicnode.com}"
PAYMENT_TOKEN_ADDRESS="${PAYMENT_TOKEN_ADDRESS:-0xdAC17F958D2ee523a2206206994597C13D831ec7}"
PAYMENT_FEE_PERCENT="${PAYMENT_FEE_PERCENT:-1}"
PAYMENT_CONFIRMATIONS_REQUIRED="${PAYMENT_CONFIRMATIONS_REQUIRED:-12}"

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
fi

rm -rf "${LOCAL_STACK_DIR}"
mkdir -p "${LOCAL_STACK_DIR}/frontend" "${LOCAL_STACK_DIR}/backend" "${LOCAL_STACK_DIR}/node-api-src"
COPYFILE_DISABLE=1 cp -R "${WEB_SRC_DIR}/." "${LOCAL_STACK_DIR}/frontend/"
cp -R "${BACKEND_SRC_DIR}/." "${LOCAL_STACK_DIR}/backend/"
COPYFILE_DISABLE=1 cp "${REPO_ROOT}/package.json" "${REPO_ROOT}/package-lock.json" "${LOCAL_STACK_DIR}/node-api-src/"
mkdir -p "${LOCAL_STACK_DIR}/node-api-src/apps/api" "${LOCAL_STACK_DIR}/node-api-src/apps/web"
COPYFILE_DISABLE=1 cp -R "${REPO_ROOT}/apps/api/." "${LOCAL_STACK_DIR}/node-api-src/apps/api/"
COPYFILE_DISABLE=1 cp "${REPO_ROOT}/apps/web/package.json" "${LOCAL_STACK_DIR}/node-api-src/apps/web/"
# Keep Docker context small; dist comes from host build above
rm -rf "${LOCAL_STACK_DIR}/node-api-src/apps/api/node_modules" "${LOCAL_STACK_DIR}/node-api-src/apps/api/dist" 2>/dev/null || true
COPYFILE_DISABLE=1 cp -R "${REPO_ROOT}/apps/api/dist" "${LOCAL_STACK_DIR}/node-api-src/apps/api/dist"
cp "${NODE_API_DOCKERFILE}" "${LOCAL_STACK_DIR}/node-api-src/Dockerfile"
[[ -f "${SCRIPT_DIR}/local-app/node-api/.dockerignore" ]] && \
  cp "${SCRIPT_DIR}/local-app/node-api/.dockerignore" "${LOCAL_STACK_DIR}/node-api-src/.dockerignore"

cat > "${LOCAL_STACK_DIR}/frontend/Dockerfile" <<EOF
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV VITE_DID_IDENTITY_TOKEN_ADDRESS=${WEB_VITE_DID}
ENV VITE_RPC_URL=${WEB_VITE_RPC}
ENV VITE_WALLETCONNECT_PROJECT_ID=${VITE_WALLETCONNECT_PROJECT_ID:-}
RUN npm install --legacy-peer-deps && npx vite build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
EOF

cat > "${LOCAL_STACK_DIR}/Caddyfile" <<EOF
:80 {
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
  handle /api/chat/completions {
    reverse_proxy node-api:3001
  }
  handle /beta/chat/completions* {
    reverse_proxy node-api:3001
  }
  handle /api/crisis/* {
    reverse_proxy node-api:3001
  }
  handle /api/admin/* {
    reverse_proxy node-api:3001
  }
  handle /api/rag/* {
    reverse_proxy node-api:3001
  }
  handle /metrics {
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

export USE_SCALEWAY_DIRECT SCALEWAY_API_KEY SCALEWAY_PROJECT_ID SCALEWAY_MODEL SCALEWAY_API_BASE_URL
cat > "${LOCAL_STACK_DIR}/docker-compose.yml" <<EOF
services:
  frontend:
    build: ./frontend
    restart: unless-stopped

  node-api:
    build: ./node-api-src
    restart: unless-stopped
$(if [[ "${APP_ENABLE_POSTGRES}" == "1" ]]; then echo "    depends_on:
      postgres:
        condition: service_healthy"; fi)
    environment:
      NODE_ENV: production
      PORT: "3001"
      JWT_SECRET: "${JWT_SECRET}"
      ADMIN_SECRET: "${ADMIN_SECRET}"
      METRICS_SECRET: "${METRICS_SECRET}"
      REDIS_URL: "${REDIS_URL:-redis://redis:6379/0}"
      FRONTEND_URL: "${NODE_API_FRONTEND_URL}"
      SIWE_DOMAIN: "${SIWE_DOMAIN}"
      SIWE_URI: "${SIWE_URI}"
      RPC_URL: "${NODE_API_RPC_URL}"
      ETH_RPC_URL: "${NODE_API_RPC_URL}"
      DID_REGISTRY_ADDRESS: "${NODE_API_DID_REGISTRY}"
      DID_IDENTITY_TOKEN_ADDRESS: "${NODE_API_DID_IDENTITY}"
      DATABASE_URL: "${NODE_API_DATABASE_URL}"
      DID_BACKEND_SIGNER_PRIVATE_KEY: "${NODE_API_DID_BACKEND_SIGNER}"
      IP_SALT: "${IP_SALT}"
      IP_HASHING_ENABLED: "${IP_HASHING_ENABLED}"
      USE_SCALEWAY_DIRECT: "${USE_SCALEWAY_DIRECT}"
      SCALEWAY_API_KEY: "${SCALEWAY_API_KEY}"
      SCALEWAY_PROJECT_ID: "${SCALEWAY_PROJECT_ID}"
      SCALEWAY_MODEL: "${SCALEWAY_MODEL}"
      SCALEWAY_API_BASE_URL: "${SCALEWAY_API_BASE_URL}"

$(if [[ "${APP_ENABLE_POSTGRES}" == "1" ]]; then cat <<PG

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
      test: ["CMD-SHELL", "pg_isready -U ${APP_PG_USER} -d ${APP_PG_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
PG
fi)

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      USE_SCALEWAY_DIRECT: "${USE_SCALEWAY_DIRECT}"
      SCALEWAY_API_KEY: "${SCALEWAY_API_KEY}"
      SCALEWAY_PROJECT_ID: "${SCALEWAY_PROJECT_ID}"
      SCALEWAY_MODEL: "${SCALEWAY_MODEL}"
      SCALEWAY_API_BASE_URL: "${SCALEWAY_API_BASE_URL}"
      PAYMENT_TREASURY_ADDRESS: "${PAYMENT_TREASURY_ADDRESS}"
      PAYMENT_CHAIN_ID: "${PAYMENT_CHAIN_ID}"
      PAYMENT_RPC_URL: "${PAYMENT_RPC_URL}"
      PAYMENT_TOKEN_ADDRESS: "${PAYMENT_TOKEN_ADDRESS}"
      PAYMENT_FEE_PERCENT: "${PAYMENT_FEE_PERCENT}"
      PAYMENT_CONFIRMATIONS_REQUIRED: "${PAYMENT_CONFIRMATIONS_REQUIRED}"

  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "${LOCAL_HTTP_PORT}:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile

volumes:
  postgres_data:
EOF

cd "${LOCAL_STACK_DIR}"
if [[ "${DEPLOY_FRESH_CONTAINERS}" == "1" ]]; then
  log "DEPLOY_FRESH_CONTAINERS=1: compose down, build --no-cache, force-recreate"
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose build --no-cache
  docker compose up -d --force-recreate
else
  docker compose up -d --build --force-recreate
fi
docker compose ps
if [[ -n "${NODE_API_DATABASE_URL}" ]]; then
  log "Applying Prisma schema (encrypted chat tables)"
  for _p in $(seq 1 30); do
    if docker compose exec -T node-api npx prisma db push --schema=schema.prisma --skip-generate 2>/dev/null; then
      break
    fi
    sleep 2
  done
fi

log "Health checks (wait for Caddy + frontend)"
_health_ok=0
for _i in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz" >/dev/null 2>&1; then
    _health_ok=1
    break
  fi
  sleep 2
done
[[ "${_health_ok}" -eq 1 ]] || die "Timed out waiting for http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz (docker compose logs caddy backend frontend node-api)"
curl -fsS "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz" && echo
log "Wallet auth probe (POST /api/auth/wallet/connect — expect 400 without body, not 404)"
_wc_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/auth/wallet/connect" -H 'Content-Type: application/json' -d '{}' || echo 000)"
[[ "${_wc_code}" == "400" || "${_wc_code}" == "401" ]] || die "Node API wallet/connect returned ${_wc_code} (expected 400/401, not 404 from Python proxy)"
curl -fsS "http://127.0.0.1:${LOCAL_HTTP_PORT}/" -o /dev/null && echo "homepage_ok"

if [[ "${USE_SCALEWAY_DIRECT}" == "1" ]]; then
  curl -fsS -X POST "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"stream\":false,\"mode\":\"guest\",\"maxTokens\":16}" \
    | grep -q '"choices"' && echo "chat_ok" \
    || die "Scaleway chat probe failed (check SCALEWAY_API_KEY in .env)"
fi

cat <<EOF

SUCCESS — local production-parity stack
  URL:      http://localhost:${LOCAL_HTTP_PORT}
  API:      http://localhost:${LOCAL_HTTP_PORT}/api/healthz
  Logs:     cd ${LOCAL_STACK_DIR} && docker compose logs -f
  Stop:     cd ${LOCAL_STACK_DIR} && docker compose down
  Rebuild:  DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-local-app.sh

For full Node API + Postgres dev, use: docker compose -f docker-compose.local.yml up -d && npm run dev
EOF
