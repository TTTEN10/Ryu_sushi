#!/bin/bash

# Quick deployment script - runs all steps in sequence
set -e

SERVER_IP="${SSH_SERVER_IP:-51.158.74.207}"
SERVER_USER="root"
APP_DIR="/opt/safepsy-landing"

run_remote() {
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
}

echo "🚀 Quick Deployment to $SERVER_IP"

# Stop existing
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml down || true"

# Clean up
run_remote "docker system prune -f || true"

# Rebuild and start
run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml up --build -d"

# Wait and check
echo "⏳ Waiting 30 seconds for services..."
sleep 30

run_remote "cd $APP_DIR && docker-compose -f docker-compose.prod.yml ps"
run_remote "curl -f http://localhost:80/healthz || curl -f http://localhost:80/ || echo 'Service starting...'"

echo "✅ Deployment complete! Check http://$SERVER_IP"
