# SafePsy Analytics System

Complete privacy-first analytics for SafePsy — tracking user activation funnel, feature usage, and conversion rates with full GDPR compliance.

---

## Overview

The analytics system consists of:

| Layer | Component |
|-------|-----------|
| **Frontend SDK** | `apps/web/src/lib/analytics.ts` — visitor/session ID management, event queue, sendBeacon transport |
| **Consent** | `apps/web/src/lib/analytics-consent.ts` — GDPR opt-in/opt-out with localStorage persistence |
| **GA4** | `apps/web/src/lib/ga4.ts` — parallel Google Analytics 4 tracking (consent-gated) |
| **Cookie Metrics** | `apps/web/src/utils/conversionMetrics.ts` — first-party cookie `sp_product_metrics` for milestone timestamps |
| **React Hooks** | `apps/web/src/hooks/useAnalytics.ts`, `useAuthAnalytics.ts`, `useChatAnalytics.ts` |
| **Ingestion API** | `apps/api/src/routes/analytics.ts` — rate-limited event ingestion |
| **Dashboard API** | `apps/api/src/routes/analytics-dashboard.ts` — metrics queries (admin-authenticated) |
| **Database** | `analytics_events` table in PostgreSQL (Prisma model: `AnalyticsEvent`) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ SDK      │  │ Consent      │  │ GA4 (parallel)       │  │
│  │ analytics│  │ consent      │  │ ga4.ts               │  │
│  │ cookie   │  │ cookieUtils  │  │                      │  │
│  │ metrics  │  │              │  │                      │  │
│  └──────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hooks                                                  │   │
│  │ useAnalytics — trackEvent, setWalletHash, consent     │   │
│  │ useAuthAnalytics — wallet_click/success, session, DID │   │
│  │ useChatAnalytics — first_message, first_reply         │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              │ POST /api/analytics/event     │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ routes/analytics.ts                                    │   │
│  │  - Rate limit (100 evt/min/IP)                        │   │
│  │  - Zod schema validation                               │   │
│  │  - Metadata sanitization (whitelist)                   │   │
│  │  - Device detection fallback                           │   │
│  │  - Batch (max 50 events)                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  PostgreSQL (Prisma ORM)                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ analytics_events table                                 │   │
│  │ id, eventName, visitorId, sessionId, walletHash       │   │
│  │ timestamp, pageUrl, referrer, userAgent,              │   │
│  │ deviceType, country, metadata(JSONB)                  │   │
│  │ @@index([eventName, timestamp]),                      │   │
│  │ @@index([walletHash, timestamp]),                     │   │
│  │ @@index([timestamp])                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD API (Admin Auth)                  │
│  GET /api/analytics/dashboard/funnel    — Funnel + rates    │
│  GET /api/analytics/dashboard/daily     — Daily breakdown   │
│  GET /api/analytics/dashboard/devices   — Device distribution│
│  GET /api/analytics/dashboard/sessions  — Sessions/visitor  │
│  GET /api/analytics/dashboard/wallet-providers — Provider   │
│  GET /api/analytics/dashboard/dropoffs  — Drop-off analysis │
│  GET /api/analytics/dashboard/retention — D1/D7/D30         │
│  GET /api/analytics/dashboard/summary   — Complete summary  │
│  GET /api/analytics/health              — Health check      │
└─────────────────────────────────────────────────────────────┘
```

---

## Event Types

The 8-event conversion funnel:

| Event | Trigger | Typical Metadata |
|-------|---------|-----------------|
| `landing_visit` | App mount / first page render | `landing_page`, `utm_source`, `utm_campaign`, `utm_medium` |
| `wallet_click` | User clicks "Connect Wallet" (before popup) | `wallet_provider`, `attempt_count` |
| `wallet_success` | Wallet connected | `wallet_provider` |
| `session_success` | Auth session confirmed via backend | `auth_method` |
| `did_success` | DID identity authenticated | `did_method`, `wallet_linked` |
| `first_message_sent` | First user chat message | `conversation_mode` |
| `first_reply_received` | First AI response (success only) | `model`, `response_time_ms` |
| `return_24h` | User revisits within 24h window | — |

---

## Frontend SDK

### Core Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analytics.ts` | Core SDK — AnalyticsSDK class, event queue, sendBeacon, deduplication |
| `apps/web/src/lib/analytics-consent.ts` | GDPR consent — opt-in/out, localStorage persistence, useCookieConsent hook |
| `apps/web/src/lib/wallet-hash.ts` | Browser-side SHA-256 wallet hashing |
| `apps/web/src/lib/ga4.ts` | Google Analytics 4 integration (parallel, consent-gated) |
| `apps/web/src/utils/conversionMetrics.ts` | First-party cookie `sp_product_metrics` — milestone timestamps |

### SDK Usage

```typescript
// Direct SDK instance
import { analytics } from './lib/analytics'

// Track any event
await analytics.trackEvent('wallet_click', { wallet_provider: 'metamask' })

// Track landing visit (fires return_24h + landing_visit)
await analytics.trackLandingVisit()

// Set wallet hash after connection
await analytics.setWalletAddress(walletAddress)

// Control SDK
analytics.enable()
analytics.disable()
await analytics.flush() // force-send queued events
```

### Hooks

```typescript
// General-purpose hook (visitor ID, consent, all SDK methods)
import { useAnalytics } from './hooks/useAnalytics'
const { trackEvent, visitorId, sessionId, consent, hasConsent, optIn, optOut } = useAnalytics()

// Auth flow hook (wallet, session, DID events)
import { useAuthAnalytics } from './hooks/useAuthAnalytics'
const { walletClick, walletSuccess, sessionSuccess, didSuccess } = useAuthAnalytics()

// Chat flow hook (message, reply events)
import { useChatAnalytics } from './hooks/useChatAnalytics'
const { firstMessageSent, firstReplyReceived } = useChatAnalytics()
```

### Consent

```typescript
import { hasAnalyticsConsent, optInAnalytics, optOutAnalytics, getConsent } from './lib/analytics-consent'

if (hasAnalyticsConsent()) {
  // Safe to track
}

optInAnalytics()   // consent.analytics = true
optOutAnalytics()  // consent.analytics = false
```

Consent is stored in `localStorage` key `cookieConsent`:
```json
{ "essential": true, "analytics": false, "marketing": false, "updatedAt": "2026-08-26T..." }
```

### Cookie Conversion Metrics

When analytics consent is enabled, `sp_product_metrics` cookie stores anonymous milestone timestamps:

| Field | Meaning |
|-------|---------|
| `firstLandingAt` | First analytics-consented session start |
| `walletClickAt` | First wallet connect attempt |
| `walletSuccessAt` | First wallet address present in client |
| `sessionSuccessAt` | First wallet signature verification success |
| `didSuccessAt` | First DID with on-chain identity |
| `firstMessageSentAt` | First user chat message |
| `firstReplyReceivedAt` | First completed assistant reply |
| `returnWithin24hAt` | New session 1 min – 24 hrs after previous |

The cookie is synced to the server via `POST /api/metrics/funnel` (debounced ~1.2s, on tab-hide, on mount, on consent change).

---

## Backend API

### Event Ingestion

**POST** `/api/analytics/event`

Accepts single event or batch (max 50):

```json
{
  "event_name": "wallet_success",
  "visitor_id": "uuid",
  "session_id": "uuid",
  "wallet_hash": "64-hex-chars",
  "timestamp": "2026-08-26T12:00:00.000Z",
  "page_url": "/dashboard",
  "referrer": "",
  "user_agent": "...",
  "device_type": "desktop",
  "country": "US",
  "metadata": { "wallet_provider": "metamask" }
}
```

Response: `204 No Content` on success, `400` with validation errors.

Rate limit: 100 events/minute per IP.

### Dashboard Endpoints (Admin Authenticated)

All require valid `X-Admin-Secret` header.

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/dashboard/funnel?days=30` | Funnel counts + 7 conversion rates |
| `GET /api/analytics/dashboard/daily?days=30` | Per-day event breakdown |
| `GET /api/analytics/dashboard/devices?days=30` | Mobile/tablet/desktop distribution |
| `GET /api/analytics/dashboard/sessions?days=30` | Avg sessions per visitor |
| `GET /api/analytics/dashboard/wallet-providers?days=30` | Wallet provider breakdown |
| `GET /api/analytics/dashboard/dropoffs?days=30` | Drop-off analysis between funnel stages |
| `GET /api/analytics/dashboard/retention?date=2026-08-01` | D1/D7/D30 retention for cohort |
| `GET /api/analytics/dashboard/summary?days=30` | All metrics in one response |
| `GET /api/analytics/health` | `{"status":"ok","timestamp":"..."}` |

### Funnel Conversion Rates

| Rate | Formula |
|------|---------|
| `wallet_click_to_success` | wallet_successes / wallet_clicks |
| `wallet_success_to_session` | session_successes / wallet_successes |
| `session_to_did` | did_successes / session_successes |
| `did_to_first_message` | first_messages / did_successes |
| `first_message_to_first_reply` | first_replies / first_messages |
| `overall_landing_to_first_reply` | first_replies / landing_visits |
| `return_rate_24h` | returns_24h / landing_visits |

---

## Database Schema

```prisma
model AnalyticsEvent {
  id          String   @id @default(cuid())
  walletHash  String?
  eventName   String
  visitorId   String?
  sessionId   String?
  timestamp   DateTime @default(now())
  pageUrl     String?
  referrer    String?
  userAgent   String?
  deviceType  String?
  country     String?
  metadata    String?   // JSONB — sanitized only

  @@index([walletHash, timestamp])
  @@index([eventName, timestamp])
  @@index([timestamp])
  @@map("analytics_events")
}
```

---

## Privacy & Security

### NEVER Tracked
- Conversation content (messages, prompts, AI replies)
- Personal health information
- Raw wallet addresses (SHA-256 hashes only)
- Raw IP addresses
- DID private keys or secrets

### Always Anonymized
- Visitor IDs (UUIDv4)
- Session IDs (UUIDv4)
- Wallet hashes (SHA-256)
- Device category only (no fingerprinting)
- Country from timezone (coarse — `America` → `US`)

### Security Controls
- Rate limiting: 100 events/minute per IP
- Zod schema validation on ingestion
- Metadata sanitization (allowed-keys whitelist)
- Max 50 events per batch
- Wallet hash format validation (64 hex chars)
- Timestamp validation (no future, max 30 days old)
- GDPR explicit consent gating (disabled by default)

---

## Setup & Deployment

### 1. Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_analytics_events
```

This creates the `analytics_events` table. The migration SQL is at:
`apps/api/prisma/migrations/20260525_add_analytics_events/migration.sql`

### 2. Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_PUBLIC_GA4_MEASUREMENT_ID` | Google Analytics 4 measurement ID (e.g. `G-XXXXXXXXXX`) |
| `X_ADMIN_SECRET` | Admin authentication for dashboard API |
| `DATABASE_URL` | PostgreSQL connection (already configured) |
| `IP_SALT` | For IP hashing (already configured) |

### 3. Verify

```bash
# Start API
npm run dev:api

# Test ingestion
curl -X POST http://localhost:3001/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"event_name":"landing_visit","metadata":{"landing_page":"/"}}'

# Test dashboard (requires X-Admin-Secret)
curl http://localhost:3001/api/analytics/dashboard/health
```

---

## GA4 Integration

GA4 fires in parallel with the self-hosted SDK. Events are mapped:

| Internal Event | GA4 Event |
|---------------|-----------|
| `landing_visit` | `page_view` |
| `wallet_click` | `wallet_connect_initiated` |
| `wallet_success` | `wallet_connected` |
| `session_success` | `session_started` |
| `did_success` | `did_minted` |
| `first_message_sent` | `first_chat_sent` |
| `first_reply_received` | `first_chat_replied` |
| `return_24h` | `returning_visit` |

GA4 scripts load only after user grants analytics consent. No data is sent if consent is denied.

---

## Usage Examples

### In a Wallet Connect Button

```typescript
import { useAuthAnalytics } from './hooks/useAuthAnalytics'
import { setWalletAddress } from './lib/analytics'

function ConnectButton() {
  const auth = useAuthAnalytics()

  const handleConnect = async () => {
    await auth.walletClick('metamask')  // Track BEFORE popup
    try {
      const address = await connectWallet()
      await auth.walletSuccess('metamask')
      await setWalletAddress(address)
    } catch (err) {
      await auth.walletFailure(String(err))
    }
  }

  return <button onClick={handleConnect}>Connect Wallet</button>
}
```

### In Chat Component

```typescript
import { useChatAnalytics } from './hooks/useChatAnalytics'

function ChatInput() {
  const chat = useChatAnalytics()

  const handleSend = async (message: string) => {
    await chat.firstMessageSent('chat')
    const reply = await sendMessage(message)
    await chat.firstReplyReceived(reply.model, reply.durationMs)
  }

  return <input onSend={handleSend} />
}
```

### In App.tsx (already wired)

```typescript
useEffect(() => {
  if (hasConsentForCookieType('analytics')) {
    analytics.enable()
    void analytics.trackLandingVisit()
  } else {
    analytics.disable()
  }
}, [])
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Events not appearing in database | Run `prisma migrate dev --name add_analytics_events` |
| No events firing | Check `cookieConsent` in localStorage — `analytics` must be `true` |
| GA4 not recording | Verify `VITE_PUBLIC_GA4_MEASUREMENT_ID` is set in `.env` |
| Rate limit errors | Normal for high traffic; SDK retries with backoff |
| Dashboard API returns 401 | Check `X-Admin-Secret` header matches server config |
| `sp_product_metrics` cookie not set | Verify `analytics: true` in `cookieConsent` |