#!/usr/bin/env bash
# App-server HTTP probe only. Run on the production app host (or anywhere with route to APP_IP).
# Do NOT use 127.0.0.1 — Caddy may 308 to HTTPS and break the check.
#
# Env:
#   APP_IP               default 51.159.117.169
#   HEALTHCHECK_URL      override full URL (default http://${APP_IP}/api/healthz)
#   HEALTHCHECK_RETRIES  default 3
#   CURL_MAX_TIME        default 10 (seconds, total request)
#   CURL_CONNECT_TIMEOUT default 5
#
# Exit: 0 UP, 1 DOWN
# Stdout last line: STATUS=UP or STATUS=DOWN

set -euo pipefail

APP_IP="${APP_IP:-51.159.117.169}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://${APP_IP}/api/healthz}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-3}"
CURL_MAX_TIME="${CURL_MAX_TIME:-10}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"

run_once() {
  local cerr combined code curl_ec
  cerr="$(mktemp)"
  set +e
  combined="$(curl -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    "${HEALTHCHECK_URL}" 2>"${cerr}")"
  curl_ec=$?
  set -e
  rm -f "${cerr}"
  if [[ ${curl_ec} -ne 0 ]]; then
    return 1
  fi
  [[ "${combined}" == "200" ]]
}

main() {
  local attempt ok=0
  for ((attempt = 1; attempt <= HEALTHCHECK_RETRIES; attempt++)); do
    if run_once; then
      ok=1
      break
    fi
    if [[ "${attempt}" -lt "${HEALTHCHECK_RETRIES}" ]]; then
      sleep 2
    fi
  done
  if [[ "${ok}" -eq 1 ]]; then
    printf 'STATUS=UP\n'
    exit 0
  fi
  printf 'STATUS=DOWN\n'
  exit 1
}

main "$@"
