#!/usr/bin/env bash
#
# Crisis Safety Net - Production Deployment Script
#
# Usage:
#   ./deployment/deploy-crisis-safety-net.sh [production|staging]
#
# This script:
# 1. Builds the API and web frontend with crisis detection
# 2. Runs Prisma migrations for CrisisOptIn table
# 3. Deploys via the existing deploy-app.sh script
# 4. Sets up cron job for auto-purge
# 5. Verifies deployment health
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_ENV="${1:-production}"

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

log "Starting Crisis Safety Net deployment (${DEPLOY_ENV})..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || die "docker not found"
command -v npm >/dev/null 2>&1 || die "npm not found"
command -v npx >/dev/null 2>&1 || die "npx not found"

# Verify environment variables
if [[ "${DEPLOY_ENV}" == "production" ]]; then
  [[ -n "${SCALEWAY_API_KEY:-}" ]] || die "SCALEWAY_API_KEY must be set for production"
  [[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL must be set for production"
  [[ -n "${JWT_SECRET:-}" ]] || die "JWT_SECRET must be set for production"
fi

log "Step 1: Building API..."
cd "${REPO_ROOT}"
npm run build:api || die "API build failed"

log "Step 2: Building web frontend..."
npm run build:web || die "Web build failed"

log "Step 3: Running Prisma migrations..."
cd "${REPO_ROOT}/apps/api"
npx prisma migrate deploy --schema=schema.prisma || die "Prisma migration failed"
npx prisma generate --schema=schema.prisma || die "Prisma generate failed"

log "Step 4: Deploying via main deploy script..."
cd "${REPO_ROOT}"
if [[ -x "${SCRIPT_DIR}/deploy-app.sh" ]]; then
  DEPLOY_ENV="${DEPLOY_ENV}" "${SCRIPT_DIR}/deploy-app.sh" || die "Main deployment failed"
else
  die "deploy-app.sh not found or not executable"
fi

log "Step 5: Setting up cron job for auto-purge..."
CRON_JOB="0 3 * * * cd ${REPO_ROOT} && npm run crisis:purge >> logs/crisis-purge.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "crisis:purge"; then
  log "Cron job already exists, skipping..."
else
  log "Adding cron job: ${CRON_JOB}"
  (crontab -l 2>/dev/null | grep -v "crisis:purge"; echo "${CRON_JOB}") | crontab - || log "Failed to add cron job (may need manual setup)"
fi

log "Step 6: Verifying deployment..."
sleep 10  # Wait for services to start

# Health check
HEALTH_URL="${HEALTH_CHECK_URL:-https://polinapsycho.com/api/healthz}"
if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
  log "✅ Health check passed"
else
  log "⚠️  Health check failed (may need manual verification)"
fi

# Crisis endpoints check
CRISIS_HOTLINE_URL="${HEALTH_CHECK_URL:-https://polinapsycho.com}/api/crisis/hotlines?language=en"
if curl -fsS "${CRISIS_HOTLINE_URL}" | grep -q "988 Suicide"; then
  log "✅ Crisis hotlines endpoint working"
else
  log "⚠️  Crisis hotlines check failed (may need manual verification)"
fi

log "Step 7: Running purge job test..."
cd "${REPO_ROOT}"
npm run crisis:purge || log "Purge test failed (check database connection)"

cat <<EOF

========================================
  Crisis Safety Net Deployment Complete
========================================

Environment: ${DEPLOY_ENV}
Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

Endpoints:
  - Hotlines: ${HEALTH_CHECK_URL:-https://polinapsycho.com}/api/crisis/hotlines
  - Opt-in:   ${HEALTH_CHECK_URL:-https://polinapsycho.com}/api/crisis/opt-in
  - Purge:    ${HEALTH_CHECK_URL:-https://polinapsycho.com}/api/crisis/purge

Cron Job:
  - Schedule: Daily at 3:00 AM
  - Command:  npm run crisis:purge
  - Logs:     ${REPO_ROOT}/logs/crisis-purge.log

Next Steps:
  1. Monitor opt-in rate in analytics
  2. Verify cron job runs tonight
  3. Test full user flow with real users
  4. Review privacy policy updates with legal

Documentation:
  - Implementation: documentation/public documentation/CRISIS_SAFETY_NET.md
  - Privacy Update: documentation/public documentation/PRIVACY_POLICY_CRISIS_UPDATE.md
  - Deployment:     documentation/public documentation/CRISIS_DEPLOYMENT_SUMMARY.md

Support:
  - Technical: #crisis-safety-net (Slack)
  - Privacy:   privacy@polinapsycho.com

========================================
EOF
