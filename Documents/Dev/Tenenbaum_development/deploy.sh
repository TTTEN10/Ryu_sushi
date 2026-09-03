#!/bin/bash
# =============================================================================
# Tenenbaum Development - Local Deployment Script
# =============================================================================
# Deploys the application to localhost:3099 using Docker
#
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --build, -b      Force rebuild of Docker images
#   --logs, -l       Show logs after deployment
#   --stop, -s       Stop the containers
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    head -12 "$0" | tail -10
    exit 0
}

FORCE_BUILD=false
SHOW_LOGS=false
STOP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b) FORCE_BUILD=true; shift ;;
        --logs|-l) SHOW_LOGS=true; shift ;;
        --stop|-s) STOP=true; shift ;;
        --help|-h) show_help; shift ;;
        *) log_error "Unknown option: $1"; show_help ;;
    esac
done

echo ""
echo "=============================================="
echo "  Tenenbaum Local Deploy"
echo "=============================================="
echo "  URL: http://localhost:3099"
echo "=============================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

log_success "Docker is running"

# Stop containers if requested
if [ "$STOP" = true ]; then
    log_step "Stopping containers..."
    docker compose down
    log_success "Containers stopped"
    exit 0
fi

# Build and start
log_step "Building and starting containers..."

if [ "$FORCE_BUILD" = true ]; then
    docker compose build --no-cache
else
    docker compose build
fi

docker compose up -d

echo ""
log_info "Waiting for service to start..."
sleep 3

echo ""
log_info "Container status:"
docker compose ps

echo ""
log_info "Health check:"
if curl -s http://localhost:3099 > /dev/null; then
    log_success "Application is running at http://localhost:3099"
else
    log_warning "Application may still be starting. Check logs with: docker compose logs -f"
fi

echo ""
echo "=============================================="
log_success "Deployment completed!"
echo "=============================================="
echo ""
echo "  🌐 URL: http://localhost:3099"
echo "  📁 Dir: $SCRIPT_DIR"
echo ""
echo "  Commands:"
echo "  - Logs: docker compose logs -f"
echo "  - Status: docker compose ps"
echo "  - Stop: ./deploy.sh --stop"
echo "  - Rebuild: ./deploy.sh --build"
echo ""

if [ "$SHOW_LOGS" = true ]; then
    log_info "Showing live logs (Ctrl+C to exit)..."
    docker compose logs -f
fi