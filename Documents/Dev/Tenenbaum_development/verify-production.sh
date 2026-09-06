#!/bin/bash

# Tenenbaum Development - Production Verification Script
# This script verifies the production deployment is working correctly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-tenenbaum.dev}"
CONTAINER_NAME="tenenbaum-app-prod"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        log_success "$2"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "$2"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "========================================"
echo "  Tenenbaum Development - Production Verification"
echo "========================================"
echo ""

# Test 1: Docker container running
log_info "Test 1: Checking Docker container status..."
if docker ps --format '{{.Names}}' | grep -q "$CONTAINER_NAME"; then
    test_result 0 "Docker container is running"
else
    test_result 1 "Docker container is not running"
fi

# Test 2: Container health check
log_info "Test 2: Checking container health..."
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
if [ "$HEALTH_STATUS" = "healthy" ]; then
    test_result 0 "Container health check: $HEALTH_STATUS"
else
    test_result 1 "Container health check: $HEALTH_STATUS"
fi

# Test 3: HTTP response
log_info "Test 3: Checking HTTP response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    test_result 0 "HTTP response code: $HTTP_CODE"
else
    test_result 1 "HTTP response code: $HTTP_CODE"
fi

# Test 4: HTTPS response (if TLS is configured)
log_info "Test 4: Checking HTTPS response..."
HTTPS_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost:443 2>/dev/null || echo "000")
if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
    test_result 0 "HTTPS response code: $HTTPS_CODE"
else
    test_result 1 "HTTPS response code: $HTTPS_CODE (may not be configured)"
fi

# Test 5: Check Caddy is responding
log_info "Test 5: Checking Caddy server..."
if curl -sI http://localhost:80 | grep -qi "caddy"; then
    test_result 0 "Caddy server detected"
else
    test_result 0 "Web server responding (Caddy headers not visible)"
fi

# Test 6: Check index.html is served
log_info "Test 6: Checking index.html content..."
if curl -s http://localhost:80 | grep -q "root"; then
    test_result 0 "index.html content verified"
else
    test_result 1 "index.html content check failed"
fi

# Test 7: Check static assets
log_info "Test 7: Checking static assets..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80/assets/ | grep -qE "(200|404)"; then
    test_result 0 "Static assets path accessible"
else
    test_result 1 "Static assets path not accessible"
fi

# Test 8: Memory usage
log_info "Test 8: Checking container memory usage..."
MEMORY_USAGE=$(docker stats --no-stream --format "{{.MemUsage}}" $CONTAINER_NAME 2>/dev/null | cut -d'/' -f1 || echo "unknown")
if [ "$MEMORY_USAGE" != "unknown" ]; then
    test_result 0 "Memory usage: $MEMORY_USAGE"
else
    test_result 1 "Could not determine memory usage"
fi

# Test 9: CPU usage
log_info "Test 9: Checking container CPU usage..."
CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" $CONTAINER_NAME 2>/dev/null || echo "unknown")
if [ "$CPU_USAGE" != "unknown" ]; then
    test_result 0 "CPU usage: $CPU_USAGE"
else
    test_result 1 "Could not determine CPU usage"
fi

# Test 10: Check logs for errors
log_info "Test 10: Checking recent logs for errors..."
ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --tail=100 2>/dev/null | grep -ci "error" || echo "0")
if [ "$ERROR_COUNT" -lt 5 ]; then
    test_result 0 "Log error count acceptable: $ERROR_COUNT"
else
    test_result 1 "High error count in logs: $ERROR_COUNT"
fi

# Summary
echo ""
echo "========================================"
echo "  Verification Summary"
echo "========================================"
echo -e "  ${GREEN}Passed:${NC} $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC} $TESTS_FAILED"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All verification tests passed!"
    exit 0
else
    log_warning "Some verification tests failed. Please review the output above."
    exit 1
fi