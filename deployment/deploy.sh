#!/usr/bin/env bash
# End-to-end deploy: Terraform (prod) → chatbot compose on chatbot host → app stack via deploy-app.sh
#
# Prerequisites: SSH (root) to hosts, Scaleway API keys for Terraform, TF_VAR_* or .tfvars.
#
# Local destructive Docker cleanup (docker system prune) is NOT part of this script.
# Run only when explicitly intended: CONFIRM_DEPLOYMENT_RESET=true docker system prune -a --volumes -f
#
# Legacy one-liner (deploy-app only): DEPLOY_LEGACY=1 ./deployment/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export REPO_ROOT
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"

# Production site (passed to deploy-app.sh for Vite `VITE_API_URL`, Caddy TLS, HTTPS checks)
APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"

CHATBOT_HOST="${CHATBOT_HOST:-51.159.118.165}"
APP_HOST="${APP_HOST:-51.159.149.66}"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

# #region agent log
# Debug NDJSON (session fcc1a0): SSH / routing evidence — no secrets (no key material).
# Writes to deployment/deployment-logs/ first (always writable); .cursor/ is optional (may be EPERM on some hosts).
_AGENT_DEBUG_LOG_PRIMARY="${REPO_ROOT}/.cursor/debug-fcc1a0.log"
_AGENT_DEBUG_LOG_FALLBACK="${REPO_ROOT}/deployment/deployment-logs/debug-fcc1a0.log"
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
line = json.dumps(entry) + "\n"
repo = pathlib.Path(os.environ.get("REPO_ROOT", ".")).resolve()
candidates = [
    repo / "deployment" / "deployment-logs" / "debug-fcc1a0.log",
    repo / ".cursor" / "debug-fcc1a0.log",
]
last_err = None
for p in candidates:
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("a") as f:
            f.write(line)
        last_err = None
        break
    except OSError as e:
        last_err = e
if last_err is not None:
    print(f"agent_dbg_log: could not write NDJSON: {last_err}", file=sys.stderr)
PY
  unset AGENT_HYP AGENT_MSG AGENT_JSON_PAYLOAD
}
# #endregion

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

log "STEP 1 — Build (optional local validation)"
if command -v docker >/dev/null 2>&1; then
  docker build -t safepsy-chatbot:local "${REPO_ROOT}/apps/ai-chatbot" || log "Local docker build skipped or failed (non-fatal)"
else
  log "docker not installed locally; build will happen on ${CHATBOT_HOST}"
fi

log "STEP 2 — Terraform (infra/terraform/envs/prod)"
if ! command -v terraform >/dev/null 2>&1; then
  die "terraform not found in PATH"
fi
# Credentials: (1) export TF_VAR_scaleway_* or TF_VAR_access_key / TF_VAR_secret_key / TF_VAR_project_id, OR
# (2) place infra/terraform/envs/prod/terraform.tfvars (gitignored) with scaleway_* — Terraform loads it automatically.
export TF_VAR_scaleway_access_key="${TF_VAR_scaleway_access_key:-${TF_VAR_access_key:-}}"
export TF_VAR_scaleway_secret_key="${TF_VAR_scaleway_secret_key:-${TF_VAR_secret_key:-}}"
export TF_VAR_scaleway_project_id="${TF_VAR_scaleway_project_id:-${TF_VAR_project_id:-}}"
_tfvars="${TF_DIR}/terraform.tfvars"
if [[ -z "${TF_VAR_scaleway_access_key:-}" || -z "${TF_VAR_scaleway_secret_key:-}" || -z "${TF_VAR_scaleway_project_id:-}" ]]; then
  if [[ -f "${_tfvars}" ]]; then
    log "Using Scaleway credentials from ${_tfvars} (TF_VAR_* not all set)."
  else
    die "Set Scaleway credentials: export TF_VAR_scaleway_access_key, TF_VAR_scaleway_secret_key, TF_VAR_scaleway_project_id (or TF_VAR_access_key, TF_VAR_secret_key, TF_VAR_project_id), OR create ${_tfvars} from terraform.tfvars.example."
  fi
fi
(
  cd "${TF_DIR}"
  terraform init -backend=false
  terraform apply -auto-approve -input=false
)

CHATBOT_PRIVATE_IP="$(cd "${TF_DIR}" && terraform output -raw chatbot_private_ip)"
[[ -n "${CHATBOT_PRIVATE_IP}" ]] || die "terraform output chatbot_private_ip empty"
APP_TF_PUBLIC_IP="$(cd "${TF_DIR}" && terraform output -raw app_public_ip 2>/dev/null || echo "")"

# #region agent log
_key_set="false"
[[ -n "${SSH_KEY}" ]] && _key_set="true"
_match_tf="false"
[[ -n "${APP_TF_PUBLIC_IP}" && "${APP_HOST}" == "${APP_TF_PUBLIC_IP}" ]] && _match_tf="true"
agent_dbg_log H5 "post_terraform_hosts" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\",\"chatbot_private_ip\":\"${CHATBOT_PRIVATE_IP}\",\"app_public_ip_tf\":\"${APP_TF_PUBLIC_IP}\",\"app_host_matches_tf\":${_match_tf},\"SSH_CONNECT_TIMEOUT\":${SSH_CONNECT_TIMEOUT},\"ssh_key_path_set\":\"${_key_set}\"}"
log "Debug NDJSON (session fcc1a0): ${_AGENT_DEBUG_LOG_FALLBACK} (fallback) / ${_AGENT_DEBUG_LOG_PRIMARY} (optional)"
# #endregion

# Prefer dedicated chatbot VM. If SSH (or routing) to it fails, colocate chatbot on the app server so
# deploy-app.sh can use SINGLE_HOST + host.docker.internal (avoids broken app↔chatbot public paths).
COLOCATE_CHATBOT_ON_APP=0
_ts0="$(python3 -c 'import time; print(int(time.time()*1000))')"
set +e
ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "exit" >/dev/null 2>&1
CHATBOT_SSH_RC=$?
set -e
_ts1="$(python3 -c 'import time; print(int(time.time()*1000))')"
CHATBOT_SSH_MS=$((_ts1 - _ts0))
# #region agent log
agent_dbg_log H1 "chatbot_ssh_probe" "{\"host\":\"${CHATBOT_HOST}\",\"exitCode\":${CHATBOT_SSH_RC},\"durationMs\":${CHATBOT_SSH_MS}}"
# #endregion
if [[ "${CHATBOT_SSH_RC}" -eq 0 ]]; then
  log "STEP 3 — Sync repo slice and start chatbot compose on ${CHATBOT_HOST}"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"

  run_ssh "${CHATBOT_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"

  log "STEP 4 — Verify chatbot /health (local curl and/or on-host curl)"
  ok=0
  for i in 1 2 3 4 5 6 7 8 9 10; do
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
  [[ "${ok}" -eq 1 ]] || die "Chatbot health check failed on ${CHATBOT_HOST} (public :8000 and on-host loopback)"
else
  COLOCATE_CHATBOT_ON_APP=1
  log "WARN — Cannot SSH to chatbot host ${CHATBOT_HOST} (timeout/refused). Colocating chatbot on app server ${APP_HOST}."
  # #region agent log
  agent_dbg_log H2 "colocate_branch_selected" "{\"reason\":\"chatbot_ssh_nonzero\",\"chatbotSshExitCode\":${CHATBOT_SSH_RC}}"
  _outbound_pub=""
  _outbound_pub="$( (curl -4 -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "") | tr -d '\n\r' )"
  agent_dbg_log H6 "client_outbound_ipv4_hint" "{\"ifconfig_or_ipify\":\"${_outbound_pub}\"}"
  log "Hint — allow Scaleway inbound TCP/22 to app + chatbot from this machine's public IPv4 (detected): ${_outbound_pub:-<unknown — check https://ifconfig.me>}"
  _ts2="$(python3 -c 'import time; print(int(time.time()*1000))')"
  set +e
  ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "exit" >/dev/null 2>&1
  APP_PREFLIGHT_SSH_RC=$?
  set -e
  _ts3="$(python3 -c 'import time; print(int(time.time()*1000))')"
  APP_PREFLIGHT_MS=$((_ts3 - _ts2))
  agent_dbg_log H2 "app_ssh_preflight_before_tar" "{\"host\":\"${APP_HOST}\",\"exitCode\":${APP_PREFLIGHT_SSH_RC},\"durationMs\":${APP_PREFLIGHT_MS}}"
  # #endregion
  [[ "${APP_PREFLIGHT_SSH_RC}" -eq 0 ]] || die "Cannot SSH to app host ${APP_HOST} for colocated chatbot (ssh exit ${APP_PREFLIGHT_SSH_RC}, ${APP_PREFLIGHT_MS} ms). Check Scaleway: inbound TCP 22 from your public IP (see Hint line above) on the app instance security group; confirm APP_HOST matches terraform app_public_ip (${APP_TF_PUBLIC_IP:-unknown}). NDJSON: ${_AGENT_DEBUG_LOG_FALLBACK} (and ${_AGENT_DEBUG_LOG_PRIMARY} if writable)"
  log "STEP 3b — Sync chatbot compose to ${APP_HOST} and start it"
  # #region agent log
  agent_dbg_log H2 "app_colocate_tar_ssh_start" "{\"host\":\"${APP_HOST}\"}"
  # #endregion
  set +e
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"
  _TAR_PIPE_RC=$?
  _PS0="${PIPESTATUS[0]}"
  _PS1="${PIPESTATUS[1]}"
  set -e
  # #region agent log
  agent_dbg_log H2 "app_colocate_tar_ssh_done" "{\"pipeOverallExit\":${_TAR_PIPE_RC},\"pipeStatus_tar\":${_PS0},\"pipeStatus_ssh\":${_PS1}}"
  # #endregion
  [[ "${_TAR_PIPE_RC}" -eq 0 && "${_PS0}" -eq 0 && "${_PS1}" -eq 0 ]] || die "SSH/tar to app host ${APP_HOST} failed (tar=${_PS0} ssh=${_PS1}). Allow TCP 22 from this network to the app instance security group, or set APP_HOST to the current app public IP from Scaleway."

  run_ssh "${APP_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"

  log "STEP 4b — Verify colocated chatbot /health on app host (loopback)"
  ok=0
  for i in $(seq 1 36); do
    if ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 5
  done
  [[ "${ok}" -eq 1 ]] || die "Colocated chatbot health check failed on ${APP_HOST} (http://127.0.0.1:8000/health)"
fi

log "STEP 5 — App stack (deploy-app.sh with SKIP_VLLM_DEPLOY + chatbot URL)"
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
exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
