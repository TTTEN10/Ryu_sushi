# Product conversion metrics (first-party cookie)

When a visitor opts in to **analytics cookies**, the web app (`apps/web`) may set a first-party cookie:

| Name | Purpose |
|------|---------|
| `sp_product_metrics` | JSON payload (URI-encoded) of anonymous milestone timestamps |

Consent is read from `localStorage` key `cookieConsent` (`analytics: true`). If analytics is off, nothing is written.

## Schema (`v: 1`)

All values are ISO 8601 strings; each milestone is recorded **once** (first occurrence), except session bookkeeping noted below.

| Field | Meaning |
|-------|---------|
| `firstLandingAt` | First analytics-consented browser-session start tracked |
| `lastSessionStartAt` | Start time of the **last** tracked browser session (updated each new session) |
| `walletClickAt` | First time the user initiated wallet connect |
| `walletSuccessAt` | First time a wallet address was present in the client |
| `sessionSuccessAt` | First time wallet signature verification succeeded (authenticated session) |
| `didSuccessAt` | First time DID check indicated an on-chain identity exists |
| `firstMessageSentAt` | First user message sent in chat |
| `firstReplyReceivedAt` | First completed assistant reply with non-empty content |
| `returnWithin24hAt` | First time a **new** browser session started between 1 minute and 24 hours after the previous session’s `lastSessionStartAt` |

## Reading the cookie

In browser DevTools → Application → Cookies, copy the value of `sp_product_metrics`, then decode:

```js
JSON.parse(decodeURIComponent(document.cookie.split('; ').find((r) => r.startsWith('sp_product_metrics=')).split('=')[1]))
```

Or use the exported helper in code: `getProductConversionMetricsSnapshot()` from `apps/web/src/utils/conversionMetrics.ts`.

## Server intake (optional)

The API exposes **`POST /api/metrics/funnel`** (same origin as the web app in production). Send JSON with `v: 1` and at least one timestamp field (same names as the cookie). Responses: **`204`** on success, **`400`** with `{ success: false, message }` on validation errors.

Example:

```http
POST /api/metrics/funnel
Content-Type: application/json

{
  "v": 1,
  "firstLandingAt": "2026-05-10T12:00:00.000Z",
  "sessionSuccessAt": "2026-05-10T12:05:00.000Z"
}
```

Accepted payloads are logged under event **`funnel_intake`** (structured logger) with optional **`ipHash`** when `IP_HASHING_ENABLED=true`. Rate limit: **60 requests per 15 minutes per IP**. Prometheus: **`funnel_intake_total`** increments on each accepted body.

The web client posts the same JSON as the `sp_product_metrics` cookie when analytics cookies are enabled: after each cookie write (debounced ~1.2s), when the tab becomes hidden, on mount, and when the user newly opts in to analytics (`flushProductMetricsToServer` in `apps/web/src/App.tsx` and `conversionMetrics.ts`). Duplicate identical payloads in one tab session are skipped via `sessionStorage`.

## Aggregation notes

- Conversion rates use counts of browsers where each timestamp field is non-null, divided by an appropriate denominator (e.g. `firstLandingAt` for top-of-funnel).
- The design is intentionally anonymous; pairing with server logs or wallet identities requires separate instrumentation and must comply with policy.

## Related pages

- Cookie Policy: `/cookies`
- Security and Privacy Policy: `/sap-policy`
