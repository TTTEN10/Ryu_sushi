#!/bin/bash
# =============================================================================
# Tenenbaum Development - One-Command Production Deployment
# =============================================================================
# Deploys the application to production server (51.159.154.29)
# Domain: tenenbaum.eu
# GitHub: https://github.com/TTTEN10/SPiOSlandingv3
#
# Usage: ./deploy-prod.sh [OPTIONS]
#
# Options:
#   --build, -b      Force rebuild of Docker images
#   --logs, -l       Show logs after deployment
#   --verify, -v     Run production verification after deploy
#   --rollback, -r   Rollback to previous version
#   --status, -s     Check deployment status
#   --help, -h       Show this help message
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
REPO_URL="https://github.com/TTTEN10/SPiOSlandingv3.git"
BRANCH="new-main"
APP_DIR="/opt/tenenbaum"

# SSH Key configuration
SSH_KEY="$HOME/SSH/tenenbaum_development"

# Flags
FORCE_BUILD=false
SHOW_LOGS=false
RUN_VERIFY=false
SHOW_STATUS=false
ROLLBACK=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    head -18 "$0" | tail -15
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v ssh &> /dev/null; then
        log_error "SSH is not installed."
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "Git is not installed."
        exit 1
    fi

    # Check if SSH key exists
    if [ ! -f "$SSH_KEY" ]; then
        log_error "SSH key not found at $SSH_KEY"
        exit 1
    fi

    log_info "Testing SSH connection to $SERVER_HOST..."
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_HOST" "echo 'OK'" &> /dev/null; then
        log_warning "Cannot connect to server via SSH."
        echo ""
        echo "Please ensure:"
        echo "  1. Server ($SERVER_HOST) is accessible"
        echo "  2. SSH key ($SSH_KEY) is correct and has correct permissions (chmod 600)"
        echo "  3. Public key is added to Scaleway console for instance scw-tenenbaum-eu"
        echo ""
        echo "Try: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

run_remote() {
    ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" "$1"
}

deploy_remote() {
    log_step "Starting remote deployment to $SERVER_HOST..."
    echo ""

    cat << 'REMOTESCRIPT' | ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" 'bash -s'
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_step() { echo -e "${CYAN}🚀 $1${NC}"; }

echo ""
echo "=============================================="
echo "  Tenenbaum Production Deploy"
echo "=============================================="
echo "  Server: $(hostname)"
echo "  Domain: tenenbaum.eu"
echo "  Date: $(date)"
echo "=============================================="
echo ""

APP_DIR="/opt/tenenbaum"
REPO_URL="https://github.com/TTTEN10/SPiOSlandingv3.git"
BRANCH="new-main"

# Step 1: Install Docker
log_step "Step 1/6: Checking Docker..."
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
    log_success "Docker already installed ($(docker --version))"
fi

# Step 2: Install Node.js (for future use)
log_step "Step 2/6: Checking Node.js..."
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
    log_success "Node.js installed: $(node -v)"
else
    log_success "Node.js already installed: $(node -v)"
fi

# Step 3: Clone/Update repo
log_step "Step 3/6: Cloning repository..."
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    log_success "Repository cloned"
else
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
    log_success "Repository updated"
fi

cd "$APP_DIR"

# Step 4: Create .env
log_step "Step 4/6: Creating environment file..."
cat > .env << 'ENVFILE'
NODE_ENV=production
SERVER_DOMAIN=tenenbaum.eu
ENVFILE
log_success "Environment file created"

# Step 5: Create docker-compose.prod.yml
log_step "Step 5/6: Creating Docker Compose config..."
cat > docker-compose.prod.yml << 'COMPOSEFILE'
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
log_success "Docker Compose config created"

# Step 6: Create Caddyfile for production
log_step "Step 6/6: Configuring Caddy for HTTPS..."
cat > Caddyfile << 'CADDYFILE'
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
log_success "Caddy configured for tenenbaum.eu with HTTPS"

# Build and deploy
log_step "Building and deploying..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

sleep 10

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
log_info "Checking HTTPS (may take 1-2 min for cert):"
if curl -sk https://localhost:443 > /dev/null 2>&1; then
    log_success "HTTPS is responding on port 443"
else
    log_warning "HTTPS still initializing (Let's Encrypt certificate provisioning)"
fi

echo ""
echo "=============================================="
log_success "Deployment completed!"
echo "=============================================="
echo ""
echo "  🌐 Domain: https://tenenbaum.eu"
echo "  📁 Dir: $APP_DIR"
echo ""
echo "  Commands:"
echo "  - Logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Status: docker compose -f docker-compose.prod.yml ps"
echo "  - Restart: docker compose -f docker-compose.prod.yml restart"
echo ""
echo "  ⏳ SSL certificate may take 1-2 minutes to provision"
echo ""
REMOTESCRIPT
}

check_status() {
    log_info "Checking deployment status..."
    run_remote "
        echo '=== Containers ==='
        docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps
        echo ''
        echo '=== Recent Logs ==='
        docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs --tail=10
        echo ''
        echo '=== Disk Usage ==='
        df -h /
    "
}

rollback_deploy() {
    log_warning "Initiating rollback..."
    run_remote "
        cd /opt/tenenbaum
        git fetch origin
        git checkout HEAD~1
        docker compose -f docker-compose.prod.yml down
        docker compose -f docker-compose.prod.yml build --no-cache
        docker compose -f docker-compose.prod.yml up -d
        echo 'Rollback completed!'
        git log -1 --oneline
    "
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b) FORCE_BUILD=true; shift ;;
        --logs|-l) SHOW_LOGS=true; shift ;;
        --verify|-v) RUN_VERIFY=true; shift ;;
        --rollback|-r) ROLLBACK=true; shift ;;
        --status|-s) SHOW_STATUS=true; shift ;;
        --help|-h) show_help; shift ;;
        *) log_error "Unknown option: $1"; show_help ;;
    esac
done

# Main
echo ""
echo "=============================================="
echo "  Tenenbaum Production Deploy"
echo "=============================================="
echo "  Target: $SERVER_USER@$SERVER_HOST"
echo "  Domain: $SERVER_DOMAIN"
echo "  Repo:   $REPO_URL ($BRANCH)"
echo "=============================================="
echo ""

check_prerequisites

if [ "$SHOW_STATUS" = true ]; then
    check_status
    exit 0
fi

if [ "$ROLLBACK" = true ]; then
    rollback_deploy
    exit 0
fi

deploy_remote

if [ "$SHOW_LOGS" = true ]; then
    log_info "Showing live logs (Ctrl+C to exit)..."
    run_remote "docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs -f"
fi

if [ "$RUN_VERIFY" = true ]; then
    echo ""
    log_info "Running verification..."
    run_remote "curl -s http://localhost:80"
fi