#!/bin/bash
# =============================================================================
# Tenenbaum.eu - Production Deployment Script
# =============================================================================
# Deploys to Scaleway instance: scw-tenenbaum-eu (51.159.154.29)
# Domain: tenenbaum.eu
#
# This script:
# 1. Uses local git repo (already authenticated)
# 2. Copies files to server via SCP
# 3. Runs Docker build/deploy on server
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

# Configuration
SERVER_HOST="51.159.154.29"
SERVER_USER="root"
SERVER_DOMAIN="tenenbaum.eu"
APP_DIR="/opt/tenenbaum"
SSH_KEY="$HOME/SSH/tenenbaum_development"
BRANCH="new-main"

# Flags
SHOW_LOGS=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    echo ""
    echo "Tenenbaum.eu Production Deployment"
    echo "==================================="
    echo ""
    echo "Usage: ./deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --logs, -l     Show logs after deployment"
    echo "  --help, -h     Show this help message"
    echo ""
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check SSH key exists
    if [ ! -f "$SSH_KEY" ]; then
        log_error "SSH key not found at: $SSH_KEY"
        exit 1
    fi

    # Test SSH connection
    log_info "Testing SSH connection to $SERVER_HOST..."
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "echo 'OK'" &> /dev/null; then
        log_error "Cannot connect to server via SSH."
        echo "Test manually: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
        exit 1
    fi

    log_success "SSH connection successful"
}

deploy() {
    log_step "Starting deployment to $SERVER_DOMAIN..."
    echo ""

    # Create tarball of local files
    log_step "Step 1/4: Creating deployment package..."
    TEMP_DIR=$(mktemp -d)
    DEPLOY_TAR="$TEMP_DIR/tenenbaum-deploy.tar.gz"

    # Get list of files to deploy (exclude node_modules, .git, etc.)
    tar -czf "$DEPLOY_TAR" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.cursor' \
        --exclude='.claude' \
        --exclude='.DS_Store' \
        --exclude='*.log' \
        -C "$SCRIPT_DIR" .

    log_success "Deployment package created: $(du -h "$DEPLOY_TAR" | cut -f1)"

    # Copy files to server
    log_step "Step 2/4: Copying files to server..."
    scp -i "$SSH_KEY" "$DEPLOY_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/tenenbaum-deploy.tar.gz"
    log_success "Files copied to server"

    # Run remote deployment
    log_step "Step 3/4: Deploying on server..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'REMOTESCRIPT'
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

APP_DIR="/opt/tenenbaum"

echo ""
echo "=============================================="
echo "  Tenenbaum.eu Production Deploy"
echo "=============================================="
echo "  Server: $(hostname)"
echo "  Domain: tenenbaum.eu"
echo "  Date: $(date)"
echo "=============================================="
echo ""

# Step 1: Install Docker if needed
log_step "Step 1/4: Checking Docker..."
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release git

    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin

    docker_plugin_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    docker_compose_version=${docker_plugin_version:-v2.24.0}
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/${docker_compose_version}/docker-compose-linux-x86_64" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    systemctl enable docker && systemctl start docker
    usermod -aG docker $(whoami)

    log_success "Docker installed"
else
    log_success "Docker already installed"
fi

# Step 2: Extract deployment package
log_step "Step 2/4: Extracting files..."
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
fi
mkdir -p "$APP_DIR"
tar -xzf /tmp/tenenbaum-deploy.tar.gz -C "$APP_DIR"
rm /tmp/tenenbaum-deploy.tar.gz
log_success "Files extracted to $APP_DIR"

# Step 3: Create Caddyfile
log_step "Step 3/4: Configuring Caddy..."
cat > "$APP_DIR/Caddyfile" << 'CADDYFILE'
tenenbaum.eu {
    root * /site/dist
    file_server

    encode gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    try_files {path} /index.html

    tls {
        email admin@tenenbaum.eu
    }

    log {
        output file /var/log/caddy/access.log format json
    }
    errors {
        output file /var/log/caddy/error.log
    }
}

www.tenenbaum.eu {
    redir https://tenenbaum.eu{uri} permanent
}
CADDYFILE
log_success "Caddyfile configured"

# Step 4: Create docker-compose.prod.yml and deploy
log_step "Step 4/4: Building and deploying..."
cat > "$APP_DIR/docker-compose.prod.yml" << 'COMPOSEFILE'
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: tenenbaum-web
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - tenenbaum-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  tenenbaum-network:
    driver: bridge

volumes:
  caddy-data:
    driver: local
  caddy-config:
    driver: local
COMPOSEFILE

cd "$APP_DIR"

docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

sleep 15

echo ""
log_info "Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
log_info "Health check (HTTP):"
if curl -s http://localhost:80 > /dev/null; then
    log_success "HTTP is responding on port 80"
else
    log_warning "HTTP may still be starting"
fi

echo ""
log_info "Checking HTTPS (certificate may take 1-2 min):"
if curl -sk https://localhost:443 > /dev/null 2>&1; then
    log_success "HTTPS is responding on port 443"
else
    log_warning "HTTPS still initializing"
fi

echo ""
echo "=============================================="
log_success "Deployment completed!"
echo "=============================================="
echo ""
echo "  🌐 Domain: https://tenenbaum.eu"
echo "  📁 App Dir: $APP_DIR"
echo ""
echo "  Useful commands:"
echo "  - Logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Status: docker compose -f docker-compose.prod.yml ps"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo ""
REMOTESCRIPT

    # Cleanup
    rm -rf "$TEMP_DIR"

    log_success "Deployment complete!"
    echo ""
    log_info "Your site is now live at: https://tenenbaum.eu"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs|-l) SHOW_LOGS=true; shift ;;
        --help|-h) show_help; shift ;;
        *) log_error "Unknown option: $1"; show_help ;;
    esac
done

# Main
echo ""
echo "=============================================="
echo "  Tenenbaum.eu Production Deploy"
echo "=============================================="
echo "  Server: $SERVER_USER@$SERVER_HOST"
echo "  Domain: $SERVER_DOMAIN"
echo "  Branch: $BRANCH"
echo "=============================================="
echo ""

check_prerequisites
deploy

if [ "$SHOW_LOGS" = true ]; then
    log_info "Showing live logs (Ctrl+C to exit)..."
    ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs -f"
fi