#!/usr/bin/env bash
# Install and enable Scaleway vmagent so Cockpit / Grafana Instance dashboards
# receive host memory (and GPU, where applicable) metrics.
#
# Ref: https://www.scaleway.com/en/docs/instances/troubleshooting/filling-memory-and-gpu-metrics-on-the-cockpit-dashboard/#solution
#
# Run as root on the Scaleway Instance (local or via SSH):
#   sudo bash deployment/install-scaleway-vmagent.sh
#
# From your machine:
#   scp deployment/install-scaleway-vmagent.sh root@$INSTANCE_IP:/tmp/
#   ssh root@$INSTANCE_IP 'bash /tmp/install-scaleway-vmagent.sh'

set -euo pipefail

SERVICE_NAME="scaleway-vmagent"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (use sudo)." >&2
  exit 1
fi

if ! [[ -r /etc/os-release ]]; then
  echo "Cannot read /etc/os-release; unsupported OS." >&2
  exit 1
fi

# shellcheck source=/dev/null
source /etc/os-release

log() { printf '[install-scaleway-vmagent] %s\n' "$*"; }

ensure_vmagent_ubuntu() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq software-properties-common ca-certificates curl
  if ! grep -rq "scaleway/stable" /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null; then
    add-apt-repository -y ppa:scaleway/stable
    apt-get update -qq
  fi
  apt-get install -y -qq scaleway-vmagent
}

ensure_vmagent_rhel() {
  if ! dnf copr list --enabled 2>/dev/null | grep -q scaleway/instance; then
    dnf copr enable -y @scaleway/instance
  fi
  dnf install -y scaleway-vmagent
}

case "${ID:-}" in
  ubuntu)
    ensure_vmagent_ubuntu
    ;;
  rhel | centos | fedora | rocky | almalinux)
    ensure_vmagent_rhel
    ;;
  *)
    log "Unsupported ID=${ID}. Scaleway documents Ubuntu (PPA) and RHEL-family (COPR); see Cockpit troubleshooting doc."
    exit 1
    ;;
esac

systemctl daemon-reload 2>/dev/null || true
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

if systemctl is-active --quiet "${SERVICE_NAME}"; then
  log "${SERVICE_NAME} is active. Cockpit memory panels should populate within a few minutes."
else
  log "WARNING: ${SERVICE_NAME} is not active. Check: journalctl -u ${SERVICE_NAME} -e"
  systemctl status "${SERVICE_NAME}" --no-pager || true
  exit 1
fi

log "If this instance ran for weeks without a console/API reboot, Scaleway recommends restarting via console or API once so the VM config matches vmagent requirements."
