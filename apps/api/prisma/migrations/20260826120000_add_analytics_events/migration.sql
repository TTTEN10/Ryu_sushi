-- Create analytics_events table for privacy-first analytics system
CREATE TABLE IF NOT EXISTS "analytics_events" (
  id            TEXT         PRIMARY KEY DEFAULT gen_random_text_uuid(),
  eventName     TEXT         NOT NULL,
  visitorId     TEXT,
  sessionId     TEXT,
  walletHash    TEXT,
  timestamp     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  pageUrl       TEXT,
  referrer      TEXT,
  userAgent     TEXT,
  deviceType    TEXT,
  country       TEXT,
  metadata      TEXT
);

CREATE INDEX IF NOT EXISTS "idx_analytics_events_event_name_timestamp" ON "analytics_events" ("eventName", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_wallet_hash_timestamp" ON "analytics_events" ("walletHash", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_analytics_events_timestamp" ON "analytics_events" ("timestamp");

COMMENT ON TABLE "analytics_events" IS 'Privacy-first analytics events — NEVER stores conversation content, PII, raw wallet addresses, or raw IPs';
