# SafePsy API Endpoints Reference

Complete reference for all production API endpoints. Base URL: `/api` (same-origin) or `VITE_API_URL`.

**Authentication (web):** Wallet session via httpOnly cookie **`walletSession`**. Use `credentials: 'include'` (or `apiFetch()` from `apps/web/src/config/api.ts`). The web app does not send `Authorization: Bearer` or store JWTs in `localStorage`.

**Authentication (mobile):** Optional `Authorization: Bearer <jwt>`; verify response may include `data.token` for SecureStore.

**Production routing:** On the app host (Caddy), **`/api/auth/*`**, **`/api/did/*`**, and encrypted **`/api/chat/*`** routes hit the **Node** `apps/api` service; other **`/api/*`** paths hit the Python LLM proxy. See `documentation/private documentation/DEPLOY-RUNBOOK.md` (local clone; not on GitHub).

---

## Health & Metrics

### `GET /healthz`
Server health check.

**Response:** `200 OK`
```
ok
```

### `GET /readyz`
Readiness probe (checks database, Redis, upstream services).

**Response:** `200 OK`
```json
{
  "status": "ok",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "upstream": "healthy"
  }
}
```

### `GET /metrics`
Prometheus-compatible metrics endpoint.

---

## Authentication

### `POST /api/auth/wallet/connect`
Request SIWE verification message.

**Headers:**
```
Content-Type: application/json
x-wallet-address: 0x... (optional, for logging)
x-chain-id: 11155111 (optional)
```

**Body:**
```json
{
  "address": "0xYourAddress",
  "chainId": 11155111
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "safepsy.com wants you to sign in...",
    "nonce": "abc123",
    "issued": "2026-05-19T10:00:00.000Z"
  }
}
```

**Notes:**
- Nonce stored with 5-minute TTL
- Domain: `SIWE_DOMAIN` env var (default: `safepsy.com`)

---

### `POST /api/auth/wallet/verify`
Verify SIWE signature and create session.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "message": "safepsy.com wants you to sign in...",
  "signature": "0xSignatureFromPersonalSign"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Wallet signature verified successfully",
  "data": {
    "address": "0xYourAddress",
    "chainId": 11155111,
    "verified": true,
    "token": "<jwt-for-mobile-only>"
  }
}
```

**Set-Cookie:** `walletSession=<jwt>; HttpOnly; Secure (production); SameSite=Lax; Max-Age=604800; Path=/`

**Notes:**
- Consumes nonce (single-use)
- Web clients use the cookie only; ignore `data.token` in the browser
- Address recovered from SIWE message when omitted from body

---

### `GET /api/auth/me`
Get current session info.

**Authentication:** `walletSession` cookie (`credentials: 'include'`) or `Authorization: Bearer` (mobile)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "walletAddress": "0xYourAddress",
    "chainId": 11155111,
    "isVerified": true
  }
}
```

**Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Not authenticated"
}
```

---

### `POST /api/auth/logout`
Clear session cookie.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Set-Cookie:** Clears `walletSession` (httpOnly)

---

## DID (Decentralized Identity)

### `POST /api/did/check`
Check if wallet has DID; create one if missing.

**Auth:** Required

**Body:**
```json
{
  "createIfMissing": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "did": "did:ethr:0xYourAddress",
    "tokenId": "123",
    "createdAt": "2026-05-19T10:00:00.000Z"
  }
}
```

**Notes:**
- Creates DID on Sepolia Testnet if `createIfMissing: true`
- Returns `hasDid: false` if no DID and `createIfMissing` omitted

---

### `GET /api/did/info`
Get full DID profile and on-chain metadata.

**Auth:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "walletAddress": "0xYourAddress",
    "encryptedDataExists": true,
    "isRevoked": false,
    "contractAddress": "0x103eAd096f898132E138ad228E35296db983A053",
    "network": "Sepolia Testnet",
    "chainId": 11155111,
    "profile": {
      "owner": "0xYourAddress",
      "createdAt": "1715900000",
      "lastUpdatedAt": "1715900100",
      "chatDataReference": "0x...",
      "encryptedKeyMetadataLength": 128,
      "hasChatReference": true
    }
  }
}
```

---

### `POST /api/did/revoke`
Revoke DID (permanent, cannot be undone).

**Auth:** Required

**Body:**
```json
{
  "clearChatReference": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "DID revoked successfully",
  "data": {
    "revokedAt": "2026-05-19T12:00:00.000Z",
    "transactionHash": "0x..."
  }
}
```

**Warnings:**
- Token burned permanently
- Address cannot receive new DID
- Loss of access to all DID-associated data

---

## Chat

### `POST /api/chat/completions`
Get AI response (Dr. Safe).

**Auth:** Optional (guest mode available)

**Query:**
- `withContext=true` — Enable RAG context from FAQs/Terms

**Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello Dr. Safe" }
  ],
  "stream": true,
  "temperature": 0.7,
  "maxTokens": 1000,
  "mode": "guest"
}
```

**Response (Streaming):** SSE events
```
event: connected
data: {"status":"connected"}

event: token
data: {"token":"Hello","index":0}

event: done
data: {"finishReason":"stop","usage":{"totalTokens":50}}
```

**Guest Mode Limits:**
- Max 5 user messages per browser session
- No persistence (in-memory only)
- No quota increment

---

### `POST /api/chat/save`
Save encrypted chat history.

**Auth:** Required

**Body:**
```json
{
  "encryptedChatBlob": "base64...",
  "didTokenId": "123",
  "generateSummary": true,
  "messages": [...]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "chatId": "abc123",
    "blobHash": "0x...",
    "chatReference": "0x...",
    "encryptedSummaryRef": "s3:key:or:cid",
    "encryptedSummaryKey": "base64...",
    "requiresDidUpdate": true
  }
}
```

**Notes:**
- Generates SHA-256 hash of blob for on-chain storage
- Caller must call `updateChatReference()` on DID contract if `requiresDidUpdate: true`

---

### `GET /api/chat/load`
Load encrypted chat history.

**Auth:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasChat": true,
    "encryptedChatBlob": "base64...",
    "blobHash": "0x...",
    "didTokenId": "123",
    "encryptedSummaryRef": "s3:key:or:cid",
    "updatedAt": "2026-05-19T10:00:00.000Z"
  }
}
```

---

### `POST /api/chat/export`
Export encrypted chat for backup.

**Auth:** Required

**Rate Limit:** 5 requests/hour

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Chat exported successfully",
  "data": {
    "walletAddress": "0xYourAddress",
    "exportedAt": "2026-05-19T12:00:00.000Z",
    "chat": {
      "encryptedBlob": "base64...",
      "encryptedBlobHash": "0x...",
      "encryptedKey": "base64...",
      "encryptedSummaryRef": "s3:key:or:cid",
      "didTokenId": "123",
      "createdAt": "2026-05-19T10:00:00.000Z",
      "updatedAt": "2026-05-19T11:00:00.000Z"
    },
    "decryptionInstructions": {
      "note": "Use decryptChat() from did-encryption.ts with your wallet signature",
      "format": "AES-256-GCM encrypted JSON"
    }
  }
}
```

**Audit Log:** `CHAT_EXPORTED` event written to `SecurityAuditLog`

---

### `DELETE /api/chat`
Delete chat history permanently.

**Auth:** Required

**Rate Limit:** 5 requests/hour

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Chat history deleted successfully. Note: On-chain DID metadata (hashes) remain immutable but point to deleted data.",
  "data": {
    "deletedAt": "2026-05-19T12:00:00.000Z"
  }
}
```

**Audit Log:** `CHAT_DELETED` event written to `SecurityAuditLog`

**Warnings:**
- Off-chain data deleted immediately
- On-chain hash remains (immutable) but points to deleted data
- Cannot be undone — export first if backup needed

---

### `GET /api/chat/quota`
Get quota status for authenticated DID.

**Auth:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "did": "did:ethr:0x...",
    "quota": {
      "dailyUsed": 5,
      "dailyLimit": 10,
      "monthlyUsed": 50,
      "monthlyLimit": 100,
      "resetDailyAt": "2026-05-20T00:00:00.000Z",
      "resetMonthlyAt": "2026-06-01T00:00:00.000Z"
    },
    "subscription": {
      "tier": "FREE",
      "status": "ACTIVE",
      "dailyLimit": 10,
      "monthlyLimit": 100
    }
  }
}
```

---

### `GET /api/chat/concurrency`
Check if chat request in progress.

**Auth:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "did": "did:ethr:0x...",
    "requestInProgress": false
  }
}
```

---

### `GET /api/chat/health`
Health check for chat endpoints.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Chat endpoints are healthy",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

---

### `GET /api/chat/upstream-status`
LLM upstream health probe results.

**Auth:** Required (`AI_UPSTREAM_STATUS_SECRET` header)

**Response:** `200 OK`
```json
{
  "success": true,
  "routing": "scaleway-direct",
  "skipHealthCheck": false,
  "upstreams": {}
}
```

---

## Subscription

### `GET /api/subscription/status`
Get subscription status for authenticated wallet.

**Auth:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "tier": "FREE",
    "status": "ACTIVE",
    "currentPeriodStart": "2026-05-01T00:00:00.000Z",
    "currentPeriodEnd": "2026-06-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

---

## Email Subscription (Waitlist)

### `POST /api/subscribe`
Join waitlist / email subscription.

**Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "client",
  "consentGiven": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Successfully subscribed to waitlist"
}
```

**Rate Limit:** 5 requests/minute

**Notes:**
- `consentGiven: true` required (400 otherwise)
- Falls back to Google Sheets if DB unavailable

---

## Contact

### `POST /api/contact`
Send contact message.

**Body:**
```json
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "subject": "Question",
  "message": "Message content"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_SIGNATURE` | 400 | SIWE signature verification failed |
| `NONCE_EXPIRED` | 400 | Nonce TTL exceeded (5 min) |
| `DID_NOT_FOUND` | 404 | No DID for wallet |
| `CHAT_NOT_FOUND` | 404 | No chat history found |
| `VALIDATION_ERROR` | 400 | Request validation failed |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Frontend API base URL | `''` (same-origin) |
| `SIWE_DOMAIN` | SIWE message domain | `safepsy.com` |
| `JWT_SECRET` | Session JWT secret | (required) |
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `DID_IDENTITY_TOKEN_ADDRESS` | DID contract address (Sepolia) | `0x103eAd096f898132E138ad228E35296db983A053` |
| `SCALEWAY_API_KEY` | Scaleway storage/API key | (optional) |
| `AI_UPSTREAM_STATUS_SECRET` | Secret for `/upstream-status` | (optional) |

---

---

## Analytics (Privacy-First)

### `POST /api/analytics/event`

Ingest analytics events (single or batch).

**Authentication:** Not required (public endpoint with rate limiting)

**Rate Limit:** 100 events/minute per IP

**Body (single event):**
```json
{
  "event_name": "wallet_click",
  "visitor_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "bb56d7d7-67c3-42e2-b9b7-aec67dc5f322",
  "wallet_hash": "a1b2c3d4...",
  "metadata": {
    "wallet_provider": "metamask"
  }
}
```

**Body (batch):**
```json
[
  { "event_name": "landing_visit", ... },
  { "event_name": "wallet_click", ... }
]
```

**Response:** `204 No Content` (success)

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "No valid events",
  "errors": ["Event 0: Validation error: ..."]
}
```

**Event Names:**
- `landing_visit`
- `wallet_click`
- `wallet_success`
- `session_success`
- `did_success`
- `first_message_sent`
- `first_reply_received`
- `return_24h`

**Privacy:**
- Raw wallet addresses NOT accepted (use SHA-256 hash)
- Raw IP addresses NOT stored
- Conversation content NOT tracked
- Metadata sanitized (allowed keys only)

---

### `GET /api/analytics/dashboard/funnel`

Get funnel metrics with conversion rates.

**Authentication:** Required (admin only - TODO: implement)

**Query Params:**
- `days` (optional): Number of days (default: 30)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "metrics": {
      "landing_visits": 1000,
      "wallet_clicks": 500,
      "wallet_successes": 450,
      "session_successes": 400,
      "did_successes": 350,
      "first_messages": 300,
      "first_replies": 280,
      "returns_24h": 150
    },
    "conversionRates": {
      "wallet_click_to_success": 0.90,
      "wallet_success_to_session": 0.89,
      "session_to_did": 0.875,
      "did_to_first_message": 0.857,
      "first_message_to_first_reply": 0.933,
      "overall_landing_to_first_reply": 0.28,
      "return_rate_24h": 0.15
    },
    "period": {
      "days": 30,
      "startDate": "2026-04-25T00:00:00.000Z",
      "endDate": "2026-05-25T00:00:00.000Z"
    }
  }
}
```

---

### `GET /api/analytics/dashboard/daily`

Get daily breakdown of funnel events.

**Query Params:**
- `days` (optional): Number of days (default: 30)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "metrics": [
      {
        "date": "2026-05-01",
        "landing_visits": 50,
        "wallet_clicks": 25,
        "wallet_successes": 23,
        "session_successes": 20,
        "did_successes": 18,
        "first_messages": 15,
        "first_replies": 14
      }
    ],
    "period": { "days": 30 }
  }
}
```

---

### `GET /api/analytics/dashboard/devices`

Get device type distribution.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "breakdown": {
      "mobile": 450,
      "tablet": 50,
      "desktop": 480,
      "unknown": 20
    },
    "period": { "days": 30 }
  }
}
```

---

### `GET /api/analytics/dashboard/sessions`

Get session analytics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sessions": {
      "avgSessionsPerVisitor": 2.5,
      "totalVisitors": 1000,
      "totalSessions": 2500
    },
    "period": { "days": 30 }
  }
}
```

---

### `GET /api/analytics/dashboard/wallet-providers`

Get wallet provider breakdown.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "providers": {
      "metamask": 300,
      "walletconnect": 150,
      "rabby": 40,
      "coinbase": 10
    },
    "period": { "days": 30 }
  }
}
```

---

### `GET /api/analytics/dashboard/dropoffs`

Get funnel drop-off analysis.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "dropoffs": [
      {
        "stage": "landing_visit",
        "count": 1000,
        "dropOffFromPrevious": 0,
        "dropOffRate": 0
      },
      {
        "stage": "wallet_click",
        "count": 500,
        "dropOffFromPrevious": 500,
        "dropOffRate": 0.5
      }
    ]
  }
}
```

---

### `GET /api/analytics/dashboard/retention`

Get D1/D7/D30 retention metrics for a cohort.

**Query Params:**
- `date` (required): Cohort date in ISO 8601 format (YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "retention": {
      "d1Retention": 0.35,
      "d7Retention": 0.15,
      "d30Retention": 0.05,
      "cohortSize": 500
    },
    "cohortDate": "2026-05-01T00:00:00.000Z"
  }
}
```

---

### `GET /api/analytics/dashboard/summary`

Get complete analytics summary.

**Query Params:**
- `days` (optional): Number of days (default: 30)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "funnel": { ... },
    "daily": [...],
    "devices": { ... },
    "sessions": { ... },
    "walletProviders": { ... },
    "dropoffs": [...],
    "period": { ... }
  }
}
```

---

**Last updated:** 2026-05-19  
**Network:** Sepolia Testnet (Chain ID: 11155111)
