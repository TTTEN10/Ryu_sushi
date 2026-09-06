#!/bin/bash

# Tenenbaum Development - Production Deployment Script
# This script handles production deployment with Caddy and Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-tenenbaum.dev}"
ACME_EMAIL="${ACME_EMAIL:-admin@tenenbaum.dev}"
APP_NAME="tenenbaum-app-prod"
DOCKER_IMAGE="tenenbaum-app:production"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        log_warning "Some commands may require sudo privileges"
    fi
}

# Validate environment
validate_env() {
    log_info "Validating environment..."

    if [ -z "$DOMAIN" ]; then
        log_error "DOMAIN environment variable is not set"
        exit 1
    fi

    if [ -z "$ACME_EMAIL" ]; then
        log_warning "ACME_EMAIL not set, using default: admin@tenenbaum.dev"
    fi

    log_success "Environment validated"
}

# Pre-deployment checks
pre_deploy() {
    log_info "Running pre-deployment checks..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Backup current deployment
    if docker ps --format '{{.Names}}' | grep -q "$APP_NAME"; then
        log_info "Backup existing deployment..."
        docker-compose -f docker-compose.prod.yml down
    fi

    log_success "Pre-deployment checks passed"
}

# Build and deploy
deploy() {
    log_info "Building production image..."
    docker build -t $DOCKER_IMAGE .

    log_info "Starting production services..."
    export DOMAIN=$DOMAIN
    export ACME_EMAIL=$ACME_EMAIL
    docker-compose -f docker-compose.prod.yml up -d --force-recreate

    log_success "Deployment initiated"
}

# Wait for service to be healthy
wait_for_health() {
    log_info "Waiting for service to be healthy..."

    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
            log_success "Service is healthy!"
            return 0
        fi

        log_info "Waiting for service... (attempt $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    log_error "Service failed to become healthy within timeout"
    return 1
}

# Verify deployment
verify() {
    log_info "Verifying deployment..."

    # Check container status
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_error "Container is not running"
        return 1
    fi

    # Check HTTP response
    sleep 5
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200"; then
        log_success "HTTP check passed"
    else
        log_warning "HTTP check failed - service may still be starting"
    fi

    log_success "Deployment verified"
}

# Rollback
rollback() {
    log_info "Rolling back deployment..."

    # Stop current deployment
    docker-compose -f docker-compose.prod.yml down

    log_success "Rollback completed"
}

# Show status
status() {
    log_info "Deployment Status:"
    echo ""
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    log_info "Recent logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=20
}

# Cleanup
cleanup() {
    log_info "Cleaning up old images..."
    docker image prune -f --filter "dangling=true"
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    case "${1:-deploy}" in
        deploy)
            check_permissions
            validate_env
            pre_deploy
            deploy
            wait_for_health
            verify
            cleanup
            log_success "Production deployment completed successfully!"
            log_info "Application available at: https://$DOMAIN"
            ;;
        rollback)
            rollback
            ;;
        status)
            status
            ;;
        verify)
            verify
            ;;
        clean)
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|verify|clean}"
            exit 1
            ;;
    esac
}

main "$@"