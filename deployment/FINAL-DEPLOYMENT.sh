#!/bin/bash

# FINAL Production Deployment Script
# Run this script manually: ./deployment/FINAL-DEPLOYMENT.sh
# This script combines all deployment best practices

set -e

SERVER_IP="51.158.74.207"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"
PUBLIC_DNS="8e26220a-0431-416e-b297-082caef80524.pub.instances.scw.cloud"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 FINAL Production Deployment"
echo "Server: $SERVER_IP"
echo "Public DNS: $PUBLIC_DNS"
echo ""

# Function to run commands on remote server
run_remote() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo "🔐 Testing server connection..."
if ! run_remote "echo 'Connection verified'" 2>/dev/null; then
  echo "❌ ERROR: Cannot connect to server."
  echo "   Please verify:"
  echo "   1. Instance is running in Scaleway console"
  echo "   2. SSH key is configured: ssh-copy-id $SERVER_USER@$SERVER_IP"
  echo "   3. Firewall allows SSH (port 22)"
  exit 1
fi

echo "✅ Server connection verified!"

echo ""
echo "📦 Step 1: Installing Docker and dependencies..."
run_remote "apt update -qq && apt install -y docker.io docker-compose git curl >/dev/null 2>&1 || true"
run_remote "systemctl start docker && systemctl enable docker || service docker start"

echo ""
echo "📁 Step 2: Setting up application directory..."
run_remote "mkdir -p $APP_DIR"

echo ""
echo "📤 Step 3: Copying files to server (this may take a few minutes)..."
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
  -e "ssh -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" $SERVER_USER@$SERVER_IP:$APP_DIR/

echo ""
echo "🔧 Step 4: Fixing Dockerfile (vite build command)..."
run_remote "cd $APP_DIR && sed -i 's/vite build/npx vite build/g' Dockerfile || true"

echo ""
echo "🔧 Step 5: Creating production environment files..."

# Database credentials
DB_USER="safepsy_user"
DB_PASSWORD="ceCS4EeuS3owaoFnAZYPvyLg6BrxvOYeeNTFzYed5EU="
DB_NAME="safepsy"
DB_HOST="postgres"
DB_PORT="5432"

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

echo ""
echo "🛑 Step 6: Stopping existing containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down -v || true"

echo ""
echo "🧹 Step 7: Cleaning up Docker resources..."
run_remote "docker system prune -f || true"
run_remote "docker volume rm safepsy-landing_frontend_files 2>/dev/null || true"

echo ""
echo "🐳 Step 8: Building Docker containers (this will take 5-10 minutes)..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml build --no-cache spglobalv1-landing"

echo ""
echo "🚀 Step 9: Starting containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"

echo ""
echo "⏳ Step 10: Waiting for services to start (45 seconds)..."
sleep 45

echo ""
echo "🔍 Step 11: Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo ""
echo "📋 Step 12: Checking container logs..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs --tail=50 spglobalv1-landing 2>&1 | tail -30"

echo ""
echo "🌐 Step 13: Testing application..."
HEALTH=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/healthz 2>/dev/null || echo '000'")
if [ "$HEALTH" = "200" ]; then
  echo "✅ Health check passed (HTTP 200)"
else
  echo "⚠️  Health check: HTTP $HEALTH"
  echo "   Checking main page..."
  MAIN=$(run_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:80/ 2>/dev/null || echo '000'")
  echo "   Main page: HTTP $MAIN"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETED!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌍 Your SafePsy application should be available at:"
echo "   • https://safepsy.com"
echo "   • https://www.safepsy.com"
echo "   • https://safepsy.com/chat"
echo "   • http://${SERVER_IP}"
echo ""
echo "🔍 Verification Checklist:"
echo "   ✓ Visit https://safepsy.com"
echo "     - Connect Wallet button should NOT be visible"
echo "     - Background image should be removed"
echo "   ✓ Visit https://safepsy.com/chat"
echo "     - Connect Wallet button SHOULD be visible"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:  ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs -f'"
echo "   Restart:    ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml restart'"
echo "   Status:     ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps'"
echo ""
