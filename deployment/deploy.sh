#!/usr/bin/env bash
# Canonical production deploy entrypoint.
# Full: pre-flight → Terraform (prod) → deploy-app.sh → HTTPS verify (Scaleway Generative API direct).
# App-only: DEPLOY_LEGACY=1 or no terraform.tfvars / TF_VAR_scaleway_* (auto app-only).
#
# deploy-app.sh is the app-stack implementation (Caddy + SPA + API proxy); do not fork it — call this script.
# Wrappers deploy-safepsy.sh and deploy-live-app.sh only forward here with presets.
#
# Usage:
#   ./deployment/deploy-live-app.sh          # recommended prod (see DEPLOY-RUNBOOK.md)
#   ./deployment/deploy.sh
#   USE_SCALEWAY_DIRECT=1 SCALEWAY_API_KEY=... ./deployment/deploy.sh
#   ./deployment/deploy.sh --diagnose     # pre-flight + app SSH (no separate chatbot VM)
#   DEPLOY_LEGACY=1 ./deployment/deploy.sh  # app stack only (skips Terraform)
#
# Optional env: SKIP_PREFLIGHT_GIT=1  SKIP_DNS_VALIDATION=1  REFRESH_IPS_FROM_TF=0 (default 1)  FORCE_COLOCATE_ON_ROUTING_FAIL=1
#   REFRESH_IPS_FROM_TF=0 — keep APP_HOST / CHATBOT_HOST from the environment after terraform apply (needed when
#   Terraform still models a separate chatbot IP but you deploy both stacks onto one public VIP, e.g. scw-beta-app).
#   DEPLOY_FRESH_CONTAINERS=1 — passed through to deploy-app.sh (compose build --no-cache + up --force-recreate).
#   USE_SCALEWAY_DIRECT=1 — Python proxy → Scaleway Generative API (default when unset on full deploy).
#   SSH_BOOT_WAIT_SEC=120 — after Terraform, poll sshd until banner succeeds (fresh instance start).
#   DEPLOY_SKIP_TERRAFORM=1 — skip terraform init/apply (resume after a successful apply).
#               PREFLIGHT_SSH=1  SKIP_POST_DEPLOY_VERIFY=1  CHECK_LLM=1 (post-deploy)
#               DEPLOY_RETRY_MAX=3  DEPLOY_RETRY_DELAY_SEC=2  SSH_CONNECT_TIMEOUT=12  SSH_KEY=...
#
# Success gates (all must pass unless skipped by env): preflight → Terraform → app SSH →
#   deploy-app.sh → post-deploy HTTPS checks.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export REPO_ROOT
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"
DEPLOY_LOG_DIR="${REPO_ROOT}/deployment/deployment-logs"
DEPLOY_JSONL="${DEPLOY_LOG_DIR}/deploy.jsonl"
DEBUG_NDJSON="${DEPLOY_LOG_DIR}/debug-fcc1a0.log"

APP_DOMAIN="${APP_DOMAIN:-polinapsycho.com}"
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-polinapsycho.com, www.polinapsycho.com}"
CHATBOT_HOST="${CHATBOT_HOST:-151.115.151.231}"
APP_HOST="${APP_HOST:-151.115.151.231}"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"
# When 1, deploy must NOT fail if upstream LLM checks are skipped; landing page must still go live.
ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-0}"
USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
# Scaleway Generative API (passed through to deploy-app.sh backend container)
SCALEWAY_API_KEY="${SCALEWAY_API_KEY:-}"
SCALEWAY_PROJECT_ID="${SCALEWAY_PROJECT_ID:-5dad0cb7-c16a-4447-9a25-e89bd3448e8a}"
SCALEWAY_MODEL="${SCALEWAY_MODEL:-mistral-small-3.2-24b-instruct-2506}"
SCALEWAY_API_BASE_URL="${SCALEWAY_API_BASE_URL:-}"
OUTBOUND_IP=""
DEPLOY_DIAGNOSE=0
for _arg in "$@"; do
  [[ "${_arg}" == "--diagnose" ]] && DEPLOY_DIAGNOSE=1
done

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

_has_terraform_config() {
  [[ -f "${TF_DIR}/terraform.tfvars" ]] && return 0
  [[ -n "${TF_VAR_scaleway_access_key:-}" && -n "${TF_VAR_scaleway_secret_key:-}" && -n "${TF_VAR_scaleway_project_id:-}" ]] && return 0
  return 1
}

# No prod Terraform config → app-only (same as former deploy-safepsy.sh fallback).
if [[ "${DEPLOY_FORCE_FULL:-0}" != "1" ]] && ! _has_terraform_config; then
  warn "No infra/terraform/envs/prod/terraform.tfvars or TF_VAR_scaleway_* — app-only deploy"
  warn "Set DEPLOY_FORCE_FULL=1 to require the full Terraform pipeline"
  export DEPLOY_SKIP_TERRAFORM=1
  USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-1}"
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { printf "\n[WARN] %s\n" "$*" >&2; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

# JSONL line: event + optional JSON object string (merged into .data)
log_event() {
  local event="$1"
  local meta="${2:-{}}"
  deploy_log_struct "${event}" "${meta}"
}

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

detect_outbound_ipv4() {
  OUTBOUND_IP="$( (curl -4 -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "") | tr -d '\n\r' )"
  log "[PRE-FLIGHT] OUTBOUND_IP=${OUTBOUND_IP:-unknown} (use /32 on Scaleway SG for TCP 22)"
  log_event "outbound_ip" "{\"ipv4\":\"${OUTBOUND_IP}\"}"
  agent_dbg_log H6 "client_outbound_ipv4_hint" "{\"ifconfig_or_ipify\":\"${OUTBOUND_IP}\"}"
}

check_git_sync() {
  if [[ "${SKIP_PREFLIGHT_GIT:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] SKIP_PREFLIGHT_GIT=1 — skipping origin/main sync check"
    log_event "preflight_git_skipped" "{}"
    return 0
  fi
  if [[ ! -d "${REPO_ROOT}/.git" ]]; then
    log "[PRE-FLIGHT] Not a git checkout — skipping origin/main sync check"
    return 0
  fi
  cd "${REPO_ROOT}"
  local local_h remote_h
  local_h="$(git rev-parse HEAD)"
  remote_h="$(git ls-remote origin refs/heads/main 2>/dev/null | awk '{print $1}' | head -1)"
  [[ -n "${remote_h}" ]] || die "[PRE-FLIGHT] git ls-remote origin main failed (network?). Fix network or set SKIP_PREFLIGHT_GIT=1"
  if [[ "${local_h}" != "${remote_h}" ]]; then
    die "[PRE-FLIGHT] Local HEAD != origin/main (local=${local_h:0:12}… remote=${remote_h:0:12}…). Run: git pull origin main && git push if needed"
  fi
  log "[PRE-FLIGHT] Git OK — HEAD matches origin/main (${local_h:0:12}…)"
  log_event "preflight_git_ok" "{\"head\":\"${local_h:0:12}\"}"
}

check_tf_sanity() {
  if ! command -v terraform >/dev/null 2>&1; then
    die "[PRE-FLIGHT] terraform not found in PATH"
  fi
  (
    cd "${TF_DIR}"
    terraform init -backend=false >/dev/null
    terraform validate
  ) || die "[PRE-FLIGHT] terraform validate failed in ${TF_DIR}"
  log "[PRE-FLIGHT] terraform validate OK (${TF_DIR})"
  log_event "preflight_terraform_validate_ok" "{\"dir\":\"${TF_DIR}\"}"
}

validate_credentials() {
  local tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -f "${tfvars}" ]]; then
    if [[ -n "${TF_VAR_access_key:-}" || -n "${TF_VAR_scaleway_access_key:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*access_key is set. Use only terraform.tfvars OR only TF_VAR_*, not both."
    fi
    if [[ -n "${TF_VAR_secret_key:-}" || -n "${TF_VAR_scaleway_secret_key:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*secret_key is set."
    fi
    if [[ -n "${TF_VAR_project_id:-}" || -n "${TF_VAR_scaleway_project_id:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*project_id is set."
    fi
  fi
  if [[ -n "${SCW_ACCESS_KEY:-}" ]] && [[ -f "${HOME}/.config/scw/config.yaml" ]]; then
    warn "[PRE-FLIGHT] SCW_ACCESS_KEY is set and ~/.config/scw/config.yaml exists — Terraform may warn about multiple credential sources (see deployment/deploy-issue.md §7)."
    log_event "preflight_scw_warning" "{\"note\":\"multiple_scw_sources_possible\"}"
  fi
}

# Apex / www must not expose the chatbot IP on the public site name.
# IMPORTANT: query authoritative NS (e.g. Scaleway ns0.dom.scw.cloud), not the resolver default —
# recursive caches often still return a *stale* second A (old chatbot) after the zone was fixed.
validate_dns_mode() {
  [[ "${SKIP_DNS_VALIDATION:-0}" == "1" ]] && return 0
  if ! command -v dig >/dev/null 2>&1; then
    die "[PRE-FLIGHT] dig(1) not found; install bind-tools / dnsutils for DNS validation."
  fi
  # App and chatbot share one public VIP (e.g. scw-beta-app): apex A → that IP is correct; do not apply the split-host rule.
  if [[ -n "${APP_HOST:-}" && -n "${CHATBOT_HOST:-}" && "${CHATBOT_HOST}" == "${APP_HOST}" ]]; then
    log "[PRE-FLIGHT] DNS OK (single public IP: APP_HOST==CHATBOT_HOST==${CHATBOT_HOST})"
    log_event "preflight_dns_ok_single_vip" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\",\"ip\":\"${CHATBOT_HOST}\"}"
    return 0
  fi
  local ns_list ns name combined ipv4
  ns_list="$(dig +short "${APP_DOMAIN}" NS 2>/dev/null | tr -d '\r' | sed 's/\.$//' | grep -E '^[a-zA-Z0-9.-]+\.[a-zA-Z]' || true)"
  if [[ -z "${ns_list}" ]]; then
    die "[PRE-FLIGHT] DNS: could not read NS records for ${APP_DOMAIN}. Fix delegation or tooling."
  fi
  for name in "${APP_DOMAIN}" "www.${APP_DOMAIN}"; do
    [[ "${name}" == www.* ]] && ! [[ "${CADDY_SITE_NAMES}" == *"www."* ]] && continue
    combined=""
    while IFS= read -r ns; do
      [[ -z "${ns}" ]] && continue
      combined+="$(dig +short "${name}" A @"${ns}" 2>/dev/null | tr -d '\r')"$'\n'
    done <<< "${ns_list}"
    # Keep dotted-quad lines only (drops stray CNAME text if present)
    ipv4="$(printf '%s\n' "${combined}" | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | sort -u)"
    [[ -z "${ipv4}" ]] && continue
    if printf '%s\n' "${ipv4}" | grep -qxF "${CHATBOT_HOST}"; then
      die "[PRE-FLIGHT] DNS misconfigured (authoritative zone): name ${name} resolves to chatbot IP ${CHATBOT_HOST}. Apex/www must point only at the app (Caddy) host, not the LLM VM."
    fi
  done
  log "[PRE-FLIGHT] DNS OK (authoritative NS for ${APP_DOMAIN}: no A record → chatbot ${CHATBOT_HOST})"
  log_event "preflight_dns_ok" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\",\"CHATBOT_HOST\":\"${CHATBOT_HOST}\"}"
}

run_preflight() {
  log "PRE-FLIGHT START (before Terraform)"
  log_event "preflight_start" "{}"
  cd "${REPO_ROOT}"
  check_git_sync
  detect_outbound_ipv4
  validate_credentials
  export TF_VAR_scaleway_access_key="${TF_VAR_scaleway_access_key:-${TF_VAR_access_key:-}}"
  export TF_VAR_scaleway_secret_key="${TF_VAR_scaleway_secret_key:-${TF_VAR_secret_key:-}}"
  export TF_VAR_scaleway_project_id="${TF_VAR_scaleway_project_id:-${TF_VAR_project_id:-}}"
  local _tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -z "${TF_VAR_scaleway_access_key:-}" || -z "${TF_VAR_scaleway_secret_key:-}" || -z "${TF_VAR_scaleway_project_id:-}" ]]; then
    if [[ -f "${_tfvars}" ]]; then
      log "[PRE-FLIGHT] Using Scaleway credentials from ${_tfvars} (TF_VAR_* not all set)."
    else
      die "[PRE-FLIGHT] Missing Scaleway credentials: set TF_VAR_scaleway_* or create ${_tfvars}"
    fi
  fi
  check_tf_sanity
  validate_dns_mode
  if [[ "${PREFLIGHT_SSH:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] PREFLIGHT_SSH=1 — probing SSH to app (${APP_HOST}) before Terraform"
    ssh_probe "app" "${APP_HOST}" || die "[PRE-FLIGHT] App SSH failed. Outbound: ${OUTBOUND_IP:-unknown}"
  fi
  log_event "preflight_done" "{}"
  log "PRE-FLIGHT OK"
}

ssh_failure_banner() {
  local role="$1" host="$2"
  local tcp22_open=0
  if command -v nc >/dev/null 2>&1 && nc -z -w 4 "${host}" 22 2>/dev/null; then
    tcp22_open=1
  fi
  printf '\n[SSH FAILURE]\n' >&2
  printf '  Target: %s (%s)\n' "${role}" "${host}" >&2
  if [[ "${tcp22_open}" -eq 1 ]]; then
    printf '  Cause:   TCP/22 is open but sshd did not complete the SSH banner (sshd hung, still booting, or wrong service on 22)\n' >&2
    printf '  Action:  Scaleway console → Instance → Open console (or rescue). On the VM run:\n' >&2
    printf '             systemctl status ssh || systemctl status sshd\n' >&2
    printf '             systemctl restart ssh || systemctl restart sshd\n' >&2
    printf '             journalctl -u ssh -n 40 --no-pager || journalctl -u sshd -n 40 --no-pager\n' >&2
    printf '           Then retry: ssh -o ConnectTimeout=20 root@%s\n' "${host}" >&2
    printf '  Note:     Security group rules may already be correct (0.0.0.0/0 on 22 is enough).\n' >&2
  else
    printf '  Cause:   TCP 22 not reachable (security group not attached, instance down, or wrong IP)\n' >&2
    printf '  Action:  In Scaleway, attach the SG to this instance NIC and allow inbound TCP/22 from your IP /32\n' >&2
  fi
  printf '  Hint:    OUTBOUND_IP=%s\n' "${OUTBOUND_IP:-unknown}" >&2
  printf '  (If you saw tar|ssh Write error, the SSH leg failed — same fix.)\n\n' >&2
}

# One SSH attempt (echo ok). Use retry() wrapper for gates.
_ssh_probe_once() {
  local host="$1"
  ssh "${SSH_OPTS[@]}" "root@${host}" "echo ok" >/dev/null 2>&1
}

# Poll until sshd completes banner exchange (common right after instance start).
wait_for_ssh_ready() {
  local host="$1"
  local max_wait="${SSH_BOOT_WAIT_SEC:-0}"
  [[ "${max_wait}" -gt 0 ]] || return 0
  local elapsed=0 step=5
  log "[SSH WAIT] Up to ${max_wait}s for sshd on ${host} (post-boot / banner)"
  log_event "ssh_boot_wait_start" "{\"host\":\"${host}\",\"max_wait_sec\":${max_wait}}"
  while [[ "${elapsed}" -lt "${max_wait}" ]]; do
    if _ssh_probe_once "${host}"; then
      log "[SSH WAIT] sshd ready (~${elapsed}s)"
      log_event "ssh_boot_wait_ok" "{\"host\":\"${host}\",\"elapsed_sec\":${elapsed}}"
      return 0
    fi
    sleep "${step}"
    elapsed=$((elapsed + step))
  done
  log_event "ssh_boot_wait_timeout" "{\"host\":\"${host}\",\"max_wait_sec\":${max_wait}}"
  return 1
}

# 4GB instances: swap avoids OOM killing sshd during parallel Docker builds + HF model load.
ensure_host_swap() {
  local host="$1"
  local size_gb="${DEPLOY_SWAP_GB:-4}"
  log "[SWAP] Ensuring ${size_gb}G swap on ${host} (DEV1-M OOM guard)"
  ssh "${SSH_OPTS[@]}" "root@${host}" "bash -s" -- "${size_gb}" <<'EOS' || warn "[SWAP] setup failed on ${host} — continuing"
set -euo pipefail
size_gb="${1:-4}"
if grep -qE '^/swapfile[[:space:]]' /proc/swaps 2>/dev/null; then
  echo "[swap] already active"
  exit 0
fi
if [[ ! -f /swapfile ]]; then
  fallocate -l "${size_gb}G" /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=$((size_gb * 1024)) status=progress
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon /swapfile 2>/dev/null || true
grep -qE '^/swapfile[[:space:]]' /etc/fstab 2>/dev/null || echo '/swapfile none swap sw 0 0' >> /etc/fstab
swapon --show
EOS
}

ssh_probe() {
  local name="$1"
  local host="$2"
  log "[SSH CHECK] → ${name} (${host})"
  log_event "ssh_probe_start" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  if retry _ssh_probe_once "${host}"; then
    agent_dbg_log "SSH" "ssh_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    log_event "ssh_probe_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    return 0
  fi
  ssh_failure_banner "${name}" "${host}"
  agent_dbg_log "SSH" "ssh_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  log_event "ssh_probe_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
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
  log_event "hosts_from_tf" "{\"APP_HOST\":\"${APP_HOST}\",\"CHATBOT_HOST\":\"${CHATBOT_HOST}\"}"
}

log_terraform_outputs_to_jsonl() {
  export TF_OUT="${DEPLOY_LOG_DIR}/tf-output.json"
  export DJSONL="${DEPLOY_JSONL}"
  [[ -f "${TF_OUT}" ]] || return 0
  python3 <<'PY' || true
import json, pathlib, os, time
p = pathlib.Path(os.environ["TF_OUT"])
if not p.is_file():
    raise SystemExit(0)
d = json.loads(p.read_text())
summary = {k: (d.get(k) or {}).get("value") for k in ("app_public_ip", "app_private_ip", "chatbot_public_ip", "chatbot_private_ip")}
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "event": "terraform_outputs", "data": summary}
logp = pathlib.Path(os.environ["DJSONL"])
logp.parent.mkdir(parents=True, exist_ok=True)
with logp.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
  unset TF_OUT DJSONL
}

post_deploy_verify() {
  if [[ "${SKIP_POST_DEPLOY_VERIFY:-0}" == "1" ]]; then
    warn "SKIP_POST_DEPLOY_VERIFY=1 — skipping HTTPS API checks"
    log_event "post_deploy_verify_skipped" "{}"
    return 0
  fi
  log "POST-DEPLOY VERIFY (public HTTPS)"
  curl -fsS --max-time 25 "https://${APP_DOMAIN}/api/healthz" >/dev/null \
    || die "post-deploy: https://${APP_DOMAIN}/api/healthz failed"
  curl -fsS --max-time 25 "https://${APP_DOMAIN}/api/v1/models" >/dev/null \
    || die "post-deploy: https://${APP_DOMAIN}/api/v1/models failed"
  log_event "post_deploy_verify_ok" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\"}"
  if [[ "${CHECK_LLM:-0}" == "1" ]]; then
    log "CHECK_LLM=1 — running deployment/verify-production.sh (chat completions probe)"
    CHECK_LLM=1 USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT:-0}" APP_DOMAIN="${APP_DOMAIN}" APP_IP="${APP_HOST}" \
      bash "${SCRIPT_DIR}/verify-production.sh" || die "post-deploy: verify-production.sh CHECK_LLM failed"
  fi
  log "POST-DEPLOY VERIFY OK"
}

# ========== --diagnose (preflight + app SSH; no Terraform / no image deploy) ==========
if [[ "${DEPLOY_DIAGNOSE}" == "1" ]]; then
  log "[DIAGNOSE] Preflight + app SSH (no Terraform apply, no stack deploy)"
  run_preflight
  ssh_probe "app" "${APP_HOST}" || exit 1
  log "[DIAGNOSE] LLM: Scaleway Generative API direct (no FastAPI chatbot VM)"
  log "[DIAGNOSE] Done."
  exit 0
fi

# ========== PRE-FLIGHT (mandatory, before Terraform) ==========
run_preflight

# ========== Terraform apply ==========
if [[ "${DEPLOY_SKIP_TERRAFORM:-0}" == "1" ]]; then
  log "STEP 2 — DEPLOY_SKIP_TERRAFORM=1 (using existing Terraform state / outputs)"
  log_event "terraform_apply_skipped" "{}"
else
  log "STEP 2 — Terraform apply (${TF_DIR})"
  (
    cd "${TF_DIR}"
    terraform init -backend=false
    terraform apply -auto-approve -input=false
  ) || die "terraform apply failed"
fi

mkdir -p "${DEPLOY_LOG_DIR}" 2>/dev/null || true
(cd "${TF_DIR}" && terraform output -json > "${DEPLOY_LOG_DIR}/tf-output.json") 2>/dev/null || true
log_event "terraform_output_json" "{\"path\":\"${DEPLOY_LOG_DIR}/tf-output.json\"}"
log_terraform_outputs_to_jsonl

APP_TF_PUBLIC_IP="$(cd "${TF_DIR}" && terraform output -raw app_public_ip 2>/dev/null || echo "")"
refresh_hosts_from_terraform
validate_dns_mode

_key_set="false"
[[ -n "${SSH_KEY}" ]] && _key_set="true"
_match_tf="false"
[[ -n "${APP_TF_PUBLIC_IP}" && "${APP_HOST}" == "${APP_TF_PUBLIC_IP}" ]] && _match_tf="true"
agent_dbg_log H5 "post_terraform_hosts" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\",\"app_public_ip_tf\":\"${APP_TF_PUBLIC_IP}\",\"app_host_matches_tf\":${_match_tf},\"SSH_CONNECT_TIMEOUT\":${SSH_CONNECT_TIMEOUT},\"ssh_key_path_set\":\"${_key_set}\"}"
log "Debug NDJSON: ${DEBUG_NDJSON}"
log_event "terraform_apply_done" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\"}"

# App SSH is mandatory (hard stop before tar|ssh)
if [[ "${SSH_BOOT_WAIT_SEC:-0}" -gt 0 ]]; then
  wait_for_ssh_ready "${APP_HOST}" || warn "SSH_BOOT_WAIT_SEC exhausted; trying ssh_probe retries anyway"
fi
ssh_probe "app" "${APP_HOST}" || die "Cannot deploy: app host SSH failed."

log "STEP 3 — App stack (deploy-app.sh, Scaleway Generative API direct)"
wait_for_ssh_ready "${APP_HOST}" || warn "SSH wait before deploy-app exhausted; deploy-app will retry"
ensure_host_swap "${APP_HOST}" || true
export APP_DOMAIN
export CADDY_SITE_NAMES
export APP_IP="${APP_HOST}"
export SKIP_VLLM_DEPLOY=1
export USE_SCALEWAY_DIRECT="${USE_SCALEWAY_DIRECT}"
export SKIP_CHATBOT_DEPLOY=1
export SCALEWAY_API_KEY SCALEWAY_PROJECT_ID SCALEWAY_MODEL SCALEWAY_API_BASE_URL
export MODEL_API_URL_FOR_COMPOSE=""
export MODEL_API_URL_ALT_FOR_COMPOSE=""
export SINGLE_HOST=1
export API_IP="${APP_HOST}"
export ALLOW_DEGRADED_CHATBOT
export DEPLOY_FRESH_CONTAINERS="${DEPLOY_FRESH_CONTAINERS:-0}"
log_event "exec_deploy_app" "{\"SINGLE_HOST\":1,\"USE_SCALEWAY_DIRECT\":\"${USE_SCALEWAY_DIRECT}\",\"DEPLOY_FRESH_CONTAINERS\":\"${DEPLOY_FRESH_CONTAINERS}\"}"
export OUTBOUND_IP
export SSH_BOOT_WAIT_SEC="${SSH_BOOT_WAIT_SEC:-180}"
_deploy_app_rc=0
"${SCRIPT_DIR}/deploy-app.sh" "$@" || _deploy_app_rc=$?
[[ "${_deploy_app_rc}" -eq 0 ]] || die "deploy-app.sh failed — app stack not fully updated (inspect SSH host ${APP_HOST})"
post_deploy_verify
log "DEPLOY SUCCESS — app SSH, sync, compose, /health gates, deploy-app, and post-deploy HTTPS checks passed."
exit 0
