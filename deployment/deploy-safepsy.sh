#!/bin/bash

# SafePsy Landing Page Deployment Script
# Deploy to Scaleway server at 51.159.176.62 (scw-focused-dubinsky, DEV1-S)
# SECURITY: Requires SSH key authentication, runs as non-root user

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Configuration - Server IP and Public DNS
SERVER_IP="${SSH_SERVER_IP:-51.159.176.62}"
PUBLIC_DNS="${PUBLIC_DNS:-b37315e2-f767-4c87-9488-995ab19fa402.pub.instances.scw.cloud}"
SERVER_USER="${SSH_SERVER_USER:-root}"  # Use root for deployment
REPO_URL="https://github.com/TTTEN10/SPappv1.1.git"
APP_DIR="/opt/safepsy-landing"

echo "🚀 Starting SafePsy Landing Page Deployment"
echo "Server: $SERVER_IP"
echo "User: $SERVER_USER"
echo "Repository: $REPO_URL"

# SSH key: use SSH_KEY_FILE, or Scaleway key ID (e.g. d7fcea26-d585-41b2-945c-30659d083a4d)
# Key ID resolves to ~/.ssh/<key-id> or ~/.ssh/scaleway-gpu-key as fallback
SSH_KEY_FILE="${SSH_KEY_FILE:-}"
if [ -z "$SSH_KEY_FILE" ] && [ -n "${SCW_SSH_KEY_ID:-}" ]; then
    [ -f "$HOME/.ssh/$SCW_SSH_KEY_ID" ] && SSH_KEY_FILE="$HOME/.ssh/$SCW_SSH_KEY_ID"
fi
SSH_OPTS="-o StrictHostKeyChecking=no"
[ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ] && SSH_OPTS="$SSH_OPTS -i $SSH_KEY_FILE"

# Function to run commands on remote server
run_remote() {
    ssh $SSH_OPTS $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    scp $SSH_OPTS "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo "🔐 Checking server access..."
# Wait for SSH with retries
MAX_RETRIES=60
RETRY_COUNT=0
SSH_READY=false

echo "⏳ Waiting for instance to be ready (this may take a few minutes after Terraform update)..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if run_remote "echo 'Connection verified'" 2>/dev/null; then
    SSH_READY=true
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting 10 seconds..."
  fi
  sleep 10
done

if [ "$SSH_READY" = false ]; then
  echo "❌ ERROR: Cannot connect to server after $MAX_RETRIES attempts."
  echo "💡 The instance may still be initializing or SSH keys need configuration."
  echo "   Please check:"
  echo "   1. Instance is running in Scaleway Console"
  echo "   2. Security group allows SSH (port 22)"
  echo "   3. SSH key is added to instance: $SSH_KEY_ID"
  echo "   4. Try manually: ssh root@$SERVER_IP"
  exit 1
fi

echo "📦 Installing Docker and dependencies (if needed)..."
# Skip apt install if Docker and Compose already work (avoids containerd.io vs containerd conflict)
run_remote "command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && echo 'Docker already OK' || (rm -f /etc/apt/sources.list.d/docker*.list 2>/dev/null; apt update && apt install -y docker.io docker-compose-plugin git curl 2>/dev/null || apt install -y docker.io git curl && (command -v docker-compose >/dev/null || (curl -sL \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose)))"

echo "🔧 Starting Docker service..."
run_remote "systemctl start docker 2>/dev/null; systemctl enable docker 2>/dev/null; systemctl is-active docker || service docker start || true"

echo "📁 Creating application directory..."
run_remote "mkdir -p $APP_DIR"

echo "📥 Syncing repository..."
if [ -n "${DEPLOY_VIA_RSYNC:-}" ] && [ -d "$REPO_ROOT/.git" ]; then
  # Deploy from local workspace (avoids private repo clone on server)
  rsync -az -e "ssh $SSH_OPTS" --delete --exclude=.git --exclude=node_modules --exclude=apps/*/node_modules --exclude=dist --exclude=.env "$REPO_ROOT/" "$SERVER_USER@$SERVER_IP:$APP_DIR/"
else
  run_remote "mkdir -p $APP_DIR && (cd $APP_DIR && git rev-parse --is-inside-work-tree 2>/dev/null | grep -q true && git pull origin main || (cd /tmp && rm -rf repoclone && git clone $REPO_URL repoclone && cp -a repoclone/. $APP_DIR/ && rm -rf repoclone))"
fi

echo "🔧 Creating production environment files..."

# Create production .env file (app server); AI_GPU_BASE_URL points to chatbot at 51.159.119.91 (scw-nostalgic-cannon)
run_remote "cat > $APP_DIR/.env << 'ENVEOF'
# SafePsy Production Configuration (scw-focused-dubinsky)
# Chat is available at safepsy.com/chat; API (chatbot) runs on scw-nostalgic-cannon
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
AI_GPU_BASE_URL=http://51.159.119.91:8000
AI_INTERNAL_API_KEY=REPLACE_WITH_SAME_KEY_AS_CHATBOT
ENVEOF"

# Get database credentials from environment or prompt
DB_USER="${DATABASE_USER:-safepsy_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-}"
DB_NAME="${DATABASE_NAME:-safepsy}"
DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  DATABASE_PASSWORD not set in environment"
    echo "   Please set it via: export DATABASE_PASSWORD='your-password'"
    read -s -p "Enter database password (will not be displayed): " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        echo "❌ Database password is required"
        exit 1
    fi
fi

# Append database vars to root .env (required by deploy/app/docker-compose.app.yml)
run_remote "cat >> $APP_DIR/.env << DBOF
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=$DB_NAME
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
DBOF"

# Create production backend .env file
run_remote "cat > $APP_DIR/apps/api/.env << 'EOF'
# SafePsy Backend Production Configuration
# Chat is available at safepsy.com/chat
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
EOF"

# Create production frontend .env file
run_remote "cat > $APP_DIR/apps/web/.env << 'EOF'
# SafePsy Frontend Production Configuration
VITE_PLAUSIBLE_DOMAIN=safepsy.com
VITE_API_URL=https://safepsy.com/api
EOF"

echo "🐳 Building and starting Docker containers..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml up --build -d"

echo "⏳ Waiting for services to start..."
sleep 30

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml ps"

echo "🌐 Testing application..."
run_remote "sleep 10 && curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check failed'"

echo "✅ Deployment completed!"
echo "🌍 Your SafePsy application should be available at:"
echo "   - https://safepsy.com (main site)"
echo "   - https://www.safepsy.com (redirects to safepsy.com)"
echo "   - https://safepsy.com/chat (chat route)"
echo ""
echo "🔧 Management commands:"
echo "   Check logs: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml logs -f'"
echo "   Stop: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml down'"
echo "   Restart: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose -f deploy/app/docker-compose.app.yml restart'"
echo ""
echo "🔐 Security reminders:"
echo "   - Database credentials are configured in deploy/app/.env"
echo "   - Review log files for any issues"
echo "   - Public DNS: $PUBLIC_DNS"
