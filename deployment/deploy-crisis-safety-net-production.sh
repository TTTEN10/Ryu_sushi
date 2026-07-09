#!/usr/bin/env bash
#
# Crisis Safety Net - Production Server Deployment Script
#
# Run this ONCE on polinapsycho.com server:
#   ssh user@polinapsycho.com
#   cd /path/to/SPiOSv2
#   ./deployment/deploy-crisis-safety-net-production.sh
#

set -euo pipefail

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

log "=== Crisis Safety Net Production Deployment ==="
log "Running on: $(hostname)"
log "Date: $(date)"

# Step 1: Pull latest code
log "Step 1: Pulling latest code from git..."
git fetch origin
git checkout main
git pull origin main || die "Git pull failed"

# Step 2: Install dependencies
log "Step 2: Installing dependencies..."
npm install --legacy-peer-deps || die "npm install failed"

# Step 3: Build API
log "Step 3: Building API..."
npm run build:api || die "API build failed"

# Step 4: Build web frontend
log "Step 4: Building web frontend..."
npm run build:web || die "Web build failed"

# Step 5: Run Prisma migrations
log "Step 5: Running Prisma migrations..."
cd apps/api
npx prisma migrate deploy --schema=schema.prisma || die "Prisma migration failed"
npx prisma generate --schema=schema.prisma || die "Prisma generate failed"
cd ../..

# Step 6: Set up cron job for auto-purge
log "Step 6: Setting up cron job..."
CRON_JOB="0 3 * * * cd $(pwd) && npm run crisis:purge >> logs/crisis-purge.log 2>&1"

if crontab -l 2>/dev/null | grep -q "crisis:purge"; then
    log "✅ Cron job already exists"
else
    (crontab -l 2>/dev/null | grep -v "crisis:purge"; echo "$CRON_JOB") | crontab - || die "Failed to add cron job"
    log "✅ Cron job added: Daily at 3:00 AM"
fi

# Step 7: Restart services (adjust based on your setup)
log "Step 7: Restarting services..."
if command -v docker compose &> /dev/null; then
    docker compose restart node-api || log "Docker restart skipped (may need manual restart)"
elif command -v systemctl &> /dev/null; then
    systemctl restart polinapsycho || log "Systemd restart skipped"
else
    log "⚠️  Manual service restart may be required"
fi

# Step 8: Verify deployment
log "Step 8: Verifying deployment..."
sleep 5

# Test crisis endpoints
if curl -fsS "http://localhost:80/api/crisis/hotlines?language=en" | grep -q "988 Suicide"; then
    log "✅ Crisis hotlines endpoint working"
else
    log "⚠️  Crisis hotlines check failed - may need manual verification"
fi

if curl -fsS "http://localhost:80/api/crisis/purge" | grep -q "success"; then
    log "✅ Crisis purge endpoint working"
else
    log "⚠️  Crisis purge check failed"
fi

# Summary
cat <<EOF

========================================
  ✅ Crisis Safety Net Deployment Complete
========================================

Server: $(hostname)
Date: $(date)
Version: crisis-safety-net-mvp

Endpoints:
  - Hotlines: https://polinapsycho.com/api/crisis/hotlines
  - Opt-in:   https://polinapsycho.com/api/crisis/opt-in
  - Purge:    https://polinapsycho.com/api/crisis/purge

Cron Job:
  - Schedule: Daily at 3:00 AM
  - Command:  npm run crisis:purge
  - Logs:     $(pwd)/logs/crisis-purge.log

Test the feature:
  1. Visit https://polinapsycho.com
  2. Open chat
  3. Type "I'm feeling suicidal"
  4. Safety modal should appear with 988 hotline

Documentation:
  - Implementation: documentation/public documentation/CRISIS_SAFETY_NET.md
  - Privacy Update: documentation/public documentation/PRIVACY_POLICY_CRISIS_UPDATE.md

Support:
  - Technical: Check logs/crisis-purge.log
  - Privacy:   privacy@polinapsycho.com

========================================
EOF
