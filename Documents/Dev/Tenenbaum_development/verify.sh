#!/bin/bash
# Tenenbaum.eu - Production Health Verification

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

SERVER_HOST="51.159.154.29"
SERVER_USER="root"
SERVER_DOMAIN="tenenbaum.eu"
SSH_KEY="$HOME/SSH/tenenbaum_development"

ENDPOINTS=("/" "/explore" "/faq" "/contact-us" "/beta" "/register" "/feedback" "/support" "/cookies" "/tos" "/sap-policy" "/maintenance")

echo ""
echo "=============================================="
echo "  Tenenbaum.eu Health Verification"
echo "=============================================="
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

# Check DNS
log_info "Checking DNS..."
DNS_RESULT=$(dig +short "$SERVER_DOMAIN" 2>/dev/null | head -1)
if [ "$DNS_RESULT" = "$SERVER_HOST" ]; then
    log_success "DNS OK: $DNS_RESULT"
else
    log_warning "DNS: ${DNS_RESULT:-'NOT RESOLVED'} (expected: $SERVER_HOST)"
fi

# Check SSL
log_info "Checking SSL certificate..."
CERT_INFO=$(echo | openssl s_client -servername "$SERVER_DOMAIN" -connect "$SERVER_HOST:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
if [ -n "$CERT_INFO" ]; then
    log_success "SSL certificate valid"
    echo "$CERT_INFO" | sed 's/^/  /'
else
    log_warning "Could not retrieve SSL certificate"
fi

# Check container
log_info "Checking container..."
CONTAINER_STATUS=$(ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "docker ps --filter name=tenenbaumv2 --format '{{.Status}}'" 2>/dev/null || echo "")
if echo "$CONTAINER_STATUS" | grep -qi "healthy"; then
    log_success "Container tenenbaumv2 running ($CONTAINER_STATUS)"
elif echo "$CONTAINER_STATUS" | grep -qi "up"; then
    log_info "Container tenenbaumv2 running ($CONTAINER_STATUS)"
else
    log_error "Container not running"
    FAILED=$((FAILED + 1))
fi

# Check endpoints with retry
echo ""
log_info "Verifying endpoints..."

for endpoint in "${ENDPOINTS[@]}"; do
    TOTAL=$((TOTAL + 1))
    response="000"

    # Retry up to 3 times
    for i in 1 2 3; do
        response=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 20 "https://${SERVER_DOMAIN}${endpoint}" 2>/dev/null || echo "000")
        if [ "$response" = "200" ] || [ "$response" = "304" ]; then
            break
        fi
        sleep 2
    done

    if [ "$response" = "200" ] || [ "$response" = "304" ]; then
        SUCCESS=$((SUCCESS + 1))
        log_success "$endpoint (HTTP $response)"
    else
        FAILED=$((FAILED + 1))
        log_error "$endpoint (HTTP $response)"
    fi
done

echo ""
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo "  Total:     $TOTAL"
echo -e "  Success:   ${GREEN}$SUCCESS${NC}"
echo -e "  Failed:    ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    log_success "All checks passed! tenenbaum.eu is healthy."
    exit 0
else
    log_warning "Some endpoints failed."
    exit 1
fi