#!/bin/bash
# =============================================================================
# Tenenbaum.eu - Production Health Verification Script
# =============================================================================
# Verifies all endpoints and services are healthy on production
# Domain: tenenbaum.eu
# Server: 51.159.154.29
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

# Configuration
SERVER_HOST="51.159.154.29"
SERVER_USER="root"
SERVER_DOMAIN="tenenbaum.eu"
SSH_KEY="$HOME/SSH/tenenbaum_development"
BASE_URL="https://tenenbaum.eu"

# Endpoints to verify
ENDPOINTS=(
    "/"
    "/explore"
    "/faq"
    "/contact-us"
    "/beta"
    "/register"
    "/feedback"
    "/support"
    "/maintenance"
    "/cookies"
    "/tos"
    "/sap-policy"
)

echo ""
echo "=============================================="
echo "  Tenenbaum.eu Health Verification"
echo "=============================================="
echo "  Domain: $SERVER_DOMAIN"
echo "  Server: $SERVER_HOST"
echo "=============================================="
echo ""

# Check SSH connection
log_info "Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "echo 'OK'" &> /dev/null; then
    log_error "Cannot connect to server via SSH"
    echo "Test manually: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
    exit 1
fi
log_success "SSH connection successful"
echo ""

# Check container status
log_step "Checking container status..."
CONTAINER_STATUS=$(ssh -i "$SSH_KEY" -t "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps --format json" 2>/dev/null || echo "[]")

if echo "$CONTAINER_STATUS" | grep -q "running"; then
    log_success "Container is running"
else
    log_error "Container is not running"
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps"
    exit 1
fi
echo ""

# Check HTTP response
log_step "Checking HTTP response (port 80)..."
HTTP_CHECK=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "curl -s -o /dev/null -w '%{http_code}' http://localhost:80" 2>/dev/null || echo "000")
if [ "$HTTP_CHECK" = "200" ]; then
    log_success "HTTP port 80 is responding (status: $HTTP_CHECK)"
else
    log_error "HTTP port 80 failed (status: $HTTP_CHECK)"
fi
echo ""

# Check HTTPS response
log_step "Checking HTTPS response (port 443)..."
HTTPS_CHECK=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "curl -sk -o /dev/null -w '%{http_code}' https://localhost:443" 2>/dev/null || echo "000")
if [ "$HTTPS_CHECK" = "200" ]; then
    log_success "HTTPS port 443 is responding (status: $HTTPS_CHECK)"
else
    log_warning "HTTPS port 443 status: $HTTPS_CHECK (may be provisioning certificate)"
fi
echo ""

# Verify SSL certificate
log_step "Checking SSL certificate..."
CERT_INFO=$(echo | timeout 5 openssl s_client -servername tenenbaum.eu -connect tenenbaum.eu:443 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
if [ -n "$CERT_INFO" ]; then
    log_success "SSL certificate is valid:"
    echo "$CERT_INFO" | sed 's/^/  /'
else
    log_warning "SSL certificate check failed (may still be provisioning)"
fi
echo ""

# Verify endpoints from external
log_step "Verifying public endpoints..."
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

for endpoint in "${ENDPOINTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    RESPONSE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "304" ]; then
        log_success "$endpoint (HTTP $RESPONSE)"
        SUCCESS=$((SUCCESS + 1))
    elif [ "$RESPONSE" = "404" ]; then
        log_warning "$endpoint (HTTP 404 - Not Found)"
        FAILED=$((FAILED + 1))
    else
        log_error "$endpoint (HTTP $RESPONSE)"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=============================================="
echo "  Verification Summary"
echo "=============================================="
echo "  Total endpoints:  $TOTAL"
echo "  Successful:       $SUCCESS ${GREEN}✓${NC}"
echo "  Failed:           $FAILED ${RED}✗${NC}"
echo "=============================================="
echo ""

# Check disk usage
log_step "Checking server resources..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "df -h / | tail -1"
echo ""

# Check container logs for errors
log_step "Recent container logs (last 5 lines)..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml logs --tail=5" 2>/dev/null || echo "Could not fetch logs"
echo ""

# Final status
if [ $FAILED -eq 0 ]; then
    log_success "All checks passed! tenenbaum.eu is healthy."
    exit 0
else
    log_warning "Some endpoints failed verification. Check output above."
    exit 1
fi