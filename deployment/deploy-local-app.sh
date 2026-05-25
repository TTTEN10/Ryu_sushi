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
LOCAL_STACK_DIR="${LOCAL_STACK_DIR:-${REPO_ROOT}/.local-app-stack}"
LOCAL_HTTP_PORT="${LOCAL_HTTP_PORT:-9080}"
DEPLOY_FRESH_CONTAINERS="${DEPLOY_FRESH_CONTAINERS:-0}"

USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
SCALEWAY_API_KEY="${SCALEWAY_API_KEY:-}"
SCALEWAY_PROJECT_ID="${SCALEWAY_PROJECT_ID:-5dad0cb7-c16a-4447-9a25-e89bd3448e8a}"
SCALEWAY_MODEL="${SCALEWAY_MODEL:-mistral-small-3.2-24b-instruct-2506}"
SCALEWAY_API_BASE_URL="${SCALEWAY_API_BASE_URL:-}"

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
  set +a
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker not found"
docker compose version >/dev/null 2>&1 || die "docker compose plugin not found"
[[ -d "${WEB_SRC_DIR}" ]] || die "Missing ${WEB_SRC_DIR}"
[[ -f "${BACKEND_SRC_DIR}/main.py" ]] || die "Missing ${BACKEND_SRC_DIR}/main.py"

if [[ "${USE_SCALEWAY_DIRECT}" == "1" && -z "${SCALEWAY_API_KEY}" ]]; then
  die "USE_SCALEWAY_DIRECT=1 requires SCALEWAY_API_KEY in repo .env or the environment"
fi

log "Local stack → http://localhost:${LOCAL_HTTP_PORT} (Scaleway direct, model ${SCALEWAY_MODEL})"
log "Materializing stack in ${LOCAL_STACK_DIR}"

rm -rf "${LOCAL_STACK_DIR}"
mkdir -p "${LOCAL_STACK_DIR}/frontend" "${LOCAL_STACK_DIR}/backend"
COPYFILE_DISABLE=1 cp -R "${WEB_SRC_DIR}/." "${LOCAL_STACK_DIR}/frontend/"
cp -R "${BACKEND_SRC_DIR}/." "${LOCAL_STACK_DIR}/backend/"

cat > "${LOCAL_STACK_DIR}/frontend/Dockerfile" <<EOF
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV VITE_API_URL=http://localhost:${LOCAL_HTTP_PORT}
RUN npm install --legacy-peer-deps && npx vite build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
EOF

cat > "${LOCAL_STACK_DIR}/Caddyfile" <<EOF
:80 {
  encode gzip
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

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      USE_SCALEWAY_DIRECT: "${USE_SCALEWAY_DIRECT}"
      SCALEWAY_API_KEY: "${SCALEWAY_API_KEY}"
      SCALEWAY_PROJECT_ID: "${SCALEWAY_PROJECT_ID}"
      SCALEWAY_MODEL: "${SCALEWAY_MODEL}"
      SCALEWAY_API_BASE_URL: "${SCALEWAY_API_BASE_URL}"

  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "${LOCAL_HTTP_PORT}:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
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

log "Health checks (wait for Caddy + frontend)"
_health_ok=0
for _i in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz" >/dev/null 2>&1; then
    _health_ok=1
    break
  fi
  sleep 2
done
[[ "${_health_ok}" -eq 1 ]] || die "Timed out waiting for http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz (docker compose logs caddy backend frontend)"
curl -fsS "http://127.0.0.1:${LOCAL_HTTP_PORT}/api/healthz" && echo
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
