#!/bin/bash
# Verify Frontend, Backend and API (chatbot) are up.
# Frontend+Backend: scw-focused-dubinsky (51.159.176.62). API: scw-nostalgic-cannon (51.159.119.91).

set -e
FRONTEND_IP="${SSH_SERVER_IP:-51.159.176.62}"
API_IP="${API_SERVER_IP:-51.159.119.91}"

echo "Verifying SafePsy endpoints..."
echo "  Frontend+Backend: $FRONTEND_IP (scw-focused-dubinsky)"
echo "  API (chatbot):    $API_IP (scw-nostalgic-cannon)"
echo ""

check() {
  local method="$1"
  local url="$2"
  local name="$3"
  local code
  if [ "$method" = "ip_host_localhost" ]; then
    code=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 8 -H "Host: localhost" "$url" 2>/dev/null || echo "000")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 "$url" 2>/dev/null || echo "000")
  fi
  if [ "$code" = "200" ]; then
    echo "  OK   $name"
    return 0
  else
    echo "  FAIL $name ($url → $code)"
    return 1
  fi
}

failed=0
check "default" "http://$FRONTEND_IP/healthz" "Backend /healthz (frontend server)" || failed=$((failed+1))
check "default" "http://$FRONTEND_IP/" "Frontend (frontend server)" || failed=$((failed+1))
check "default" "http://$FRONTEND_IP/chat" "Chat (/chat)" || failed=$((failed+1))
check "default" "http://$API_IP:8000/healthz" "API (chatbot) /healthz" || failed=$((failed+1))

echo ""
if [ $failed -eq 0 ]; then
  echo "All checks passed (healthz OK). Use https://safepsy.com and https://safepsy.com/chat in production."
  exit 0
else
  echo "$failed check(s) failed."
  exit 1
fi
