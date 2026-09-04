#!/bin/bash
# =============================================================================
# Tenenbaum.eu - Production Deployment Script
# =============================================================================
# Deploys to Scaleway instance: scw-tenenbaum-eu (51.159.154.29)
# Domain: tenenbaum.eu
# GitHub: https://github.com/TTTEN10/SPiOSlandingv3.git
# SSH Key: ~/SSH/tenenbaum_development
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
REPO_URL="git@github.com:TTTEN10/SPiOSlandingv3.git"
BRANCH="new-main"
APP_DIR="/opt/tenenbaum"
SSH_KEY="$HOME/SSH/tenenbaum_development"

# Flags
SHOW_LOGS=false
SHOW_STATUS=false

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
    echo "  --status, -s   Check current deployment status"
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
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_HOST" "echo 'OK'" &> /dev/null; then
        log_error "Cannot connect to server via SSH."
        echo "Test manually: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
        exit 1
    fi

    log_success "SSH connection successful"
}

deploy_remote() {
    log_step "Starting deployment to $SERVER_DOMAIN..."
    echo ""

    # Copy SSH key to server for GitHub access
    log_info "Copying SSH key to server for GitHub access..."
    scp -i "$SSH_KEY" "$SSH_KEY" "$SERVER_USER@$SERVER_HOST:/root/.ssh/github_deploy_key" 2>/dev/null || \
        ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p ~/.ssh && cat > ~/.ssh/github_deploy_key" < "$SSH_KEY"

    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "chmod 600 ~/.ssh/github_deploy_key"

    # Configure SSH on server for GitHub
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cat > ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF
    chmod 600 ~/.ssh/config"

    # Run remote deployment
    ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" << 'REMOTESCRIPT'
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
echo "  Tenenbaum.eu Production Deploy"
echo "=============================================="
echo "  Server: $(hostname)"
echo "  Domain: tenenbaum.eu"
echo "  Date: $(date)"
echo "=============================================="
echo ""

APP_DIR="/opt/tenenbaum"
REPO_URL="git@github.com:TTTEN10/SPiOSlandingv3.git"
BRANCH="new-main"

# Step 1: Install Docker
log_step "Step 1/5: Checking Docker..."
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

# Step 2: Clone/Update repository
log_step "Step 2/5: Cloning repository..."
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    cd /opt
    git clone "$REPO_URL" tenenbaum
    cd "$APP_DIR"
    git checkout "$BRANCH"
    log_success "Repository cloned from $BRANCH"
else
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
    log_success "Repository updated to $BRANCH"
fi

# Step 3: Create Caddyfile
log_step "Step 3/5: Configuring Caddy..."
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
log_success "Caddyfile configured for HTTPS"

# Step 4: Create docker-compose.prod.yml
log_step "Step 4/5: Creating Docker Compose config..."
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

# Step 5: Build and deploy
log_step "Step 5/5: Building and deploying..."

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
log_info "Checking HTTPS (certificate provisioning may take 1-2 min):"
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
}

check_status() {
    log_info "Checking deployment status..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "
        echo '=== Containers ==='
        docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps
        echo ''
        echo '=== Recent Logs ==='
        docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs --tail=10
    "
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --logs|-l) SHOW_LOGS=true; shift ;;
        --status|-s) SHOW_STATUS=true; shift ;;
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
echo "=============================================="
echo ""

if [ "$SHOW_STATUS" = true ]; then
    check_status
    exit 0
fi

check_prerequisites
deploy_remote

if [ "$SHOW_LOGS" = true ]; then
    log_info "Showing live logs (Ctrl+C to exit)..."
    ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs -f"
fi