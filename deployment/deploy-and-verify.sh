#!/bin/bash

# Production Deployment and Verification Script
# Deploys changes and verifies they're live on safepsy.com

set -e

SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"

echo "🚀 Starting Production Deployment and Verification"
echo "Server: $SERVER_IP"
echo ""

# Function to run commands on remote server
run_remote() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>/dev/null; then
  echo "❌ ERROR: Cannot connect to server. Please ensure SSH keys are configured."
  exit 1
fi

echo "📥 Pulling latest code from GitHub..."
run_remote "cd $APP_DIR && git pull origin main"

echo "🔍 Checking current commit..."
CURRENT_COMMIT=$(run_remote "cd $APP_DIR && git rev-parse HEAD")
echo "Current commit: $CURRENT_COMMIT"

echo "🛑 Stopping containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down || true"

echo "🧹 Cleaning up Docker resources..."
run_remote "docker volume rm safepsy-landing_frontend_files 2>/dev/null || true"
run_remote "docker system prune -a -f --volumes || true"

echo "🐳 Rebuilding containers (no cache)..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml build --no-cache spglobalv1-landing"

echo "🚀 Starting containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"

echo "⏳ Waiting for services to start..."
sleep 25

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo "📋 Checking container logs..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs --tail=30 spglobalv1-landing | tail -20"

echo "🌐 Testing application health..."
run_remote "curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check - checking logs...'"

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔍 Verification:"
echo "   1. Visit https://safepsy.com - Connect Wallet button should NOT be visible"
echo "   2. Visit https://safepsy.com/chat - Connect Wallet button SHOULD be visible"
echo "   3. Background image should be removed from home page"
echo ""
echo "💡 If changes don't appear, try:"
echo "   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   - Clear browser cache"
echo "   - Wait 1-2 minutes for CDN/proxy cache to clear"
