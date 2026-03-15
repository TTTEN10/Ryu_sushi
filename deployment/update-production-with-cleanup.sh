#!/bin/bash

# Production Update Script with Disk Cleanup
# Updates existing deployment by cleaning disk space, pulling latest code, and rebuilding containers

set -e

# Configuration - Server IP stored in Scaleway Secret Manager
# Access via: getSecret('safepsy-credentials', 'infrastructure.ssh.serverIp')
SERVER_IP="${SSH_SERVER_IP:-51.159.163.28}"
SERVER_USER="${SSH_SERVER_USER:-root}"
APP_DIR="/opt/safepsy-landing"

# SSH key: use SSH_KEY_FILE, or SCW_SSH_KEY_ID, or default id_ed25519 (public: AAAAC3NzaC1lZDI1NTE5AAAAIEMrktarf+fn6NrmRlGXLETwLWa2cVHPfNy5edqCktJr)
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
if [ -z "$SSH_KEY_FILE" ] && [ -n "${SCW_SSH_KEY_ID:-}" ]; then
    [ -f "$HOME/.ssh/$SCW_SSH_KEY_ID" ] && SSH_KEY_FILE="$HOME/.ssh/$SCW_SSH_KEY_ID"
fi
if [ -z "$SSH_KEY_FILE" ] && [ -f "$HOME/.ssh/id_ed25519" ]; then
    SSH_KEY_FILE="$HOME/.ssh/id_ed25519"
fi
SSH_OPTS="-o StrictHostKeyChecking=no"
[ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY_FILE"

echo "🚀 Starting Production Update with Disk Cleanup"
echo "Server: $SERVER_IP"
echo "User: $SERVER_USER"

# Function to run commands on remote server
run_remote() {
    ssh $SSH_OPTS $SERVER_USER@$SERVER_IP "$1"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>&1; then
  echo ""
  echo "❌ ERROR: Cannot connect to server ($SERVER_IP)."
  echo "   If you see 'Operation timed out': firewall or network blocks port 22 from your IP; run from a network that can reach Scaleway, or add your IP to the instance security group."
  echo "   If you see 'Permission denied': SSH key not authorized on server; ensure your public key is in root's authorized_keys on the instance."
  exit 1
fi

echo "💾 Checking disk space..."
run_remote "df -h / | tail -1"

echo "📐 Expanding root filesystem if volume was resized..."
# After Scaleway volume resize, expand partition and filesystem to use new space
run_remote "apt-get install -y cloud-guest-utils 2>/dev/null || true"
run_remote 'ROOT_DEV=$(findmnt -n -o SOURCE / | sed "s/[0-9]*$//"); PART_NUM=$(findmnt -n -o SOURCE / | grep -oE "[0-9]+\$"); if [ -n "$ROOT_DEV" ] && [ -b "$ROOT_DEV" ] && growpart $ROOT_DEV $PART_NUM 2>/dev/null; then resize2fs ${ROOT_DEV}${PART_NUM} 2>/dev/null; echo "Root expanded"; fi; df -h / | tail -1' || echo "⚠️ Expand skipped (reboot may be needed after volume resize)"

echo "🧹 Cleaning up disk space..."
# Free space: remove node_modules, npm cache, and non-essential dirs
run_remote "rm -rf $APP_DIR/node_modules $APP_DIR/apps/*/node_modules $APP_DIR/backend $APP_DIR/frontend $APP_DIR/infra $APP_DIR/documentation 2>/dev/null || true"
run_remote "rm -rf /root/.npm /tmp/npm-* 2>/dev/null || true"
# Clean Docker resources (skip volume prune to preserve postgres_data)
run_remote "docker system prune -a -f || true"
run_remote "docker builder prune -a -f || true"
run_remote "docker image prune -a -f || true"

# Clean old logs
run_remote "journalctl --vacuum-time=3d || true"
run_remote "find /var/log -name '*.gz' -mtime +7 -delete 2>/dev/null || true"
run_remote "find /tmp -type f -mtime +7 -delete 2>/dev/null || true"
run_remote "find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true"

# Clean npm cache if it exists
run_remote "npm cache clean --force 2>/dev/null || true"

echo "💾 Disk space after cleanup..."
run_remote "df -h / | tail -1"

echo "📥 Syncing code to server..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RSYNC_SSH="ssh $SSH_OPTS"
rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude 'node_modules' --exclude '.git' --exclude 'apps/*/node_modules' \
  --exclude '*.log' --exclude '.env' --exclude 'apps/web/dist' \
  "$PROJECT_ROOT/" $SERVER_USER@$SERVER_IP:$APP_DIR/ 2>/dev/null && echo "✅ Code synced" || \
  (run_remote "cd $APP_DIR && git pull origin main" 2>/dev/null && echo "✅ Git pull succeeded" || echo "⚠️ Sync/git failed (continuing with existing code)")

echo "🐳 Rebuilding and restarting Docker containers (Frontend + Backend + Caddy)..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml down --remove-orphans 2>/dev/null || docker-compose -f deploy/app/docker-compose.app.yml down --remove-orphans 2>/dev/null || true"
run_remote "docker stop \$(docker ps -aq) 2>/dev/null || true"
run_remote "sleep 2"
run_remote "fuser -k 80/tcp 2>/dev/null || true"
run_remote "sleep 2"
run_remote "cd $APP_DIR && (docker compose -f deploy/app/docker-compose.app.yml up --build -d || docker-compose -f deploy/app/docker-compose.app.yml up --build -d)"

echo "⏳ Waiting for services to restart..."
sleep 15

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && (docker compose -f deploy/app/docker-compose.app.yml ps || docker-compose -f deploy/app/docker-compose.app.yml ps)"

echo "🌐 Testing application..."
run_remote "curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check failed'"

echo "✅ Update completed!"
echo "🌍 Your SafePsy landing page should be available at: https://safepsy.com"
