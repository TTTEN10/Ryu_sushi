#!/usr/bin/env bash
# Removed — use ./deployment/deploy.sh (replaced this script in 2025).
#
# Migration:
#   ./deployment/deploy.sh
#   DEPLOY_LEGACY=1 ./deployment/deploy.sh          # app stack only
#   USE_SCALEWAY_DIRECT=1 ./deployment/deploy.sh    # Scaleway direct (no chatbot VM)
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
printf '\n[WARN] deploy-instance-aware-roadmap.sh is deprecated. Forwarding to deploy.sh\n\n' >&2
exec "${SCRIPT_DIR}/deploy.sh" "$@"
