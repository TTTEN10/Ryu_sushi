# Migration: Add Retention Policy to Encrypted Chats

**Date:** 2026-06-14  
**Migration ID:** 20260614175200_add_retention_policy_to_encrypted_chats

## Summary

Adds time-based retention policy fields to the `encrypted_chats` table, enabling automatic cleanup of expired chat data.

## Changes

### New Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `retentionDays` | INTEGER | YES | NULL | Number of days to retain chat (null = indefinite) |
| `expiresAt` | TIMESTAMP(3) | YES | NULL | Calculated expiration timestamp |

### New Indexes

| Index Name | Column(s) | Type |
|------------|-----------|------|
| `encrypted_chats_expiresAt_idx` | `expiresAt` | B-tree |

## Why

This migration enables:
1. **Automated cleanup** - Cleanup job can delete expired chats
2. **Compliance** - Supports GDPR right to erasure, data minimization
3. **User choice** - Users can set custom retention periods
4. **Audit trail** - Expiration tracked in database

## Rollback

To rollback this migration:

```bash
# Connect to database
psql -h localhost -U safepsy_user -d safepsy_dev

# Run rollback script
\i /Users/thibauttenenbaum/Desktop/SP/SPiOSv2/apps/api/prisma/migrations/20260614175200_add_retention_policy_to_encrypted_chats/rollback.sql
```

**WARNING:** Rollback will permanently delete the `retentionDays` and `expiresAt` columns and all data in them.

## Testing

### Before Migration

```bash
# Check current schema
psql -h localhost -U safepsy_user -d safepsy_dev -c "\d encrypted_chats"
```

### After Migration

```bash
# Verify new columns exist
psql -h localhost -U safepsy_user -d safepsy_dev -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'encrypted_chats' AND column_name IN ('retentionDays', 'expiresAt');"

# Verify index exists
psql -h localhost -U safepsy_user -d safepsy_dev -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'encrypted_chats' AND indexdef LIKE '%expiresAt%';"
```

### Test Data

```sql
-- Test setting retention policy
UPDATE encrypted_chats 
SET retentionDays = 30, 
    expiresAt = NOW() + INTERVAL '30 days'
WHERE wallet_address = '0x...';

-- Test cleanup query (find expired chats)
SELECT wallet_address, retentionDays, expiresAt 
FROM encrypted_chats 
WHERE expiresAt < NOW();
```

## Deployment

### Development

```bash
cd apps/api
npx prisma migrate deploy
```

### Staging/Production

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Deploy migration
npx prisma migrate deploy

# Verify
npx prisma db pull
```

## Related Files

- Schema: `apps/api/schema.prisma`
- Cleanup job: `apps/api/src/lib/cleanup-job.ts`
- Admin endpoints: `apps/api/src/routes/admin.ts`
- Tests: `apps/api/src/__tests__/cleanup-job.test.ts`

## Monitoring

After deployment, monitor:
- Index creation time (should be fast for small tables)
- Query performance on `expiresAt` column
- Cleanup job execution time

## Rollback Decision Tree

**Do NOT rollback if:**
- Cleanup job has already run (data may be deleted)
- Admin endpoints are in use
- Users have set retention policies

**Safe to rollback if:**
- Migration was just applied
- No data has been populated in new columns
- No cleanup jobs have run
