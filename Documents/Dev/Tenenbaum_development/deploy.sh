#!/bin/bash

# Tenenbaum Development - Deployment Script
# This script handles building and deploying the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="tenenbaum-app"
DOCKER_IMAGE="tenenbaum-app:latest"
DOCKER_IMAGE_PROD="tenenbaum-app:production"

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_warning "Node.js is not installed. Some features may not work."
    fi

    log_success "Dependencies check passed"
}

build_local() {
    log_info "Building application locally..."
    npm install
    npm run build
    log_success "Local build completed"
}

build_docker() {
    log_info "Building Docker image..."
    docker build -t $DOCKER_IMAGE .
    log_success "Docker image built: $DOCKER_IMAGE"
}

build_docker_prod() {
    log_info "Building production Docker image..."
    docker build -t $DOCKER_IMAGE_PROD --target production .
    log_success "Production Docker image built: $DOCKER_IMAGE_PROD"
}

start_dev() {
    log_info "Starting development server..."
    docker-compose up -d
    log_success "Development server started at http://localhost:3000"
}

start_prod() {
    log_info "Starting production server..."
    docker-compose -f docker-compose.prod.yml up -d --build
    log_success "Production server started"
}

stop() {
    log_info "Stopping all containers..."
    docker-compose down
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    log_success "All containers stopped"
}

clean() {
    log_info "Cleaning up..."
    docker system prune -f
    docker volume prune -f
    log_success "Cleanup completed"
}

logs() {
    log_info "Showing container logs..."
    docker-compose logs -f
}

health_check() {
    log_info "Running health check..."
    if docker-compose ps | grep -q "Up"; then
        log_success "Application is healthy"
        return 0
    else
        log_error "Application health check failed"
        return 1
    fi
}

show_help() {
    echo "Tenenbaum Development - Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build       Build the application locally"
    echo "  docker      Build Docker image"
    echo "  start       Start development server"
    echo "  prod        Start production server"
    echo "  stop        Stop all containers"
    echo "  restart     Restart all containers"
    echo "  logs        Show container logs"
    echo "  health      Run health check"
    echo "  clean       Clean up Docker resources"
    echo "  help        Show this help message"
    echo ""
}

# Main script
case "${1:-help}" in
    build)
        check_dependencies
        build_local
        ;;
    docker)
        check_dependencies
        build_docker
        ;;
    start)
        check_dependencies
        build_docker
        start_dev
        ;;
    prod)
        check_dependencies
        start_prod
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start_dev
        ;;
    logs)
        logs
        ;;
    health)
        health_check
        ;;
    clean)
        clean
        ;;
    help|*)
        show_help
        ;;
esac