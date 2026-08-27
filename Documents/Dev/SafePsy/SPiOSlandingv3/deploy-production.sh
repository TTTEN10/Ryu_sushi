#!/bin/bash
# Production deployment script for safepsy.com
# This script builds and deploys the landing page to the Scaleway instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_IP="51.158.114.32"
DOMAIN="safepsy.com"
CONTAINER_NAME="safepsy-landing"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! command -v ssh &> /dev/null; then
        log_error "SSH is not installed"
        exit 1
    fi

    if ! command -v scp &> /dev/null; then
        log_error "SCP is not installed"
        exit 1
    fi

    log_info "All prerequisites met"
}

# Build the application
build() {
    log_info "Building Docker image..."
    docker build -t ${CONTAINER_NAME}:latest .
    log_info "Build complete"
}

# Deploy to remote instance
deploy() {
    log_info "Deploying to $INSTANCE_IP..."

    # Create temporary deployment directory
    DEPLOY_DIR=$(mktemp -d)
    trap "rm -rf $DEPLOY_DIR" EXIT

    # Copy files to temp directory
    cp Dockerfile Caddyfile package.json "$DEPLOY_DIR/"
    cp -r frontend "$DEPLOY_DIR/"

    # Create archive
    tar -czf "$DEPLOY_DIR/deploy.tar.gz" -C "$DEPLOY_DIR" Dockerfile Caddyfile package.json frontend

    # Transfer to remote
    log_info "Transferring files to instance..."
    scp -o StrictHostKeyChecking=no "$DEPLOY_DIR/deploy.tar.gz" root@$INSTANCE_IP:/tmp/

    # Remote deployment
    log_info "Running remote deployment..."
    ssh -o StrictHostKeyChecking=no root@$INSTANCE_IP << 'REMOTE_SCRIPT'
set -e

CONTAINER_NAME="safepsy-landing"

# Stop existing container
echo "Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Extract and build
echo "Extracting deployment package..."
cd /tmp
tar -xzf deploy.tar.gz

echo "Building Docker image..."
docker build -t $CONTAINER_NAME:latest .

echo "Starting container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 80:80 \
    -p 443:443 \
    $CONTAINER_NAME:latest

# Cleanup
rm -f deploy.tar.gz
rm -rf Dockerfile Caddyfile package.json frontend

echo "Deployment complete!"
docker ps --filter name=$CONTAINER_NAME
REMOTE_SCRIPT

    log_info "Remote deployment complete"
}

# Verify deployment
verify() {
    log_info "Verifying deployment..."
    sleep 3

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$INSTANCE_IP" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
        log_info "Health check passed (HTTP $HTTP_CODE)"
    else
        log_warn "Health check returned HTTP $HTTP_CODE"
    fi

    log_info "Production URL: https://$DOMAIN"
    log_info "Instance URL: http://$INSTANCE_IP"
}

# Show logs
show_logs() {
    log_info "Fetching recent logs..."
    ssh -o StrictHostKeyChecking=no root@$INSTANCE_IP "docker logs --tail 20 $CONTAINER_NAME" 2>/dev/null || true
}

# Main
main() {
    echo "============================================"
    echo "SafePsy Landing Page - Production Deployment"
    echo "Domain: $DOMAIN"
    echo "Instance: $INSTANCE_IP"
    echo "============================================"
    echo ""

    check_prerequisites
    build
    deploy
    verify

    echo ""
    echo "============================================"
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo "============================================"
    echo ""
    echo "To view logs: ssh root@$INSTANCE_IP 'docker logs -f $CONTAINER_NAME'"
    echo "To restart: ssh root@$INSTANCE_IP 'docker restart $CONTAINER_NAME'"
    echo ""
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi