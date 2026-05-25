# SafePsy API Endpoints Reference

Complete reference for all production API endpoints. Base URL: `/api` (same-origin) or `VITE_API_URL`.

**Authentication:** Most endpoints require wallet authentication via httpOnly cookie (`walletSessionToken`). Set `credentials: 'include'` in fetch requests.

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
  "data": {
    "walletAddress": "0xYourAddress",
    "chainId": 11155111,
    "expiresAt": "2026-05-26T10:00:00.000Z"
  },
  "message": "Wallet verified successfully"
}
```

**Set-Cookie:** `walletSessionToken=<jwt>; HttpOnly; SameSite=Lax; Path=/`

**Notes:**
- Consumes nonce (single-use)
- Creates `walletSession` cookie (7-day expiry)
- Address recovered from SIWE message (no need to send in body)

---

### `GET /api/auth/me`
Get current session info.

**Headers:**
```
Cookie: walletSessionToken=<jwt>
```

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

**Set-Cookie:** `walletSessionToken=; Max-Age=0; Path=/`

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

**Last updated:** 2026-05-19  
**Network:** Sepolia Testnet (Chain ID: 11155111)
