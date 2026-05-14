#!/usr/bin/env bash
# Verify/diagnose production (Caddy + Python proxy + SPA on APP_DOMAIN).
# Usage: bash deployment/verify-production.sh
# Optional env:
#   APP_DOMAIN=polinapsycho.com
#   APP_IP=51.159.149.66
#   TIMEOUT=15
#   CHECK_LLM=1

set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:-polinapsycho.com}"
# Default matches prod app instance when DNS for APP_DOMAIN points here; override if needed.
APP_IP="${APP_IP:-51.159.149.66}"
TIMEOUT="${TIMEOUT:-15}"
CHECK_LLM="${CHECK_LLM:-0}"

fail=0

pass() { echo "  PASS  $*"; }
failf() { echo "  FAIL  $*"; fail=$((fail+1)); }

check_http_code() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo 000)"
  if [[ "$code" == "$expected" ]]; then
    pass "$name ($url -> $code)"
  else
    failf "$name ($url -> $code, expected $expected)"
  fi
}

echo "Verifying production for domain: $APP_DOMAIN"
echo "Expected app IP: $APP_IP"
echo

dns_out="$(dig +short "$APP_DOMAIN" A 2>/dev/null || true)"
if echo "$dns_out" | grep -Eq "^${APP_IP}$"; then
  pass "DNS includes expected A record ($APP_IP)"
else
  failf "DNS does not include expected A record ($APP_IP). Got: ${dns_out:-<empty>}"
fi

if [[ "$(echo "$dns_out" | wc -l | tr -d ' ')" -gt 1 ]]; then
  echo "  WARN  Multiple A records detected. Ensure no stale/incorrect records remain."
fi

check_http_code "Homepage HTTPS" "https://${APP_DOMAIN}" "200"
check_http_code "Backend health via Caddy" "https://${APP_DOMAIN}/api/healthz" "200"
check_http_code "Chat route HTTPS" "https://${APP_DOMAIN}/chat" "200"
check_http_code "Direct app IP HTTP" "http://${APP_IP}" "200"
check_http_code "Direct app IP API health" "http://${APP_IP}/api/healthz" "200"

if models_json="$(curl -fsS --max-time "$TIMEOUT" "https://${APP_DOMAIN}/api/v1/models")"; then
  if echo "$models_json" | grep -q "\"data\""; then
    model_id="$(echo "$models_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",[{}])[0].get("id",""))' 2>/dev/null || true)"
    pass "Models endpoint reachable (model: ${model_id:-unknown})"
  else
    failf "Models JSON missing data[] (https://${APP_DOMAIN}/api/v1/models)"
  fi
else
  failf "Models endpoint failed (HTTP or TLS; curl --fail https://${APP_DOMAIN}/api/v1/models)"
fi

if [[ "$CHECK_LLM" == "1" && -n "${model_id:-}" ]]; then
  chat_out="$(curl -fsS --max-time 60 -H "Content-Type: application/json" \
    -d "{\"model\":\"${model_id}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"max_tokens\":16}" \
    "https://${APP_DOMAIN}/api/v1/chat/completions" 2>/dev/null || true)"
  if [[ -n "$chat_out" ]] && echo "$chat_out" | grep -q "\"choices\""; then
    pass "LLM chat completion endpoint working"
  else
    failf "LLM chat completion endpoint failed"
  fi
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All production checks passed."
  exit 0
fi

echo "$fail check(s) failed."
echo "If needed, diagnose on app server:"
echo "  ssh root@${APP_IP} 'cd /home/safepsy/app && docker compose ps && docker logs --tail=80 app-caddy-1 && docker logs --tail=80 app-backend-1'"
exit 1
