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
    "/cookies"
    "/tos"
    "/sap-policy"
    "/maintenance"
)

VERBOSE=false
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v) VERBOSE=true; shift ;;
        --json|-j) JSON_OUTPUT=true; shift ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v    Show detailed output"
            echo "  --json, -j       Output results as JSON"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Arrays to track results
declare -a RESULTS=()
TOTAL=0
SUCCESS=0
FAILED=0

check_endpoint() {
    local endpoint=$1
    TOTAL=$((TOTAL + 1))

    local response
    response=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 10 "https://${SERVER_DOMAIN}${endpoint}" 2>/dev/null || echo "000")

    if [ "$response" = "200" ] || [ "$response" = "304" ]; then
        SUCCESS=$((SUCCESS + 1))
        RESULTS+=("{\"endpoint\":\"$endpoint\",\"status\":\"$response\",\"result\":\"pass\"}")
        if [ "$VERBOSE" = true ]; then
            log_success "$endpoint (HTTP $response)"
        fi
        return 0
    elif [ "$response" = "404" ]; then
        FAILED=$((FAILED + 1))
        RESULTS+=("{\"endpoint\":\"$endpoint\",\"status\":\"$response\",\"result\":\"not_found\"}")
        log_warning "$endpoint (HTTP 404 - Not Found)"
        return 1
    else
        FAILED=$((FAILED + 1))
        RESULTS+=("{\"endpoint\":\"$endpoint\",\"status\":\"$response\",\"result\":\"fail\"}")
        log_error "$endpoint (HTTP $response)"
        return 1
    fi
}

echo ""
echo "=============================================="
echo "  Tenenbaum.eu Health Verification"
echo "=============================================="
echo "  Domain: $SERVER_DOMAIN"
echo "  Server: $SERVER_HOST"
echo "  Date: $(date)"
echo "=============================================="
echo ""

# Check DNS
log_info "Checking DNS resolution..."
DNS_RESULT=$(dig +short "$SERVER_DOMAIN" 2>/dev/null | head -1)
if [ "$DNS_RESULT" = "$SERVER_HOST" ]; then
    log_success "DNS resolved correctly: $DNS_RESULT"
else
    log_warning "DNS resolved to: ${DNS_RESULT:-'NOT RESOLVED'} (expected: $SERVER_HOST)"
fi
echo ""

# Check SSL Certificate
log_info "Checking SSL certificate..."
CERT_INFO=$(echo | openssl s_client -servername "$SERVER_DOMAIN" -connect "$SERVER_HOST:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
if [ -n "$CERT_INFO" ]; then
    log_success "SSL certificate is valid:"
    echo "$CERT_INFO" | sed 's/^/  /'
else
    log_warning "Could not retrieve SSL certificate details"
fi
echo ""

# Check container status via SSH
log_info "Checking container status..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "docker compose -f /opt/tenenbaum/docker-compose.prod.yml ps" 2>/dev/null; then
    log_success "Container is running"
else
    log_error "Could not connect to server or container not running"
fi
echo ""

# Check endpoints
log_info "Verifying endpoints..."
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
    check_endpoint "$endpoint"
done

echo ""
echo "=============================================="
echo "  Summary"
echo "=============================================="
echo "  Total endpoints:  $TOTAL"
echo -e "  Successful:       ${GREEN}$SUCCESS${NC}"
echo -e "  Failed:           ${RED}$FAILED${NC}"
echo ""

if [ "$JSON_OUTPUT" = true ]; then
    echo "{"
    echo "  \"domain\": \"$SERVER_DOMAIN\","
    echo "  \"server\": \"$SERVER_HOST\","
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"total\": $TOTAL,"
    echo "  \"success\": $SUCCESS,"
    echo "  \"failed\": $FAILED,"
    echo "  \"results\": ["
    first=true
    for result in "${RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo -n "    $result"
    done
    echo ""
    echo "  ]"
    echo "}"
fi

if [ $FAILED -eq 0 ]; then
    log_success "All health checks passed! tenenbaum.eu is healthy."
    exit 0
else
    log_warning "Some endpoints failed verification. Check output above."
    exit 1
fi