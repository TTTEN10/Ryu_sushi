#!/usr/bin/env bash
# Verify/diagnose production (Caddy + Python API proxy + SPA on APP_DOMAIN).
#
# Usage:
#   bash deployment/verify-production.sh
#
# Optional env:
#   APP_DOMAIN=polinapsycho.com
#   APP_IP=151.115.151.231
#   TIMEOUT=15
#   CHECK_LLM=1              # POST /api/chat/completions (guest, non-stream)
#   CHECK_LLM_STREAM=1       # optional SSE smoke test (requires CHECK_LLM=1)
#   USE_SCALEWAY_DIRECT=1    # expect Scaleway routing (no chatbot :8000); models list is static
#   SCALEWAY_MODEL=...       # expected model id when USE_SCALEWAY_DIRECT=1
#   VERIFY_FORCE_IP=...      # pin curl to VIP when DNS still caches an old A record
#   VERIFY_LOCAL=1           # http://127.0.0.1:LOCAL_HTTP_PORT (skip DNS + domain HTTPS)
#   LOCAL_HTTP_PORT=9080     # with VERIFY_LOCAL=1 (deploy-local-app.sh default)

set -euo pipefail

VERIFY_LOCAL="${VERIFY_LOCAL:-0}"
LOCAL_HTTP_PORT="${LOCAL_HTTP_PORT:-9080}"
APP_DOMAIN="${APP_DOMAIN:-polinapsycho.com}"
APP_IP="${APP_IP:-151.115.151.231}"
LOCAL_BASE_URL="http://127.0.0.1:${LOCAL_HTTP_PORT}"
TIMEOUT="${TIMEOUT:-15}"
CHECK_LLM="${CHECK_LLM:-0}"
CHECK_LLM_STREAM="${CHECK_LLM_STREAM:-0}"
USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-0}"
SCALEWAY_MODEL="${SCALEWAY_MODEL:-mistral-small-3.2-24b-instruct-2506}"

fail=0
model_id=""

pass() { echo "  PASS  $*"; }
failf() { echo "  FAIL  $*"; fail=$((fail+1)); }
warn() { echo "  WARN  $*"; }

# curl helper: optional --resolve when VERIFY_FORCE_IP is set for APP_DOMAIN URLs
curl_app() {
  local out_var="$1"
  shift
  local url="$1"
  shift
  local tmp
  tmp="$(mktemp)"
  if [[ -n "${VERIFY_FORCE_IP:-}" && "$url" == *"${APP_DOMAIN}"* ]]; then
    if curl -sS -o "${tmp}" --max-time "$TIMEOUT" \
      --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" \
      --resolve "${APP_DOMAIN}:80:${VERIFY_FORCE_IP}" \
      "$url" "$@" 2>/dev/null; then
      printf -v "${out_var}" '%s' "$(cat "${tmp}")"
      rm -f "${tmp}"
      return 0
    fi
  else
    if curl -sS -o "${tmp}" --max-time "$TIMEOUT" "$url" "$@" 2>/dev/null; then
      printf -v "${out_var}" '%s' "$(cat "${tmp}")"
      rm -f "${tmp}"
      return 0
    fi
  fi
  rm -f "${tmp}"
  return 1
}

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

if [[ "$VERIFY_LOCAL" == "1" ]]; then
  echo "Verifying local Docker stack: ${LOCAL_BASE_URL}"
  USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
else
  echo "Verifying production for domain: $APP_DOMAIN"
  echo "Expected app IP: $APP_IP"
fi
if [[ "$USE_SCALEWAY_DIRECT" == "1" ]]; then
  echo "LLM mode: Scaleway direct (no FastAPI chatbot VM required)"
else
  echo "LLM mode: legacy (Python proxy → chatbot :8000 or vLLM)"
fi
echo

if [[ "$VERIFY_LOCAL" == "1" ]]; then
  check_http_code "Homepage HTTP" "${LOCAL_BASE_URL}/" "200"
  check_http_code "Backend health via Caddy" "${LOCAL_BASE_URL}/api/healthz" "200"
  check_http_code "Chat route HTTP" "${LOCAL_BASE_URL}/chat" "200"
  models_json=""
  if curl_app models_json "${LOCAL_BASE_URL}/api/v1/models"; then
    if echo "$models_json" | grep -q '"data"'; then
      model_id="$(echo "$models_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",[{}])[0].get("id",""))' 2>/dev/null || true)"
      pass "Models endpoint (model: ${model_id:-unknown})"
    else
      failf "Models JSON missing data[] (${LOCAL_BASE_URL}/api/v1/models)"
    fi
  else
    failf "Models endpoint failed (${LOCAL_BASE_URL}/api/v1/models)"
  fi
  if [[ "$CHECK_LLM" == "1" ]]; then
    chat_body='{"messages":[{"role":"user","content":"Reply with OK only."}],"stream":false,"mode":"guest","maxTokens":32}'
    chat_tmp="$(mktemp)"
    if curl -sS --max-time 90 -H "Content-Type: application/json" -d "${chat_body}" \
      -o "${chat_tmp}" "${LOCAL_BASE_URL}/api/chat/completions" 2>/dev/null \
      && grep -q '"choices"' "${chat_tmp}"; then
      pass "Chat completions POST /api/chat/completions (guest, non-stream)"
    else
      failf "Chat completions failed (${LOCAL_BASE_URL}/api/chat/completions)"
      [[ -s "${chat_tmp}" ]] && echo "       Response snippet: $(head -c 200 "${chat_tmp}")"
    fi
    rm -f "${chat_tmp}"
  fi
  echo
  if [[ "$fail" -eq 0 ]]; then
    echo "All local checks passed."
    exit 0
  fi
  echo "$fail check(s) failed."
  echo "Diagnose: cd .local-app-stack && docker compose ps && docker compose logs -f"
  exit 1
fi

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
  warn "Until resolvers expire old A records, browsers may still hit the previous IP. Use VERIFY_FORCE_IP=${APP_IP} for HTTPS checks, or wait for TTL."
else
  failf "DNS: expected A ${APP_IP} not seen from resolver or authoritative NS. Resolver: ${dns_out:-<empty>}"
fi

if [[ "$(echo "$dns_out" | grep -cE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || true)" -gt 1 ]]; then
  warn "Resolver returned multiple A values; apex should converge to a single correct A."
fi

check_http_code "Homepage HTTPS" "https://${APP_DOMAIN}" "200"
check_http_code "Backend health via Caddy" "https://${APP_DOMAIN}/api/healthz" "200"
check_http_code "Chat route HTTPS" "https://${APP_DOMAIN}/chat" "200"
check_http_code "Direct app IP HTTP" "http://${APP_IP}" "200"
check_http_code "Direct app IP API health" "http://${APP_IP}/api/healthz" "200"

models_json=""
if curl_app models_json "https://${APP_DOMAIN}/api/v1/models"; then
  if echo "$models_json" | grep -q '"data"'; then
    model_id="$(echo "$models_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",[{}])[0].get("id",""))' 2>/dev/null || true)"
    if [[ "$USE_SCALEWAY_DIRECT" == "1" ]]; then
      if echo "$models_json" | grep -q 'scaleway-direct\|"owned_by": "scaleway"'; then
        pass "Models endpoint (Scaleway direct routing, model: ${model_id:-unknown})"
      elif [[ -n "${model_id}" ]]; then
        pass "Models endpoint reachable (model: ${model_id}; configure USE_SCALEWAY_DIRECT=1 on server for scaleway-direct marker)"
      else
        failf "Models JSON missing model id (https://${APP_DOMAIN}/api/v1/models)"
      fi
      if [[ -n "${model_id}" && "${model_id}" != "${SCALEWAY_MODEL}" ]]; then
        warn "Model id ${model_id} differs from SCALEWAY_MODEL=${SCALEWAY_MODEL}"
      fi
    else
      if echo "$models_json" | grep -q '"warning"'; then
        warn "Models endpoint returned fallback list (chatbot /v1/models may be unreachable)"
      fi
      pass "Models endpoint reachable (model: ${model_id:-unknown})"
    fi
  else
    failf "Models JSON missing data[] (https://${APP_DOMAIN}/api/v1/models)"
  fi
else
  failf "Models endpoint failed (https://${APP_DOMAIN}/api/v1/models)"
fi

# Product chat path (ChatWidget uses /api/chat/completions)
if [[ "$CHECK_LLM" == "1" ]]; then
  chat_body='{"messages":[{"role":"user","content":"Reply with OK only."}],"stream":false,"mode":"guest","maxTokens":32}'
  chat_out=""
  chat_tmp="$(mktemp)"
  if [[ -n "${VERIFY_FORCE_IP:-}" ]]; then
    curl_ok=0
    curl -sS --max-time 90 -H "Content-Type: application/json" -d "${chat_body}" \
      --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" \
      --resolve "${APP_DOMAIN}:80:${VERIFY_FORCE_IP}" \
      -o "${chat_tmp}" "https://${APP_DOMAIN}/api/chat/completions" 2>/dev/null && curl_ok=1
  else
    curl_ok=0
    curl -sS --max-time 90 -H "Content-Type: application/json" -d "${chat_body}" \
      -o "${chat_tmp}" "https://${APP_DOMAIN}/api/chat/completions" 2>/dev/null && curl_ok=1
  fi
  if [[ "${curl_ok:-0}" -eq 1 ]]; then
    chat_out="$(cat "${chat_tmp}")"
  fi
  rm -f "${chat_tmp}"
  if [[ -n "$chat_out" ]] && echo "$chat_out" | grep -q '"choices"'; then
    pass "Chat completions POST /api/chat/completions (guest, non-stream)"
  else
    failf "Chat completions failed (POST https://${APP_DOMAIN}/api/chat/completions). Set SCALEWAY_API_KEY on server when USE_SCALEWAY_DIRECT=1."
    if [[ -n "$chat_out" ]]; then
      echo "       Response snippet: $(echo "$chat_out" | head -c 200)"
    fi
  fi

  if [[ "$CHECK_LLM_STREAM" == "1" ]]; then
    stream_body='{"messages":[{"role":"user","content":"Say hi."}],"stream":true,"mode":"guest","maxTokens":32}'
    stream_tmp="$(mktemp)"
    stream_ok=0
    if [[ -n "${VERIFY_FORCE_IP:-}" ]]; then
      curl -sS --max-time 90 -N -H "Content-Type: application/json" -d "${stream_body}" \
        --resolve "${APP_DOMAIN}:443:${VERIFY_FORCE_IP}" \
        --resolve "${APP_DOMAIN}:80:${VERIFY_FORCE_IP}" \
        -o "${stream_tmp}" "https://${APP_DOMAIN}/api/chat/completions" 2>/dev/null && stream_ok=1
    else
      curl -sS --max-time 90 -N -H "Content-Type: application/json" -d "${stream_body}" \
        -o "${stream_tmp}" "https://${APP_DOMAIN}/api/chat/completions" 2>/dev/null && stream_ok=1
    fi
    if [[ "${stream_ok}" -eq 1 ]] && grep -qE 'event:|data:' "${stream_tmp}" 2>/dev/null; then
      pass "Chat completions streaming SSE (/api/chat/completions)"
    else
      failf "Chat streaming SSE failed (/api/chat/completions)"
    fi
    rm -f "${stream_tmp}"
  fi
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All production checks passed."
  exit 0
fi

echo "$fail check(s) failed."
echo "Diagnose on app server:"
echo "  ssh root@${APP_IP} 'cd /home/safepsy/app && docker compose ps && docker compose logs --tail=80 backend && docker compose logs --tail=40 caddy'"
if [[ "$USE_SCALEWAY_DIRECT" == "1" ]]; then
  echo "Scaleway direct: ensure backend container has USE_SCALEWAY_DIRECT=1 and SCALEWAY_API_KEY set (see deploy/app/.env.example)."
else
  echo "Legacy: ensure chatbot :8000 is healthy from the app host (deployment/deploy.sh inter-VM check)."
fi
exit 1
