#!/usr/bin/env bash
# End-to-end deploy: pre-flight → Terraform (prod) → chatbot (dedicated or colocated) → deploy-app.sh
#
# Usage:
#   ./deployment/deploy.sh
#   ./deployment/deploy.sh --diagnose     # pre-flight + SSH + inter-VM probes only (no terraform apply / no image deploy)
#   DEPLOY_LEGACY=1 ./deployment/deploy.sh  # app stack only (see deploy-app.sh)
#
# Optional env: SKIP_PREFLIGHT_GIT=1  REFRESH_IPS_FROM_TF=0  FORCE_COLOCATE_ON_ROUTING_FAIL=1
#               PREFLIGHT_SSH=1  (probe app SSH before Terraform; uses APP_HOST — may be stale until TF refresh)
#               DEPLOY_RETRY_MAX=3  DEPLOY_RETRY_DELAY_SEC=2  SSH_CONNECT_TIMEOUT=12  SSH_KEY=...
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export REPO_ROOT
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"
DEPLOY_LOG_DIR="${REPO_ROOT}/deployment/deployment-logs"
DEPLOY_JSONL="${DEPLOY_LOG_DIR}/deploy.jsonl"
DEBUG_NDJSON="${DEPLOY_LOG_DIR}/debug-fcc1a0.log"

APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"
# Defaults: prod single instance scw-new-psy (public IPv4). Override for split-host layouts.
CHATBOT_HOST="${CHATBOT_HOST:-62.210.238.160}"
APP_HOST="${APP_HOST:-62.210.238.160}"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"
OUTBOUND_IP=""
DEPLOY_DIAGNOSE=0
for _arg in "$@"; do
  [[ "${_arg}" == "--diagnose" ]] && DEPLOY_DIAGNOSE=1
done

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

# --- structured deploy log (deployment/deployment-logs only) ---
_deploy_log_struct() {
  local event="$1"
  local data_json="${2:-{}}"
  mkdir -p "${DEPLOY_LOG_DIR}" 2>/dev/null || true
  python3 <<PY || true
import json, os, time, pathlib
event = os.environ["DLE_EVENT"]
try:
    data = json.loads(os.environ.get("DLE_DATA") or "{}")
except json.JSONDecodeError:
    data = {"parse_error": True}
entry = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "event": event,
    "data": data,
}
path = pathlib.Path(os.environ["DLE_PATH"])
path.parent.mkdir(parents=True, exist_ok=True)
with path.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
}
deploy_log_struct() {
  export DLE_EVENT="$1"
  export DLE_DATA="${2:-{}}"
  export DLE_PATH="${DEPLOY_JSONL}"
  _deploy_log_struct "$@"
  unset DLE_EVENT DLE_DATA DLE_PATH
}

# #region agent log (NDJSON diagnostics; same directory as deploy.jsonl)
agent_dbg_log() {
  export AGENT_HYP="$1"
  export AGENT_MSG="$2"
  export AGENT_JSON_PAYLOAD="${3:-{}}"
  python3 <<'PY' || true
import json, os, sys, time, pathlib
try:
    data = json.loads(os.environ.get("AGENT_JSON_PAYLOAD") or "{}")
except json.JSONDecodeError:
    data = {"json_parse_error": True}
entry = {
    "sessionId": "fcc1a0",
    "timestamp": int(time.time() * 1000),
    "hypothesisId": os.environ.get("AGENT_HYP", ""),
    "location": "deployment/deploy.sh",
    "message": os.environ.get("AGENT_MSG", ""),
    "data": data,
    "runId": os.environ.get("AGENT_RUN_ID", "pre-fix"),
}
path = pathlib.Path(os.environ["REPO_ROOT"]) / "deployment" / "deployment-logs" / "debug-fcc1a0.log"
path.parent.mkdir(parents=True, exist_ok=True)
with path.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
  unset AGENT_HYP AGENT_MSG AGENT_JSON_PAYLOAD
}
# #endregion

retry() {
  local max="${DEPLOY_RETRY_MAX:-3}"
  local delay="${DEPLOY_RETRY_DELAY_SEC:-2}"
  local i
  for ((i = 1; i <= max; i++)); do
    if "$@"; then
      return 0
    fi
    [[ "${i}" -lt "${max}" ]] && sleep "${delay}"
  done
  return 1
}

detect_outbound_ip() {
  OUTBOUND_IP="$( (curl -4 -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "") | tr -d '\n\r' )"
  log "[PRE-FLIGHT] Outbound IPv4 (for Scaleway SG /32): ${OUTBOUND_IP:-unknown}"
  deploy_log_struct "outbound_ip" "{\"ipv4\":\"${OUTBOUND_IP}\"}"
  agent_dbg_log H6 "client_outbound_ipv4_hint" "{\"ifconfig_or_ipify\":\"${OUTBOUND_IP}\"}"
}

check_git_state() {
  if [[ "${SKIP_PREFLIGHT_GIT:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] SKIP_PREFLIGHT_GIT=1 — skipping origin/main sync check"
    deploy_log_struct "preflight_git_skipped" "{}"
    return 0
  fi
  if [[ ! -d "${REPO_ROOT}/.git" ]]; then
    log "[PRE-FLIGHT] Not a git checkout — skipping origin/main sync check"
    return 0
  fi
  cd "${REPO_ROOT}"
  git fetch origin main --depth=1 2>/dev/null || die "[PRE-FLIGHT] git fetch origin main failed (network?). Fix network or set SKIP_PREFLIGHT_GIT=1"
  local local_h remote_h
  local_h="$(git rev-parse HEAD)"
  remote_h="$(git rev-parse FETCH_HEAD)"
  if [[ "${local_h}" != "${remote_h}" ]]; then
    die "[PRE-FLIGHT] Local repo is not at origin/main (local=${local_h:0:12}… vs remote=${remote_h:0:12}…). Run: git pull origin main"
  fi
  log "[PRE-FLIGHT] Git OK — HEAD matches origin/main"
  deploy_log_struct "preflight_git_ok" "{\"head\":\"${local_h:0:12}\"}"
}

check_terraform_preflight() {
  if ! command -v terraform >/dev/null 2>&1; then
    die "[PRE-FLIGHT] terraform not found in PATH"
  fi
  (
    cd "${TF_DIR}"
    terraform init -backend=false >/dev/null
    terraform validate
  ) || die "[PRE-FLIGHT] terraform validate failed in ${TF_DIR}"
  log "[PRE-FLIGHT] terraform validate OK (${TF_DIR})"
  deploy_log_struct "preflight_terraform_validate_ok" "{\"dir\":\"${TF_DIR}\"}"
}

check_credentials_conflict() {
  local tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -f "${tfvars}" ]]; then
    if [[ -n "${TF_VAR_access_key:-}" || -n "${TF_VAR_scaleway_access_key:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*access_key is set. Use only terraform.tfvars OR only env vars, not both."
    fi
  fi
  if [[ -n "${SCW_ACCESS_KEY:-}" ]] && [[ -f "${HOME}/.config/scw/config.yaml" ]]; then
    log "[PRE-FLIGHT] WARNING — SCW_ACCESS_KEY is set and ~/.config/scw/config.yaml exists; ensure Scaleway CLI and Terraform use the intended project."
    deploy_log_struct "preflight_scw_warning" "{\"note\":\"multiple_scw_sources_possible\"}"
  fi
}

preflight_checks() {
  log "[PRE-FLIGHT] Starting checks…"
  deploy_log_struct "preflight_start" "{}"
  cd "${REPO_ROOT}"
  check_git_state
  check_credentials_conflict
  export TF_VAR_scaleway_access_key="${TF_VAR_scaleway_access_key:-${TF_VAR_access_key:-}}"
  export TF_VAR_scaleway_secret_key="${TF_VAR_scaleway_secret_key:-${TF_VAR_secret_key:-}}"
  export TF_VAR_scaleway_project_id="${TF_VAR_scaleway_project_id:-${TF_VAR_project_id:-}}"
  _tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -z "${TF_VAR_scaleway_access_key:-}" || -z "${TF_VAR_scaleway_secret_key:-}" || -z "${TF_VAR_scaleway_project_id:-}" ]]; then
    if [[ -f "${_tfvars}" ]]; then
      log "[PRE-FLIGHT] Using Scaleway credentials from ${_tfvars} (TF_VAR_* not all set)."
    else
      die "[PRE-FLIGHT] Missing Scaleway credentials: set TF_VAR_scaleway_* or create ${_tfvars}"
    fi
  fi
  check_terraform_preflight
  detect_outbound_ip
  if [[ "${PREFLIGHT_SSH:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] PREFLIGHT_SSH=1 — probing SSH to app (${APP_HOST}) before Terraform"
    check_ssh_host "app" "${APP_HOST}" || die "[PRE-FLIGHT] App SSH failed (fix SG or unset PREFLIGHT_SSH). Outbound: ${OUTBOUND_IP:-unknown}"
  fi
  deploy_log_struct "preflight_done" "{}"
  log "[PRE-FLIGHT] All checks passed."
}

check_ssh_host() {
  local name="$1"
  local host="$2"
  log "[CHECK] SSH → ${name} (${host})"
  if retry ssh "${SSH_OPTS[@]}" "root@${host}" "exit"; then
    agent_dbg_log "SSH" "ssh_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    deploy_log_struct "ssh_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    return 0
  fi
  printf "\n[ERROR] Cannot SSH into %s (%s) after %s attempts.\n" "${name}" "${host}" "${DEPLOY_RETRY_MAX:-3}" >&2
  printf "[ACTION] Allow inbound TCP/22 from your public IPv4 on the instance security group (Scaleway).\n" >&2
  printf "[HINT] Detected outbound IPv4: %s\n" "${OUTBOUND_IP:-unknown}" >&2
  agent_dbg_log "SSH" "ssh_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  deploy_log_struct "ssh_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  return 1
}

# From app VM: HTTP reachability to chatbot :8000 (split-host path)
probe_app_to_chatbot() {
  local chatbot_ip="$1"
  log "[CHECK] App → chatbot HTTP (${APP_HOST} → http://${chatbot_ip}:8000/health)"
  if retry ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "curl -fsS --connect-timeout 5 --max-time 8 http://${chatbot_ip}:8000/health" >/dev/null 2>&1; then
    deploy_log_struct "intervm_ok" "{\"from\":\"app\",\"to\":\"${chatbot_ip}\",\"port\":8000}"
    return 0
  fi
  deploy_log_struct "intervm_fail" "{\"from\":\"app\",\"to\":\"${chatbot_ip}\",\"port\":8000}"
  return 1
}

refresh_hosts_from_terraform() {
  [[ "${REFRESH_IPS_FROM_TF:-1}" == "1" ]] || return 0
  local json
  json="$(cd "${TF_DIR}" && terraform output -json 2>/dev/null)" || return 0
  local new_app new_bot
  new_app="$(printf '%s' "${json}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('app_public_ip',{}).get('value') or '')" 2>/dev/null || true)"
  new_bot="$(printf '%s' "${json}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('chatbot_public_ip',{}).get('value') or '')" 2>/dev/null || true)"
  if [[ -n "${new_app}" ]]; then
    APP_HOST="${new_app}"
  fi
  if [[ -n "${new_bot}" ]]; then
    CHATBOT_HOST="${new_bot}"
  fi
  deploy_log_struct "hosts_from_tf" "{\"APP_HOST\":\"${APP_HOST}\",\"CHATBOT_HOST\":\"${CHATBOT_HOST}\"}"
}

sync_and_compose_chatbot_on() {
  local target_host="$1"
  log "Sync chatbot slice → ${target_host}:${REMOTE_BASE}"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${target_host}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -" \
    || die "[ERROR] tar|ssh to ${target_host} failed — likely SSH unreachable or disk full. If you saw 'Write error', the SSH leg failed (check TCP/22). Outbound IP hint: ${OUTBOUND_IP:-unknown}"
  run_ssh "${target_host}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"
}

wait_chatbot_http_ok_ssh() {
  local target="$1"
  local max_tries="${2:-36}"
  local delay="${3:-5}"
  local i ok=0
  for ((i = 1; i <= max_tries; i++)); do
    if ssh "${SSH_OPTS[@]}" "root@${target}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep "${delay}"
  done
  [[ "${ok}" -eq 1 ]] || die "[ERROR] Colocated chatbot /health failed on ${target}"
  deploy_log_struct "chatbot_loopback_ok" "{\"host\":\"${target}\"}"
}

# --- optional: model_loaded / model_ready in JSON (best-effort grep) ---
_health_json_has_model_true() {
  printf '%s' "$1" | grep -qE '"(model_loaded|model_ready)"[[:space:]]*:[[:space:]]*true'
}

wait_chatbot_model_ready_optional() {
  local base_url="$1"
  local max_tries="${2:-30}"
  local delay="${3:-5}"
  local i body
  for ((i = 1; i <= max_tries; i++)); do
    body="$(curl -fsS --max-time 8 "${base_url}" 2>/dev/null || true)"
    if _health_json_has_model_true "${body}"; then
      log "[INFO] Chatbot reports model ready (${base_url})"
      deploy_log_struct "model_ready" "{\"url\":\"${base_url}\"}"
      return 0
    fi
    sleep "${delay}"
  done
  log "[WARN] model not reported ready yet — continuing (service may still be degraded)"
  deploy_log_struct "model_ready_timeout_warn" "{\"url\":\"${base_url}\"}"
  return 0
}

wait_chatbot_model_ready_optional_ssh() {
  local target="$1"
  local max_tries="${2:-30}"
  local delay="${3:-5}"
  local i body
  for ((i = 1; i <= max_tries; i++)); do
    body="$(ssh "${SSH_OPTS[@]}" "root@${target}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" 2>/dev/null || true)"
    if _health_json_has_model_true "${body}"; then
      log "[INFO] Chatbot on ${target} reports model ready (loopback /health)"
      deploy_log_struct "model_ready" "{\"host\":\"${target}\",\"via\":\"ssh_loopback\"}"
      return 0
    fi
    sleep "${delay}"
  done
  log "[WARN] model not reported ready on ${target} — continuing (degraded)"
  deploy_log_struct "model_ready_timeout_warn" "{\"host\":\"${target}\",\"via\":\"ssh_loopback\"}"
  return 0
}

# ========== PRE-FLIGHT (always before deploy) ==========
preflight_checks

# ========== --diagnose only ==========
if [[ "${DEPLOY_DIAGNOSE}" == "1" ]]; then
  log "[DIAGNOSE] SSH + network probes only (no terraform apply, no stack deploy)"
  check_ssh_host "app" "${APP_HOST}" || exit 1
  if check_ssh_host "chatbot" "${CHATBOT_HOST}"; then
    probe_app_to_chatbot "${CHATBOT_HOST}" || log "[DIAGNOSE] WARN — app cannot reach chatbot:8000 (SG / routing)"
  else
    log "[DIAGNOSE] chatbot SSH failed — dedicated path unavailable; colocate path would require app SSH only"
  fi
  log "[DIAGNOSE] Done."
  exit 0
fi

# ========== Local docker (optional) ==========
log "STEP 1 — Build (optional local validation)"
if command -v docker >/dev/null 2>&1; then
  COPYFILE_DISABLE=1 docker build -t safepsy-chatbot:local "${REPO_ROOT}/apps/ai-chatbot" || log "Local docker build skipped or failed (non-fatal)"
else
  log "docker not installed locally; build will happen on remote host"
fi

# ========== Terraform apply ==========
log "STEP 2 — Terraform apply (${TF_DIR})"
(
  cd "${TF_DIR}"
  terraform init -backend=false
  terraform apply -auto-approve -input=false
) || die "terraform apply failed"

mkdir -p "${DEPLOY_LOG_DIR}" 2>/dev/null || true
(cd "${TF_DIR}" && terraform output -json > "${DEPLOY_LOG_DIR}/tf-output.json") 2>/dev/null || true
deploy_log_struct "terraform_output_json" "{\"path\":\"${DEPLOY_LOG_DIR}/tf-output.json\"}"

CHATBOT_PRIVATE_IP="$(cd "${TF_DIR}" && terraform output -raw chatbot_private_ip)"
[[ -n "${CHATBOT_PRIVATE_IP}" ]] || die "terraform output chatbot_private_ip empty"
APP_TF_PUBLIC_IP="$(cd "${TF_DIR}" && terraform output -raw app_public_ip 2>/dev/null || echo "")"
refresh_hosts_from_terraform

_key_set="false"
[[ -n "${SSH_KEY}" ]] && _key_set="true"
_match_tf="false"
[[ -n "${APP_TF_PUBLIC_IP}" && "${APP_HOST}" == "${APP_TF_PUBLIC_IP}" ]] && _match_tf="true"
agent_dbg_log H5 "post_terraform_hosts" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\",\"chatbot_private_ip\":\"${CHATBOT_PRIVATE_IP}\",\"app_public_ip_tf\":\"${APP_TF_PUBLIC_IP}\",\"app_host_matches_tf\":${_match_tf},\"SSH_CONNECT_TIMEOUT\":${SSH_CONNECT_TIMEOUT},\"ssh_key_path_set\":\"${_key_set}\"}"
log "Debug NDJSON: ${DEBUG_NDJSON}"
deploy_log_struct "terraform_apply_done" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\"}"

# App SSH is mandatory for any path
check_ssh_host "app" "${APP_HOST}" || die "Cannot deploy: app host SSH failed."

COLOCATE_CHATBOT_ON_APP=0
if [[ "${APP_HOST}" == "${CHATBOT_HOST}" ]]; then
  log "[INFO] SINGLE_INSTANCE: APP_HOST and CHATBOT_HOST are the same (${APP_HOST}) — colocated compose (one VM)."
  deploy_log_struct "single_instance_colocate" "{\"host\":\"${APP_HOST}\"}"
  COLOCATE_CHATBOT_ON_APP=1
else
  _ts0="$(python3 -c 'import time; print(int(time.time()*1000))')"
  set +e
  retry ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "exit" >/dev/null 2>&1
  CHATBOT_SSH_RC=$?
  set -e
  _ts1="$(python3 -c 'import time; print(int(time.time()*1000))')"
  CHATBOT_SSH_MS=$((_ts1 - _ts0))
  agent_dbg_log H1 "chatbot_ssh_probe" "{\"host\":\"${CHATBOT_HOST}\",\"exitCode\":${CHATBOT_SSH_RC},\"durationMs\":${CHATBOT_SSH_MS}}"

  if [[ "${CHATBOT_SSH_RC}" -ne 0 ]]; then
    COLOCATE_CHATBOT_ON_APP=1
    log "WARN — Cannot SSH to chatbot host ${CHATBOT_HOST}. [FALLBACK] Colocating chatbot on app ${APP_HOST}."
    deploy_log_struct "fallback_colocate_ssh" "{\"reason\":\"chatbot_ssh\",\"chatbotHost\":\"${CHATBOT_HOST}\"}"
    agent_dbg_log H2 "colocate_branch_selected" "{\"reason\":\"chatbot_ssh_nonzero\",\"chatbotSshExitCode\":${CHATBOT_SSH_RC}}"
    log "Hint — allow Scaleway inbound TCP/22 from: ${OUTBOUND_IP:-unknown}"
  fi
fi

if [[ "${COLOCATE_CHATBOT_ON_APP}" -eq 1 ]]; then
  sync_and_compose_chatbot_on "${APP_HOST}"
  wait_chatbot_http_ok_ssh "${APP_HOST}" 36 5
  wait_chatbot_model_ready_optional_ssh "${APP_HOST}" 24 5 || true
else
  log "STEP 3 — Dedicated chatbot on ${CHATBOT_HOST}"
  sync_and_compose_chatbot_on "${CHATBOT_HOST}"
  log "STEP 4 — Verify chatbot /health (public or on-host)"
  ok=0
  for _i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 5 "http://${CHATBOT_HOST}:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    if ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "curl -fsS --max-time 5 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 3
  done
  [[ "${ok}" -eq 1 ]] || die "Chatbot health check failed on ${CHATBOT_HOST}"
  deploy_log_struct "dedicated_chatbot_health_ok" "{\"host\":\"${CHATBOT_HOST}\"}"
  wait_chatbot_model_ready_optional "http://${CHATBOT_HOST}:8000/health" 24 5 || true

  if ! probe_app_to_chatbot "${CHATBOT_HOST}"; then
    printf "\n[ERROR] App VM cannot reach chatbot at http://%s:8000/health (routing or SG).\n" "${CHATBOT_HOST}" >&2
    printf "[ACTION] In Scaleway, allow TCP/8000 from app IP %s to chatbot instance.\n" "${APP_HOST}" >&2
    if [[ "${FORCE_COLOCATE_ON_ROUTING_FAIL:-0}" == "1" ]]; then
      log "[FALLBACK] FORCE_COLOCATE_ON_ROUTING_FAIL=1 — colocating chatbot on ${APP_HOST}"
      deploy_log_struct "fallback_colocate_intervm" "{\"reason\":\"app_to_chatbot_http\"}"
      COLOCATE_CHATBOT_ON_APP=1
      sync_and_compose_chatbot_on "${APP_HOST}"
      wait_chatbot_http_ok_ssh "${APP_HOST}" 36 5
      wait_chatbot_model_ready_optional_ssh "${APP_HOST}" 24 5 || true
    else
      die "Set FORCE_COLOCATE_ON_ROUTING_FAIL=1 to auto-colocate on the app host, or fix SG/routing."
    fi
  fi
fi

log "STEP 5 — App stack (deploy-app.sh)"
export APP_DOMAIN
export CADDY_SITE_NAMES
export APP_IP="${APP_HOST}"
export SKIP_VLLM_DEPLOY=1
export CHATBOT_HEALTH_PATH=/health
if [[ "${COLOCATE_CHATBOT_ON_APP}" -eq 1 ]]; then
  export SINGLE_HOST=1
  export API_IP="${APP_HOST}"
  unset MODEL_API_URL_FOR_COMPOSE || true
  unset MODEL_API_URL_ALT_FOR_COMPOSE || true
else
  export SINGLE_HOST=0
  export API_IP="${CHATBOT_HOST}"
  export MODEL_API_URL_FOR_COMPOSE="http://${CHATBOT_HOST}:8000"
  export MODEL_API_URL_ALT_FOR_COMPOSE="http://${CHATBOT_PRIVATE_IP}:8000"
fi
deploy_log_struct "exec_deploy_app" "{\"SINGLE_HOST\":\"${SINGLE_HOST:-0}\",\"COLOCATE\":\"${COLOCATE_CHATBOT_ON_APP}\"}"
exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
