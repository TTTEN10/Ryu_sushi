#!/usr/bin/env bash
# Compatibility wrapper — use ./deployment/deploy.sh (canonical entrypoint).
#
# Usage:
#   ./deployment/deploy-safepsy.sh
#   DEPLOY_LEGACY=1 ./deployment/deploy-safepsy.sh
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/deploy.sh" "$@"
