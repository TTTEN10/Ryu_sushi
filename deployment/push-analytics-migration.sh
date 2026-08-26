#!/usr/bin/env bash
# push-analytics-migration.sh
# Standalone script to push the analytics_events table to production.
# Run on the production server (SSH required):
#   bash push-analytics-migration.sh
set -euo pipefail

cd ~/app

echo "[analytics-migration] Pushing analytics_events table to production..."

# Try prisma db push (preferred — syncs from schema)
docker compose exec -T node-api npx prisma db push \
  --schema=apps/api/schema.prisma \
  --skip-generate \
  --accept-data-loss 2>&1

echo "[analytics-migration] Schema push complete."

# Verify the table exists
TABLE_EXISTS=$(docker compose exec -T postgres psql -U safepsy_user -d safepsy_dev \
  -tAc "SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events'" 2>/dev/null || true)

if [[ "$TABLE_EXISTS" == "1" ]]; then
  echo "[analytics-migration] ✅ analytics_events table confirmed"
else
  echo "[analytics-migration] ❌ analytics_events table NOT found — running raw SQL..."
  docker compose exec -T postgres psql -U safepsy_user -d safepsy_dev \
    -f ~/app/apps/api/prisma/migrations/20260826120000_add_analytics_events/migration.sql
  echo "[analytics-migration] ✅ Table created via raw SQL"
fi

echo "[analytics-migration] Done."