#!/bin/bash

# Production Update Script with Full Cleanup and Container Reset
# Fixes Docker container state issues and ensures fresh deployment

set -e

# Configuration
SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"

echo "🚀 Starting Production Update with Full Cleanup"
echo "Server: $SERVER_IP"
echo "User: $SERVER_USER"

# Function to run commands on remote server
run_remote() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo "🔐 Checking server access..."
if ! run_remote "echo 'Connection verified'" 2>/dev/null; then
  echo "❌ ERROR: Cannot connect to server. Please ensure SSH keys are configured."
  exit 1
fi

echo "💾 Checking disk space before cleanup..."
run_remote "df -h / | tail -1"

echo "🛑 Stopping and removing existing containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down -v || true"

echo "🧹 Cleaning up Docker resources..."
# Remove the frontend volume specifically to ensure fresh build
run_remote "docker volume rm safepsy-landing_frontend_files 2>/dev/null || true"

# Remove all stopped containers
run_remote "docker container prune -f || true"

# Remove all unused images
run_remote "docker image prune -a -f || true"

# Remove all unused volumes
run_remote "docker volume prune -f || true"

# Remove build cache
run_remote "docker builder prune -a -f || true"

# Full system prune
run_remote "docker system prune -a -f --volumes || true"

# Clean old logs
run_remote "journalctl --vacuum-time=3d || true"
run_remote "find /var/log -name '*.gz' -mtime +7 -delete 2>/dev/null || true"
run_remote "find /tmp -type f -mtime +7 -delete 2>/dev/null || true"
run_remote "find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true"

echo "💾 Disk space after cleanup..."
run_remote "df -h / | tail -1"

echo "📥 Pulling latest code from GitHub..."
run_remote "cd $APP_DIR && git pull origin main"

echo "🐳 Rebuilding Docker containers (no cache to ensure fresh frontend build)..."
# Rebuild without cache to ensure frontend changes are included
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml build --no-cache spglobalv1-landing"

echo "🚀 Starting containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"

echo "⏳ Waiting for services to start..."
sleep 20

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo "📋 Checking container logs for errors..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml logs --tail=50 spglobalv1-landing || true"

echo "🌐 Testing application..."
run_remote "sleep 5 && curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check - checking logs...'"

echo "✅ Update completed!"
echo "🌍 Your SafePsy landing page should be available at: https://safepsy.com"
echo ""
echo "💡 If changes don't appear, the frontend might need to be rebuilt."
echo "   Check if the frontend dist files are being served correctly."
