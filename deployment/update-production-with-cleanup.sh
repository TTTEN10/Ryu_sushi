#!/bin/bash

# Production Update Script with Disk Cleanup
# Updates existing deployment by cleaning disk space, pulling latest code, and rebuilding containers

set -e

# Configuration - Server IP stored in Scaleway Secret Manager
# Access via: getSecret('safepsy-credentials', 'infrastructure.ssh.serverIp')
SERVER_IP="${SSH_SERVER_IP:-51.159.179.75}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"

echo "🚀 Starting Production Update with Disk Cleanup"
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

echo "💾 Checking disk space..."
run_remote "df -h / | tail -1"

echo "🧹 Cleaning up disk space..."
# Clean Docker resources
run_remote "docker system prune -a -f --volumes || true"
run_remote "docker builder prune -a -f || true"
run_remote "docker image prune -a -f || true"
run_remote "docker volume prune -f || true"

# Clean old logs
run_remote "journalctl --vacuum-time=3d || true"
run_remote "find /var/log -name '*.gz' -mtime +7 -delete 2>/dev/null || true"
run_remote "find /tmp -type f -mtime +7 -delete 2>/dev/null || true"
run_remote "find /var/tmp -type f -mtime +7 -delete 2>/dev/null || true"

# Clean npm cache if it exists
run_remote "npm cache clean --force 2>/dev/null || true"

echo "💾 Disk space after cleanup..."
run_remote "df -h / | tail -1"

echo "📥 Pulling latest code from GitHub..."
run_remote "cd $APP_DIR && git pull origin main"

echo "🐳 Rebuilding and restarting Docker containers..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up --build -d"

echo "⏳ Waiting for services to restart..."
sleep 15

echo "🔍 Checking service status..."
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"

echo "🌐 Testing application..."
run_remote "curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Health check failed'"

echo "✅ Update completed!"
echo "🌍 Your SafePsy landing page should be available at: https://safepsy.com"
