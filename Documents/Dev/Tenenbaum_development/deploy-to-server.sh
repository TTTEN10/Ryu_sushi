#!/bin/bash

# Tenenbaum.eu Production Deployment Script
SERVER_USER="root"
SERVER_HOST="51.159.154.29"
SSH_KEY="$HOME/.ssh/tenenbaum-prod"
SERVER_PATH="/opt/tenenbaum-app"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

echo "========================================"
echo "  Tenenbaum.eu Production Deployment"
echo "========================================"

# Step 1: Build locally
log_info "Step 1: Building application..."
npm run build
log_success "Build completed"

# Step 2: Create deployment archive
log_info "Step 2: Creating deployment archive..."
DEPLOY_DIR=$(mktemp -d)
cp -r dist "$DEPLOY_DIR/"
cp -r src "$DEPLOY_DIR/"
cp Dockerfile "$DEPLOY_DIR/"
cp Caddyfile "$DEPLOY_DIR/"
cp docker-compose.prod.yml "$DEPLOY_DIR/"
cp package*.json "$DEPLOY_DIR/"
cp .dockerignore "$DEPLOY_DIR/"
cp vite.config.js "$DEPLOY_DIR/"
cp tailwind.config.js "$DEPLOY_DIR/"
cp postcss.config.js "$DEPLOY_DIR/"

# Update Caddyfile for production
cat > "$DEPLOY_DIR/Caddyfile" << 'CADDY_EOF'
tenenbaum.eu {
    encode gzip
    root * /usr/share/caddy
    file_server
    try_files {path} /index.html
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    tls {
        protocols tls1.2 tls1.3
    }
}
http://tenenbaum.eu {
    redir https://tenenbaum.eu{uri} permanent
}
CADDY_EOF

# Include index.html source file
cp index.html "$DEPLOY_DIR/"

ARCHIVE_NAME="tenenbaum-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$ARCHIVE_NAME" -C "$DEPLOY_DIR" .
rm -rf "$DEPLOY_DIR"
log_success "Archive created: $ARCHIVE_NAME"

# Step 3: Upload to server
log_info "Step 3: Uploading to server..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$ARCHIVE_NAME" "${SERVER_USER}@${SERVER_HOST}:~/tenenbaum-deploy.tar.gz"
log_success "Archive uploaded"

# Step 4: Deploy on server
log_info "Step 4: Deploying on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << 'SSH_EOF'
set -e

# Use docker compose (v2) or docker-compose (v1)
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "ERROR: Docker Compose is not installed"
    exit 1
fi

# Create directory
mkdir -p /opt/tenenbaum-app
cd /opt/tenenbaum-app

# Extract archive
tar -xzf ~/tenenbaum-deploy.tar.gz

# Stop existing tenenbaum containers
docker stop tenenbaum_v2 2>/dev/null || true
docker rm tenenbaum_v2 2>/dev/null || true
$COMPOSE_CMD -f docker-compose.prod.yml down 2>/dev/null || true

# Force stop any container using port 80 or 443
for port in 80 443; do
    CONTAINER_ID=$(docker ps --filter "publish=$port" -q 2>/dev/null)
    if [ -n "$CONTAINER_ID" ]; then
        echo "Stopping container using port $port: $CONTAINER_ID"
        docker stop $CONTAINER_ID 2>/dev/null || true
        docker rm $CONTAINER_ID 2>/dev/null || true
    fi
done

# Build and deploy
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build

# Wait for health check
sleep 15

# Show status
echo ""
echo "=== Container Status ==="
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo ""
echo "=== Health Check ==="
curl -sI http://localhost:80 | head -5 || echo "Health check pending..."

# Cleanup
rm ~/tenenbaum-deploy.tar.gz
SSH_EOF

log_success "Deployment completed!"

# Cleanup
rm -f "$ARCHIVE_NAME"

echo ""
echo "========================================"
log_success "Production deployment completed!"
echo "========================================"
echo "Domain: https://tenenbaum.eu"
echo ""