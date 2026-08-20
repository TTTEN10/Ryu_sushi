-- Create enums
DO $$ BEGIN
 CREATE TYPE "public"."consenttype" AS ENUM('HEALTH_DATA_PROCESSING', 'ANALYTICS', 'MARKETING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 CREATE TYPE "public"."consentstatus" AS ENUM('GRANTED', 'WITHDRAWN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 CREATE TYPE "public"."consentsource" AS ENUM('WEB_COOKIE_BANNER', 'MOBILE', 'EMAIL_SUBSCRIPTION', 'CONTACT_FORM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create user_consents table
CREATE TABLE IF NOT EXISTS "user_consents" (
    "id" TEXT PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "consentType" "consenttype" NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentTextHash" TEXT NOT NULL,
    "status" "consentstatus" DEFAULT 'GRANTED',
    "source" "consentsource",
    "ipAddressHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "user_consents_walletAddress_consentType_consentVersion" ON "user_consents"("walletAddress", "consentType", "consentVersion");
CREATE INDEX IF NOT EXISTS "user_consents_walletAddress_consentType_idx" ON "user_consents"("walletAddress", "consentType");
CREATE INDEX IF NOT EXISTS "user_consents_status_idx" ON "user_consents"("status");
CREATE INDEX IF NOT EXISTS "user_consents_withdrawnAt_idx" ON "user_consents"("withdrawnAt");
CREATE INDEX IF NOT EXISTS "user_consents_createdAt_idx" ON "user_consents"("createdAt");