-- Rollback: Remove retention policy fields from encrypted_chats table
-- WARNING: This will permanently delete retentionDays and expiresAt data

-- Drop the index first
DROP INDEX IF EXISTS "encrypted_chats_expiresAt_idx";

-- Remove the columns
ALTER TABLE "encrypted_chats"
DROP COLUMN "retentionDays",
DROP COLUMN "expiresAt";
