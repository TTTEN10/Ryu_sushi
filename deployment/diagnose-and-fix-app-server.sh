#!/bin/bash
# Diagnose and fix app stack at 51.159.176.62 (scw-focused-dubinsky).
# Run from repo root from a machine that can SSH to the server.
# Usage: bash deployment/diagnose-and-fix-app-server.sh
# Env: SSH_SERVER_IP, SSH_KEY_FILE or SCW_SSH_KEY_ID, DATABASE_PASSWORD (first deploy), SKIP_SSH_CHECK=1 to skip Step 1

set -e

APP_IP="${SSH_SERVER_IP:-51.159.176.62}"
SERVER_USER="${SSH_SERVER_USER:-root}"
APP_DIR="/opt/safepsy-landing"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# SSH key: explicit SSH_KEY_FILE, or SCW_SSH_KEY_ID, or try common keys
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
if [ -z "$SSH_KEY_FILE" ] && [ -n "${SCW_SSH_KEY_ID:-}" ]; then
  [ -f "$HOME/.ssh/$SCW_SSH_KEY_ID" ] && SSH_KEY_FILE="$HOME/.ssh/$SCW_SSH_KEY_ID"
fi
if [ -z "$SSH_KEY_FILE" ] || [ ! -f "$SSH_KEY_FILE" ]; then
  for k in "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_rsa" "$HOME/.ssh/scaleway-gpu-key"; do
    [ -f "$k" ] && SSH_KEY_FILE="$k" && break
  done
fi
if [ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ]; then
  SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -i $SSH_KEY_FILE"
  echo "Using SSH key: $SSH_KEY_FILE"
else
  SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15"
fi

run_remote() { ssh $SSH_OPTS $SERVER_USER@$APP_IP "$1"; }

echo "=============================================="
echo " App server diagnose & fix: $APP_IP"
echo "=============================================="

# Step 1 — Server reachability (skip if SKIP_SSH_CHECK=1)
echo ""
echo "Step 1 — Server reachability"
if [ -n "${SKIP_SSH_CHECK:-}" ]; then
  echo "  SKIP_SSH_CHECK=1: skipping (ensure you can SSH before relying on later steps)."
elif ! run_remote "echo OK" 2>/dev/null; then
  echo "FAIL: Cannot SSH to $APP_IP. Check:"
  echo "  - Instance running: scw instance server list (state RUNNING)"
  echo "  - Security group allows TCP 22, 80, 443 from your IP"
  echo "  - Set key: export SSH_KEY_FILE=/path/to/private_key"
  echo "  - Or: export SCW_SSH_KEY_ID=your-scaleway-key-id"
  echo "  - Test: ssh -i /path/to/key $SERVER_USER@$APP_IP"
  exit 1
fi
[ -z "${SKIP_SSH_CHECK:-}" ] && echo "  SSH: OK"

# Step 2 — Port accessibility (from your machine)
echo ""
echo "Step 2 — Port 80/443 from this machine"
if command -v nc >/dev/null 2>&1; then
  nc -zv -w 5 $APP_IP 80 2>&1 || true
  nc -zv -w 5 $APP_IP 443 2>&1 || true
else
  echo "  (nc not found, skipping)"
fi

# Step 3 — Listening ports on server
echo ""
echo "Step 3 — Listening ports on server"
run_remote "ss -tulnp 2>/dev/null | grep -E ':80|:443|:3000' || echo 'No 80/443/3000 found'"

# Step 4 — Docker / compose
echo ""
echo "Step 4 — Docker containers"
run_remote "docker ps -a 2>/dev/null; echo '---'; cd $APP_DIR 2>/dev/null && docker compose -f deploy/app/docker-compose.app.yml ps -a 2>/dev/null || echo 'No compose or not in $APP_DIR'"

# Step 5 — If port 80 not in use, ensure .env and start stack
echo ""
echo "Step 5 — Ensure app stack is running"
LISTEN_80=$(run_remote "ss -tuln 2>/dev/null | grep ':80 '" || true)
if [ -z "$LISTEN_80" ]; then
  echo "  Port 80 not listening. Starting or fixing stack..."
  DB_PASSWORD="${DATABASE_PASSWORD:-}"
  if [ -z "$DB_PASSWORD" ]; then
    echo "  DATABASE_PASSWORD not set. Set it for first-time deploy: export DATABASE_PASSWORD='your-password'"
    read -s -p "  Enter POSTGRES_PASSWORD for $APP_DIR/.env: " DB_PASSWORD
    echo ""
  fi
  if [ -n "$DB_PASSWORD" ]; then
    run_remote "mkdir -p $APP_DIR"
    # Append .env only if POSTGRES_PASSWORD not already set (password passed via stdin)
    printf '%s' "$DB_PASSWORD" | ssh $SSH_OPTS $SERVER_USER@$APP_IP 'read -r pass
grep -q POSTGRES_PASSWORD '"$APP_DIR"'/.env 2>/dev/null || (
  echo "POSTGRES_USER=safepsy_user"
  echo "POSTGRES_PASSWORD=$pass"
  echo "POSTGRES_DB=safepsy"
  echo "DATABASE_URL=postgresql://safepsy_user:${pass}@postgres:5432/safepsy"
  echo "NODE_ENV=production"
  echo "PORT=3000"
  echo "FRONTEND_URL=https://safepsy.com"
  echo "AI_GPU_BASE_URL=http://51.159.119.91:8000"
  echo "AI_INTERNAL_API_KEY=change_me_match_chatbot"
) >> '"$APP_DIR"'/.env'
  fi
  # Try start without build first (faster), then with build if needed
  run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml up -d 2>&1" || true
  sleep 5
  LISTEN_80_AGAIN=$(run_remote "ss -tuln 2>/dev/null | grep ':80 '" || true)
  if [ -z "$LISTEN_80_AGAIN" ]; then
    echo "  Starting with --build (may take several minutes)..."
    run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml up --build -d 2>&1"
    sleep 30
  fi
else
  echo "  Port 80 already in use."
fi

# Step 6 — Container logs (tail)
echo ""
echo "Step 6 — Container logs (last 30 lines)"
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml logs --tail=30 2>/dev/null" || true

# Step 7 — Internal health checks
echo ""
echo "Step 7 — Internal health (on server)"
run_remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/healthz 2>/dev/null && echo ' backend:3000/healthz' || echo ' backend:3000 unreachable'"
run_remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/healthz 2>/dev/null && echo ' Caddy/80 healthz' || echo ' Caddy/80 unreachable'"

# Step 8 — Firewall (UFW)
echo ""
echo "Step 8 — Firewall (UFW)"
run_remote "ufw status 2>/dev/null || echo 'ufw not active or not installed'"

# Step 9 — Final listening state
echo ""
echo "Step 9 — Listening ports again"
run_remote "ss -tulnp 2>/dev/null | grep -E ':80|:443|:3000' || true"

# Step 10 — Remote curl from this machine
echo ""
echo "Step 10 — Remote HTTP check"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$APP_IP/healthz" 2>/dev/null || echo "000")
if [ "$CODE" = "200" ]; then
  echo "  http://$APP_IP/healthz → $CODE OK"
else
  echo "  http://$APP_IP/healthz → $CODE (expected 200)"
fi

# Step 11 — Full verification suite
echo ""
echo "Step 11 — Full verification suite"
cd "$REPO_ROOT"
SSH_SERVER_IP="$APP_IP" API_SERVER_IP="${API_SERVER_IP:-51.159.119.91}" bash deployment/verify-live.sh 2>&1 || true

echo ""
echo "Done. If all checks pass, app is available at http://$APP_IP and https://safepsy.com (if DNS points here)."
