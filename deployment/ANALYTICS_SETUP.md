# Analytics System Setup Guide

This document describes how to set up and deploy the privacy-first analytics system for SafePsy.

## Overview

The analytics system consists of:

1. **Frontend SDK** (`apps/web/src/lib/analytics.ts`) - Client-side event tracking
2. **Backend API** (`apps/api/src/routes/analytics.ts`) - Event ingestion endpoint
3. **Dashboard API** (`apps/api/src/routes/analytics-dashboard.ts`) - Metrics queries
4. **Database Schema** (`apps/api/schema.prisma`) - Event storage

## Database Setup

### Option 1: Automatic Migration (when database is running)

```bash
cd apps/api
export DATABASE_URL="postgresql://safepsy_user:safepsy_dev_password@localhost:5432/safepsy_dev"
npx prisma migrate dev --name add_analytics_events
```

### Option 2: Manual Migration (SQL file already created)

A manual migration SQL file has been created at:
`apps/api/prisma/migrations/20260525_add_analytics_events/migration.sql`

Apply it directly:
```bash
psql -h localhost -U safepsy_user -d safepsy_dev -f apps/api/prisma/migrations/20260525_add_analytics_events/migration.sql
```

### Option 3: Fresh Migration (recommended for clean dev setup)

```bash
cd apps/api
export DATABASE_URL="postgresql://safepsy_user:safepsy_dev_password@localhost:5432/safepsy_dev"

# Remove the manual migration
rm -rf apps/api/prisma/migrations/20260525_add_analytics_events

# Generate fresh migration
npx prisma migrate dev --name add_analytics_events
```

This creates the `analytics_events` table with the following schema:

```prisma
model AnalyticsEvent {
  id          String   @id @default(cuid())
  eventName   String
  visitorId   String?
  sessionId   String?
  walletHash  String?
  timestamp   DateTime @default(now())
  pageUrl     String?
  referrer    String?
  userAgent   String?
  deviceType  String?
  country     String?
  metadata    String?  // JSONB - sanitized metadata only

  @@index([eventName])
  @@index([visitorId])
  @@index([timestamp])
  @@index([sessionId])
  @@index([walletHash])
  @@map("analytics_events")
}
```

### 2. Verify Table Creation

```bash
npx prisma studio
```

Check that the `AnalyticsEvent` model appears and is accessible.

## Environment Variables

No additional environment variables are required for basic analytics. The system uses:

- `DATABASE_URL` - PostgreSQL connection string (already configured)
- `IP_SALT` - For IP hashing (already configured for other features)

## Frontend Integration

### 1. Import Analytics SDK

```typescript
import { analytics, trackEvent } from './lib/analytics';
```

### 2. Initialize on App Mount

Already done in `apps/web/src/App.tsx`:

```typescript
useEffect(() => {
  void analytics.trackLandingVisit();
}, []);
```

### 3. Track Custom Events

```typescript
await trackEvent('wallet_click', {
  wallet_provider: 'metamask',
});
```

### 4. Handle Consent

The system respects the existing cookie consent:

```typescript
import { hasAnalyticsConsent } from './lib/analytics-consent';

if (hasAnalyticsConsent()) {
  // Track events
}
```

## Backend Integration

### 1. Event Ingestion

POST `/api/analytics/event`

Body (single event):
```json
{
  "event_name": "wallet_success",
  "visitor_id": "uuid",
  "session_id": "uuid",
  "wallet_hash": "sha256_hash",
  "metadata": {}
}
```

Body (batch events):
```json
[
  { "event_name": "...", ... },
  { "event_name": "...", ... }
]
```

### 2. Dashboard Queries

GET `/api/analytics/dashboard/funnel?days=30`

Returns:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "landing_visits": 1000,
      "wallet_clicks": 500,
      "wallet_successes": 450,
      ...
    },
    "conversionRates": {
      "wallet_click_to_success": 0.9,
      ...
    }
  }
}
```

## Available Dashboard Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/dashboard/funnel` | Funnel metrics + conversion rates |
| `GET /api/analytics/dashboard/daily` | Daily event breakdown |
| `GET /api/analytics/dashboard/devices` | Device type distribution |
| `GET /api/analytics/dashboard/sessions` | Sessions per visitor |
| `GET /api/analytics/dashboard/wallet-providers` | Wallet provider breakdown |
| `GET /api/analytics/dashboard/dropoffs` | Funnel drop-off analysis |
| `GET /api/analytics/dashboard/retention?date=2026-05-25` | D1/D7/D30 retention |
| `GET /api/analytics/dashboard/summary` | Complete analytics summary |

## Privacy Compliance

### What is NOT Tracked

- Conversation content (messages, prompts, AI replies)
- Personal health information
- Raw wallet addresses (only SHA-256 hashes)
- Raw IP addresses
- DID private keys or secrets

### What IS Tracked

- Anonymous visitor IDs (UUIDv4)
- Session IDs (UUIDv4)
- Hashed wallet addresses (SHA-256)
- Timestamps
- Event names
- Device category (mobile/tablet/desktop)
- Coarse country (from timezone)

### GDPR Features

- Opt-in consent required
- Easy opt-out support
- 12-month visitor ID expiry
- 30-day event retention window for ingestion
- No cross-site tracking

## Security Features

- Rate limiting: 100 events/minute per IP
- Strict schema validation
- Metadata sanitization
- Max 50 events per batch
- Wallet hash format validation
- Timestamp validation (no future, max 30 days old)

## Event Types

| Event | Trigger |
|-------|---------|
| `landing_visit` | First page render |
| `wallet_click` | User clicks "Connect Wallet" |
| `wallet_success` | Wallet successfully connected |
| `session_success` | Auth session established |
| `did_success` | DID identity authenticated |
| `first_message_sent` | First user message in conversation |
| `first_reply_received` | First AI response received |
| `return_24h` | User revisits within 24h |

## Funnel Analysis

The complete user funnel:

```
Landing Visit
    ↓
Wallet Click
    ↓
Wallet Success
    ↓
Session Success
    ↓
DID Success
    ↓
First Message Sent
    ↓
First Reply Received
```

Conversion rates are calculated between each stage.

## Monitoring

### Logs

Analytics events are logged with structure:

```json
{
  "event": "analytics_batch_accepted",
  "count": 5,
  "events": ["landing_visit", "wallet_click", ...],
  "ip": "hashed_ip"
}
```

### Metrics

Prometheus metrics available at `/metrics`:

- `analytics_events_total` - Total events ingested
- `http_request_duration_seconds` - API latency
- `http_requests_total` - Request count

## Troubleshooting

### Events Not Being Sent

1. Check browser console for errors
2. Verify consent is given (`localStorage.cookieConsent`)
3. Check network tab for `/api/analytics/event` requests
4. Verify rate limiting isn't blocking requests

### Events Not Being Stored

1. Check database connection
2. Verify Prisma schema is migrated
3. Check API logs for validation errors
4. Ensure wallet_hash format is valid (64 hex chars)

### Dashboard Shows No Data

1. Verify events exist in database (`SELECT * FROM analytics_events`)
2. Check date range parameters
3. Ensure admin auth is configured for dashboard endpoints

## Future Enhancements

- [ ] Real-time event streaming (WebSocket)
- [ ] Custom event properties
- [ ] A/B test tracking
- [ ] User journey visualization
- [ ] Cohort analysis
- [ ] Export to data warehouse (BigQuery, Snowflake)
