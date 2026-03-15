#!/bin/bash

# Chatbot (API) Production Update — scw-nostalgic-cannon (51.159.119.91)
# Updates existing chatbot deployment by pulling latest code and rebuilding container.
# Use RESTART_ONLY=1 to skip git pull and only restart chatbot.

set -e

# Configuration - Chatbot server (API / AI service)
SERVER_IP="${SSH_SERVER_IP:-51.159.119.91}"
SERVER_USER="${SSH_SERVER_USER:-root}"
APP_DIR="/opt/safepsy"
RESTART_ONLY="${RESTART_ONLY:-0}"

# SSH key: use SSH_KEY_FILE, or SCW_SSH_KEY_ID, or default id_ed25519 (public: AAAAC3NzaC1lZDI1NTE5AAAAIEMrktarf+fn6NrmRlGXLETwLWa2cVHPfNy5edqCktJr)
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
if [ -z "$SSH_KEY_FILE" ] && [ -n "${SCW_SSH_KEY_ID:-}" ]; then
    [ -f "$HOME/.ssh/$SCW_SSH_KEY_ID" ] && SSH_KEY_FILE="$HOME/.ssh/$SCW_SSH_KEY_ID"
fi
if [ -z "$SSH_KEY_FILE" ] && [ -f "$HOME/.ssh/id_ed25519" ]; then
    SSH_KEY_FILE="$HOME/.ssh/id_ed25519"
fi
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15"
[ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY_FILE"

echo "🚀 Starting Chatbot (API) Production Update"
echo "Server: $SERVER_IP (scw-nostalgic-cannon)"
echo "User: $SERVER_USER"
[ "$RESTART_ONLY" = "1" ] && echo "Mode: RESTART ONLY (skipping git pull)"

# Function to run commands on remote server
run_remote() {
    ssh $SSH_OPTS $SERVER_USER@$SERVER_IP "$1"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>&1; then
  echo ""
  echo "❌ ERROR: Cannot connect to server ($SERVER_IP)."
  echo "   If you see 'Operation timed out': firewall/network blocks port 22; run from a network that can reach Scaleway, or add your IP to the instance security group."
  echo "   If you see 'Permission denied': SSH key not authorized; add your public key to root's authorized_keys on the instance."
  exit 1
fi

if [ "$RESTART_ONLY" != "1" ]; then
  echo "📥 Pulling latest code from GitHub..."
  run_remote "cd $APP_DIR && git pull origin main" || echo "⚠️ Git pull failed (continuing with restart)"
fi

echo "🛑 Stopping chatbot container..."
run_remote "cd $APP_DIR && (docker compose -f deploy/chatbot/docker-compose.chatbot.yml down || docker-compose -f deploy/chatbot/docker-compose.chatbot.yml down) 2>/dev/null || true"

echo "🐳 Rebuilding and starting chatbot (API)..."
run_remote "cd $APP_DIR && (docker compose -f deploy/chatbot/docker-compose.chatbot.yml up --build -d || docker-compose -f deploy/chatbot/docker-compose.chatbot.yml up --build -d)"

echo "⏳ Waiting for chatbot to start..."
sleep 20

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && (docker compose -f deploy/chatbot/docker-compose.chatbot.yml ps || docker-compose -f deploy/chatbot/docker-compose.chatbot.yml ps)"

echo "🌐 Testing chatbot healthz..."
run_remote "curl -sf http://localhost:8000/healthz || echo 'Health check - verify with: curl http://$SERVER_IP:8000/healthz'"

echo "✅ Chatbot (API) update completed!"
echo "🌍 Chatbot should be available at: http://$SERVER_IP:8000/healthz"

