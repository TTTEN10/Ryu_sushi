#!/bin/bash
# =============================================================================
# Tenenbaum Development - One-Command Deployment Script
# =============================================================================
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --build, -b      Force rebuild of Docker images
#   --dev, -d        Deploy in development mode
#   --stop, -s       Stop and remove containers
#   --logs, -l       Show logs after deployment
#   --help, -h       Show this help message
#
# Examples:
#   ./deploy.sh                  # Standard deployment
#   ./deploy.sh --build          # Force rebuild
#   ./deploy.sh --dev            # Development mode
#   ./deploy.sh --stop           # Stop all containers
#   ./deploy.sh -b -l            # Rebuild and show logs
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Flags
FORCE_BUILD=false
DEV_MODE=false
STOP_ONLY=false
SHOW_LOGS=false

# =============================================================================
# Helper Functions
# =============================================================================
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

show_help() {
    head -20 "$0" | tail -17
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# =============================================================================
# Main Functions
# =============================================================================
stop_containers() {
    log_info "Stopping all containers..."

    if [ -f "docker-compose.yml" ]; then
        # Try docker compose (v2) first, fall back to docker-compose (v1)
        if docker compose version &> /dev/null; then
            docker compose down --remove-orphans
        else
            docker-compose down --remove-orphans
        fi
    fi

    # Clean up any stray containers
    docker rm -f tenenbaum-app tenenbaum-caddy tenenbaum-dev 2>/dev/null || true

    log_success "Containers stopped"
}

build_images() {
    log_info "Building Docker images..."

    if [ "$DEV_MODE" = true ]; then
        log_info "Building development image..."
        if docker compose version &> /dev/null; then
            docker compose build dev
        else
            docker-compose build dev
        fi
    else
        log_info "Building production image..."
        if docker compose version &> /dev/null; then
            docker compose build app
        else
            docker-compose build app
        fi
    fi

    log_success "Docker images built"
}

start_containers() {
    log_info "Starting containers..."

    if [ "$DEV_MODE" = true ]; then
        log_info "Starting in development mode..."
        if docker compose version &> /dev/null; then
            docker compose --profile dev up -d dev
        else
            docker-compose --profile dev up -d dev
        fi
    else
        log_info "Starting in production mode..."
        if docker compose version &> /dev/null; then
            docker compose up -d app caddy
        else
            docker-compose up -d app caddy
        fi
    fi

    # Wait for containers to be healthy
    log_info "Waiting for services to be ready..."
    sleep 5

    # Check container status
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi

    log_success "Containers started"
}

show_logs() {
    log_info "Showing logs (Ctrl+C to exit)..."

    if [ "$DEV_MODE" = true ]; then
        if docker compose version &> /dev/null; then
            docker compose --profile dev logs -f dev
        else
            docker-compose logs -f dev
        fi
    else
        if docker compose version &> /dev/null; then
            docker compose logs -f app caddy
        else
            docker-compose logs -f app caddy
        fi
    fi
}

deploy() {
    echo ""
    echo "=============================================="
    echo "  Tenenbaum Development Deployment"
    echo "=============================================="
    echo ""

    check_prerequisites

    if [ "$STOP_ONLY" = true ]; then
        stop_containers
        log_success "Deployment complete (stopped)"
        return
    fi

    if [ "$FORCE_BUILD" = true ]; then
        log_warning "Forcing rebuild of Docker images..."
        # Remove existing images
        docker rmi tenenbaum-app tenenbaum-dev 2>/dev/null || true
        build_images
    else
        # Check if images exist
        if ! docker images | grep -q "tenenbaum"; then
            build_images
        else
            log_info "Using existing Docker images (use --build to force rebuild)"
        fi
    fi

    start_containers

    echo ""
    log_success "Deployment complete!"
    echo ""

    if [ "$DEV_MODE" = true ]; then
        echo "  Development server: http://localhost:5173"
        echo "  API server:         http://localhost:3001"
    else
        echo "  Production server:  http://localhost:3001"
        echo "  Health check:       http://localhost:3001/api/health"
    fi

    echo ""

    if [ "$SHOW_LOGS" = true ]; then
        show_logs
    fi
}

# =============================================================================
# Parse Arguments
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            FORCE_BUILD=true
            shift
            ;;
        --dev|-d)
            DEV_MODE=true
            shift
            ;;
        --stop|-s)
            STOP_ONLY=true
            shift
            ;;
        --logs|-l)
            SHOW_LOGS=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            ;;
    esac
done

# =============================================================================
# Run Deployment
# =============================================================================
deploy
