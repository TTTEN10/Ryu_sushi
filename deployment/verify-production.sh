#!/usr/bin/env bash
# Verify/diagnose production (Caddy + Python proxy + SPA on APP_DOMAIN).
# Usage: bash deployment/verify-production.sh
# Optional env:
#   APP_DOMAIN=polinapsycho.com
#   APP_IP=51.159.149.66
#   TIMEOUT=15
#   CHECK_LLM=1
#   VERIFY_FORCE_IP=51.159.149.66  # pin curl to this VIP for HTTPS checks when public resolvers still cache an old A record

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
  if [[ -n "${VERIFY_FORCE_IP:-}" && "$url" == *"${APP_DOMAIN}"* ]]; then
    code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" --resolve "${APP_DOMAIN}:80:${VERIFY_FORCE_IP}" \
      "$url" 2>/dev/null || echo 000)"
  else
    code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo 000)"
  fi
  if [[ "$code" == "$expected" ]]; then
    pass "$name ($url -> $code)"
  else
    failf "$name ($url -> $code, expected $expected)"
  fi
}

echo "Verifying production for domain: $APP_DOMAIN"
echo "Expected app IP: $APP_IP"
echo

# Resolver view (often TTL-stale). Authoritative NS (e.g. Scaleway) is the source of truth; see deployment/deploy.sh validate_dns_mode.
dns_out="$(dig +short "$APP_DOMAIN" A 2>/dev/null | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || true)"
auth_has_expected=0
ns_list="$(dig +short "$APP_DOMAIN" NS 2>/dev/null | tr -d '\r' | sed 's/\.$//' | grep -E '^[a-zA-Z0-9.-]+\.[a-zA-Z]' || true)"
if [[ -n "$ns_list" ]]; then
  combined=""
  while IFS= read -r ns; do
    [[ -z "${ns}" ]] && continue
    combined+="$(dig +short "$APP_DOMAIN" A @"${ns}" 2>/dev/null | tr -d '\r')"$'\n'
  done <<< "${ns_list}"
  while IFS= read -r ip; do
    [[ -z "${ip}" ]] && continue
    if [[ "${ip}" == "${APP_IP}" ]]; then
      auth_has_expected=1
      break
    fi
  done < <(printf '%s\n' "${combined}" | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | sort -u)
fi

if echo "$dns_out" | grep -qxF "${APP_IP}"; then
  pass "DNS (resolver) includes expected A record ($APP_IP)"
elif [[ "${auth_has_expected}" -eq 1 ]]; then
  pass "Authoritative DNS has A → ${APP_IP} (resolver view: ${dns_out:-<empty>}; TTL cache may lag)"
  echo "  WARN  Until resolvers expire old A records, browsers may still hit the previous IP. Use VERIFY_FORCE_IP=${APP_IP} for HTTPS checks, or wait for TTL."
else
  failf "DNS: expected A ${APP_IP} not seen from resolver or authoritative NS. Resolver: ${dns_out:-<empty>}"
fi

if [[ "$(echo "$dns_out" | grep -cE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || true)" -gt 1 ]]; then
  echo "  WARN  Resolver returned multiple A values; apex should converge to a single correct A."
fi

check_http_code "Homepage HTTPS" "https://${APP_DOMAIN}" "200"
check_http_code "Backend health via Caddy" "https://${APP_DOMAIN}/api/healthz" "200"
check_http_code "Chat route HTTPS" "https://${APP_DOMAIN}/chat" "200"
check_http_code "Direct app IP HTTP" "http://${APP_IP}" "200"
check_http_code "Direct app IP API health" "http://${APP_IP}/api/healthz" "200"

if [[ -n "${VERIFY_FORCE_IP:-}" ]]; then
  if ! models_json="$(curl -fsS --max-time "$TIMEOUT" --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" "https://${APP_DOMAIN}/api/v1/models" 2>/dev/null)"; then
    models_json=""
  fi
else
  if ! models_json="$(curl -fsS --max-time "$TIMEOUT" "https://${APP_DOMAIN}/api/v1/models" 2>/dev/null)"; then
    models_json=""
  fi
fi
if [[ -n "${models_json:-}" ]]; then
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
  if [[ -n "${VERIFY_FORCE_IP:-}" ]]; then
    chat_out="$(curl -fsS --max-time 60 --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" -H "Content-Type: application/json" \
      -d "{\"model\":\"${model_id}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"max_tokens\":16}" \
      "https://${APP_DOMAIN}/api/v1/chat/completions" 2>/dev/null || true)"
  else
    chat_out="$(curl -fsS --max-time 60 -H "Content-Type: application/json" \
      -d "{\"model\":\"${model_id}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK only.\"}],\"max_tokens\":16}" \
      "https://${APP_DOMAIN}/api/v1/chat/completions" 2>/dev/null || true)"
  fi
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
