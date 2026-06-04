# SafePsy Privacy-First Analytics System

## Implementation Complete

A comprehensive privacy-first analytics system has been implemented for SafePsy, an AI therapy SaaS with anonymous mode and wallet/DID authentication.

## Quick Start

### 1. Run Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_analytics_events
npx prisma generate
```

### 2. Verify Setup

```bash
# Start the API server
npm run dev:api

# Test event ingestion
curl -X POST http://localhost:3001/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "landing_visit",
    "visitor_id": "'$(uuidgen)'",
    "session_id": "'$(uuidgen)'",
    "metadata": {"landing_page": "/"}
  }'
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Frontend (React App)            │
│  ┌──────────────────────────────────┐   │
│  │  Analytics SDK                   │   │
│  │  - Visitor/Session IDs           │   │
│  │  - Event Queue + Retry           │   │
│  │  - Deduplication                 │   │
│  └──────────────────────────────────┘   │
│              │                          │
│              │ POST /api/analytics/event│
└──────────────┼──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Backend (Express API)           │
│  ┌──────────────────────────────────┐   │
│  │  Analytics Routes                │   │
│  │  - Rate Limiting                 │   │
│  │  - Validation (Zod)              │   │
│  │  - Sanitization                  │   │
│  └──────────────────────────────────┘   │
│              │                          │
│              ▼                          │
│  ┌──────────────────────────────────┐   │
│  │  PostgreSQL (Prisma ORM)         │   │
│  │  analytics_events table          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Dashboard API                   │
│  /api/analytics/dashboard/*             │
│  - /funnel                              │
│  - /daily                               │
│  - /devices                             │
│  - /sessions                            │
│  - /wallet-providers                    │
│  - /dropoffs                            │
│  - /retention                           │
│  - /summary                             │
└─────────────────────────────────────────┘
```

## Files Created

### Frontend (`apps/web/src/`)

| File | Purpose |
|------|---------|
| `lib/analytics.ts` | Core analytics SDK |
| `lib/analytics-consent.ts` | GDPR consent management |
| `lib/wallet-hash.ts` | Browser-side wallet hashing |
| `hooks/useAnalytics.ts` | React analytics hook |
| `hooks/useAuthAnalytics.ts` | Auth flow tracking |
| `hooks/useChatAnalytics.ts` | Chat flow tracking |
| `components/CookieConsentBanner.tsx` | Consent banner |
| `contexts/WalletContext.tsx` | Updated with analytics |
| `App.tsx` | Updated with landing tracking |

### Backend (`apps/api/src/`)

| File | Purpose |
|------|---------|
| `routes/analytics.ts` | Event ingestion API |
| `routes/analytics-dashboard.ts` | Dashboard metrics API |
| `lib/wallet-hash.ts` | Server-side wallet hashing |
| `lib/analytics-queries.ts` | Dashboard query helpers |
| `lib/ratelimit.ts` | Updated with analytics limiter |
| `app.ts` | Wired up analytics routes |
| `schema.prisma` | Added `AnalyticsEvent` model |

### Documentation (`deployment/`)

| File | Purpose |
|------|---------|
| `ANALYTICS_SETUP.md` | Setup and deployment guide |
| `ANALYTICS_IMPLEMENTATION.md` | Implementation summary |

## Event Types

| Event | Trigger |
|-------|---------|
| `landing_visit` | First page render |
| `wallet_click` | Click "Connect Wallet" (before popup) |
| `wallet_success` | Wallet connected successfully |
| `session_success` | Auth session established |
| `did_success` | DID authenticated |
| `first_message_sent` | First user message |
| `first_reply_received` | First AI response |
| `return_24h` | Revisit within 24h |

## Privacy Features

### NOT Tracked
- Conversation content (messages, prompts, replies)
- Personal health information
- Raw wallet addresses (only SHA-256 hashes)
- Raw IP addresses
- DID private keys

### ALWAYS Anonymized
- Visitor IDs (UUIDv4)
- Session IDs (UUIDv4)
- Wallet hashes (SHA-256)
- Device category (mobile/tablet/desktop)
- Country (from timezone, coarse only)

## GDPR Compliance

- Explicit opt-in consent required
- Easy opt-out support
- 12-month visitor ID expiry
- Consent persistence in localStorage
- Cookie banner component included
- Analytics disabled mode when declined

## Security

- Rate limiting: 100 events/minute per IP
- Strict schema validation (Zod)
- Metadata sanitization (whitelist)
- Max 50 events per batch
- Wallet hash format validation
- Timestamp validation

## Dashboard Endpoints

```bash
# Get funnel metrics (last 30 days)
GET /api/analytics/dashboard/funnel?days=30

# Get daily breakdown
GET /api/analytics/dashboard/daily?days=30

# Get device distribution
GET /api/analytics/dashboard/devices?days=30

# Get wallet provider breakdown
GET /api/analytics/dashboard/wallet-providers?days=30

# Get retention for cohort
GET /api/analytics/dashboard/retention?date=2026-05-01

# Get complete summary
GET /api/analytics/dashboard/summary?days=7
```

## Usage Examples

### Track Custom Event (Frontend)

```typescript
import { trackEvent } from './lib/analytics';

await trackEvent('wallet_click', {
  wallet_provider: 'metamask',
});
```

### Use Hook in Component

```typescript
import { useAnalytics } from './hooks/useAnalytics';

function MyComponent() {
  const { trackEvent } = useAnalytics();

  const handleClick = async () => {
    await trackEvent('wallet_click', { provider: 'metamask' });
  };

  return <button onClick={handleClick}>Connect</button>;
}
```

### Query Funnel Metrics (Backend)

```typescript
import { getFunnelWithConversionRates } from './lib/analytics-queries';

const { metrics, conversionRates } = await getFunnelWithConversionRates({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
});
```

## Funnel Analysis

```
Landing Visit
    ↓ (conversion: landing → wallet_click)
Wallet Click
    ↓ (conversion: click → success)
Wallet Success
    ↓ (conversion: wallet → session)
Session Success
    ↓ (conversion: session → DID)
DID Success
    ↓ (conversion: DID → first message)
First Message Sent
    ↓ (conversion: message → reply)
First Reply Received
```

## Next Steps

1. **Run the migration** to create the `analytics_events` table
2. **Test event ingestion** with the provided curl command
3. **Verify dashboard endpoints** return data
4. **Configure admin authentication** for dashboard routes (TODO)
5. **Monitor logs** for analytics events
6. **Set up monitoring/alerting** for ingestion failures

## Support

For issues or questions, refer to:
- `deployment/ANALYTICS_SETUP.md` - Detailed setup guide
- `deployment/ANALYTICS_IMPLEMENTATION.md` - Architecture and features
- `documentation/public documentation/API_ENDPOINTS.md` - API reference
