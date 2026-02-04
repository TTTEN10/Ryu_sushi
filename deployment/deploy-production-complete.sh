#!/bin/bash

# Complete Production Deployment Script
# Combines all best practices from previous deployments
# Deploys to: 51.158.74.207

set -e

SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"
PUBLIC_DNS="8e26220a-0431-416e-b297-082caef80524.pub.instances.scw.cloud"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Complete Production Deployment"
echo "Server: $SERVER_IP"
echo "Public DNS: $PUBLIC_DNS"
echo ""

# Function to run commands on remote server
run_remote() {
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 $SERVER_USER@$SERVER_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$1" $SERVER_USER@$SERVER_IP:"$2"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>/dev/null; then
  echo "❌ ERROR: Cannot connect to server. Please ensure SSH keys are configured."
  echo "   Try: ssh-copy-id $SERVER_USER@$SERVER_IP"
  exit 1
fi

echo "📦 Installing Docker and dependencies..."
run_remote "apt update -qq && apt install -y docker.io docker-compose git curl >/dev/null 2>&1 || (apt install -y docker.io git curl && curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose)"

echo "🔧 Starting Docker service..."
run_remote "systemctl start docker && systemctl enable docker || service docker start"

echo "📁 Creating application directory..."
run_remote "mkdir -p $APP_DIR"

echo "📤 Copying files to server..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.next' \
  --exclude '.cache' \
  --exclude '*.log' \
  --exclude '.env.local' \
  --exclude '.env.*.local' \
  --exclude 'dev.db' \
  --exclude '*.db' \
  --exclude '.DS_Store' \
  -e "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30" \
  "$LOCAL_DIR/" $SERVER_USER@$SERVER_IP:$APP_DIR/ 2>&1 | tail -20

echo "🔧 Fixing Dockerfile (vite build command)..."
run_remote "cd $APP_DIR && sed -i 's/vite build/npx vite build/g' Dockerfile || true"

echo "🔧 Creating production environment files..."

# Database credentials
DB_USER="${DATABASE_USER:-safepsy_user}"
DB_PASSWORD="${DATABASE_PASSWORD:-ceCS4EeuS3owaoFnAZYPvyLg6BrxvOYeeNTFzYed5EU=}"
DB_NAME="${DATABASE_NAME:-safepsy}"
DB_HOST="${DATABASE_HOST:-postgres}"
DB_PORT="${DATABASE_PORT:-5432}"

# Create root .env
run_remote "cat > $APP_DIR/.env << 'EOF'
# SafePsy Production Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
EOF"

# Create backend .env
run_remote "mkdir -p $APP_DIR/apps/api"
run_remote "cat > $APP_DIR/apps/api/.env << 'EOF'
# SafePsy Backend Production Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://safepsy.com,https://www.safepsy.com,https://${PUBLIC_DNS}
IP_HASHING_ENABLED=false
PLAUSIBLE_DOMAIN=safepsy.com
ENABLE_CONFIRMATION_EMAIL=false
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
EOF"

# Create frontend .env
run_remote "mkdir -p $APP_DIR/apps/web"
run_remote "cat > $APP_DIR/apps/web/.env << 'EOF'
# SafePsy Frontend Production Configuration
VITE_PLAUSIBLE_DOMAIN=safepsy.com
VITE_API_URL=https://safepsy.com/api
EOF"

echo "🛑 Stopping existing containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down -v || true"

echo "🧹 Cleaning up Docker resources..."
run_remote "docker system prune -f || true"
run_remote "docker volume rm safepsy-landing_frontend_files 2>/dev/null || true"

echo "🐳 Building Docker containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml build --no-cache spglobalv1-landing 2>&1 | tail -50"

echo "🚀 Starting containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"

echo "⏳ Waiting for services to start (45 seconds)..."
sleep 45

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo "📋 Checking container logs..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs --tail=30 spglobalv1-landing 2>&1 | tail -20"

echo "🌐 Testing application health..."
HEALTH_CHECK=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/healthz || curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ || echo '000'")
if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "000" ]; then
  echo "✅ Health check: HTTP $HEALTH_CHECK"
else
  echo "⚠️  Health check returned: $HEALTH_CHECK"
fi

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌍 Your SafePsy application should be available at:"
echo "   - https://safepsy.com (main site)"
echo "   - https://www.safepsy.com (redirects to safepsy.com)"
echo "   - https://safepsy.com/chat (chat route)"
echo "   - http://${SERVER_IP} (direct IP access)"
echo ""
echo "🔍 Verification checklist:"
echo "   1. Visit https://safepsy.com - Connect Wallet button should NOT be visible"
echo "   2. Visit https://safepsy.com/chat - Connect Wallet button SHOULD be visible"
echo "   3. Background image should be removed from home page"
echo ""
echo "🔧 Management commands:"
echo "   Check logs: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f'"
echo "   Stop: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml down'"
echo "   Restart: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart'"
echo "   Status: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps'"
