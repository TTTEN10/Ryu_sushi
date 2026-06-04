# Privacy by Design: IP Address Handling

## Overview

This document describes the privacy by design implementation for IP address handling across the SafePsy platform. The implementation follows the principle of **default OFF** for maximum privacy protection.

> **For comprehensive privacy and data protection information, including consent flows and encrypted storage details, see the [Data Protection Impact Assessment (DPIA)](/dpia) in the SafePsy application.**

> **Path note:** Some sections below reference this monorepo under `apps/api/`. Older bullets that pointed at other codebases are **illustrative** unless the path starts with `apps/` in this repository.

## Key Principles

1. **Default OFF**: IP hashing is disabled by default
2. **Explicit Opt-in**: Must be explicitly enabled via environment variables
3. **Secure Hashing**: Uses SHA-256 with configurable salt when enabled
4. **Consistent Implementation**: Same privacy utilities across all services

## Implementation Details

### Environment Variables

```bash
# Privacy by Design - IP Address Handling
IP_HASHING_ENABLED=false  # Default: OFF for maximum privacy
IP_SALT=default-privacy-salt-change-in-production  # Change in production!
```

### Behavior

- **When `IP_HASHING_ENABLED=false` (default)** (see `apps/api/src/lib/crypto.ts`):
  - `ipHash()` returns **`undefined`** (no SHA-256 row is computed)
  - Routes store **`null`** / omit the hash in Prisma where the field is optional; raw IPs are not written to those columns via `ipHash`
  - Raw IPs should still not appear in application logs (see error-handler guidance)

- **When `IP_HASHING_ENABLED=true`**:
  - IP addresses are hashed using SHA-256 with salt (`ip + IP_SALT`) when **`IP_SALT`** is at least 32 characters; otherwise hashing is refused and `ipHash` stays `undefined` (see `apps/api/src/lib/crypto.ts` and startup validation in `apps/api/src/index.ts`)
  - Still provides privacy while enabling correlation for abuse prevention

### Where this is implemented (this repo)

#### 1. IP hashing helper
- **File**: `apps/api/src/lib/crypto.ts`
- **Export**: `ipHash(ip: string)` — returns `undefined` when hashing is off or salt is invalid; otherwise SHA-256 hex of `ip + IP_SALT`
- **Behavior**: Hashing runs only when **`IP_HASHING_ENABLED=true`** and **`IP_SALT`** is at least 32 characters (see startup checks in `apps/api/src/index.ts`)

#### 2. Routes that persist subscription / contact metadata
- **Files**: `apps/api/src/routes/subscribe.ts`, `apps/api/src/routes/contact.ts`, `apps/api/src/routes/metrics.ts`
- **Pattern**: Derive IP from `x-forwarded-for` / socket, pass `ipHash(ip)` into Prisma or metrics payloads (may be `undefined` when hashing is disabled)

#### 3. Global API rate limiting
- **File**: `apps/api/src/lib/ratelimit.ts` (mounted from `apps/api/src/app.ts`)
- **Note**: Uses Express `req.ip` for limits; it does not automatically call `ipHash`. Optional IP hashing applies where routes store `ipHash` in the database.

#### 4. Environment configuration
- **Files**: `apps/api/.env.example`, repo root `env.example` (and related `*.example` env files as applicable)
- **Variables**: `IP_HASHING_ENABLED`, `IP_SALT`

## Usage Examples

### Basic IP hashing (API)

```typescript
import { ipHash } from "../lib/crypto";

const ip =
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
  req.socket.remoteAddress ||
  "";

const stored = ipHash(ip); // undefined when IP hashing is disabled
```

### Rate limiting (API)

```typescript
import rateLimit from "express-rate-limit";

// Example: default express-rate-limit uses req.ip; combine with ipHash only where you persist IPs
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Logging with privacy

`apps/api/src/middleware/error-handler.ts` passes request metadata through `redactLogObject`; in **production** the logged `ip` field is replaced with `<REDACTED: ip>`. Development builds may include `req.ip` in error logs, so keep dev logs off shared sinks if that matters for your threat model.

## Security Considerations

1. **Salt Management**: 
   - Use a strong, unique salt in production
   - Generate with: `openssl rand -hex 32`
   - Rotate regularly

2. **Default Behavior**:
   - Default OFF ensures maximum privacy
   - Must explicitly enable IP hashing
   - Clear documentation of privacy implications

3. **Rate Limiting**:
   - Still effective with hashed IPs
   - Maintains security while protecting privacy
   - Consistent behavior across services

## Compliance

This implementation supports:

- **GDPR**: Privacy by design principles
- **CCPA**: Minimal data collection
- **SOC 2**: Data protection requirements
- **HIPAA**: Privacy safeguards (if applicable)

## Migration Guide

### For Existing Deployments

1. **Update Environment Variables**:
   ```bash
   # Add to your .env file
   IP_HASHING_ENABLED=false  # Keep disabled for maximum privacy
   IP_SALT=your-secure-salt-here
   ```

2. **Deploy Updated Code**:
   - All services will automatically use privacy-safe IP handling
   - No breaking changes to existing functionality

3. **Optional: Enable IP Hashing**:
   ```bash
   # Only if you need IP-based rate limiting
   IP_HASHING_ENABLED=true
   IP_SALT=your-production-salt
   ```

### Testing

```bash
# Test privacy settings (default API port in this monorepo is often 3001)
curl -H "X-Forwarded-For: 192.168.1.1" http://localhost:3001/api/subscribe

# With IP hashing off, stored ipHash in DB is typically null/undefined from ipHash(); with hashing on, expect a hex digest
```

## Monitoring

Monitor the following metrics:

- Rate limiting effectiveness
- Privacy compliance
- Salt rotation schedule
- Environment variable consistency

## Support

For questions about privacy implementation:

1. Check environment variables
2. Verify salt configuration
3. Review log outputs
4. Test with different IP addresses

---

**Remember**: Privacy by design means defaulting to maximum privacy protection. Only enable IP hashing if absolutely necessary for your use case.

---

## Encryption Scope & Privacy Model

> **Canonical reference:** [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (plain-language + technical sections). **Compliance framing:** [DPIA](/dpia) in the SafePsy application.

### In plain terms

- **Saved chat:** Encrypted in your browser before it is stored. SafePsy keeps **ciphertext** in the database, not readable history.
- **Dr. Safe replies:** Your browser sends **message text over HTTPS** on each request so the AI can answer. The server does **not** open your saved ciphertext blob to run the model.
- **Keys:** Wrapped with your wallet and stored on your DID as **`encryptedKeyMetadata`**. Plaintext chat keys stay on your device during the session.
- **Guests:** Without a verified wallet session, chat stays **in memory only** (not saved to encrypted storage).
- **Not strict E2E:** The API and LLM provider see message content during chat requests by design.

### Technical detail

#### Encryption at rest (authenticated users)

- **Client:** AES-256-GCM over chat JSON (`did-encryption.ts`); save via `POST /api/chat/save` with `encryptedChatBlob` only.
- **Server DB:** `encrypted_chats.encryptedBlob` (ciphertext). No wallet DEK/KEK on server.
- **On-chain:** `chatDataReference` (hash of blob); `encryptedKeyMetadata` (UTF-8 `signature:ivHex:ciphertextHex` wrapping the DEK).
- **Legacy:** One-time migration from `localStorage` `encryptedKey_{address}` when chain metadata is empty.

#### AI processing (completions)

1. Client decrypts history locally for display (if persisted).
2. Client `POST /api/chat/completions` with **plaintext** `messages` (`ChatWidget.tsx`).
3. API forwards sanitized messages to LLM upstream (Scaleway direct or self-hosted OpenAI-compatible URL per `llm-routing.ts`).
4. Client encrypts updated thread before the next save.

The server **does not** decrypt `encryptedBlob` from PostgreSQL for inference.

**Controls:** Log redaction (`log-redaction.ts`); optional Redis AI response cache (`AI_RESPONSE_CACHE`, plaintext replies keyed by message hash).

#### External services

| Service | Role | Plaintext? |
|---------|------|------------|
| LLM upstream (Scaleway or self-hosted) | Chat completions | Message content in API body; wallet/DID not in `buildSanitizedMessages` |
| OpenAI (if configured) | RAG embeddings for public FAQs/ToS only | Public corpus text, not user chat |
| Object storage | Optional encrypted **summaries** | Ciphertext; summary key may be server-generated (see encryption guide §9) |

#### Privacy guarantees and limits

| Guarantee | Limit |
|-----------|--------|
| Ciphertext-only chat blob in DB | Plaintext in completions request body |
| No server-side DEK storage | Optional server-generated summary keys |
| Wallet-wrapped DEK on-chain | Sepolia today (chain ID `11155111`) |
| Redacted logs | Not a guarantee against all processing copies |

#### Trust model (storage vs chat)

| Path | Content form |
|------|----------------|
| Save/load APIs | Ciphertext |
| Completions API | Plaintext (TLS) |
| LLM upstream | Plaintext messages |
| User device | Plaintext in session memory; DEK while active |

**Do not claim** “server decrypts stored chat for AI.” **Do claim** “encrypted at rest; client sends message content for each AI request.”

Approved wording: [CLAIMS_AND_TRUST_LANGUAGE.md](./CLAIMS_AND_TRUST_LANGUAGE.md).

---

## Content Privacy vs Metadata Privacy

This section clarifies the distinction between content privacy (what is encrypted) and metadata exposure (what is observable on-chain).

### Content Privacy

- **User content is encrypted before off-chain storage**: Authenticated chat history is encrypted client-side (AES-256-GCM) before `encryptedBlob` is stored. Completions use a separate plaintext-over-TLS path (see above).
- **Key material on-chain**: The wallet-wrapped DEK lives in the DID profile field **`encryptedKeyMetadata`** (bytes). Plaintext DEK is not on-chain.
- **On-chain references do not reveal content payloads**: Only cryptographic hashes of encrypted data are stored on-chain, not the encrypted data itself.

### On-Chain Metadata

The following metadata is stored on-chain for functional reasons:

- **DID identifiers**: Wallet addresses, token IDs, DID hashes (public identifiers)
- **DID documents**: Including contexts (string[]), ID strings, controller arrays (string[]), and updated timestamps (stored in `DIDMetadata` contract)
- **Service endpoints**: Service endpoint URLs are stored as plaintext strings on-chain (required for DID resolution, stored in `DIDService` contract). Endpoint URLs are publicly observable.
- **Public attributes**: Key-value attribute pairs stored in DID documents (stored as plaintext on-chain in `DIDMetadata` contract)
- **Credential references**: Credential hashes, types, issuer addresses, and issue timestamps (stored in `DIDMetadata` contract)
- **Authorization and lifecycle events**: All DID lifecycle events, authorization events, and data pointer updates are publicly queryable and permanent

### Off-Chain Metadata

The following data is not stored on-chain:

- **Encrypted content payloads**: Chat messages, summaries, and other user content (only hashes stored on-chain)
- **Message bodies**: Actual message content (encrypted and stored off-chain)
- **Private user attributes**: User content is encrypted before storage
- **Application-level analytics**: Usage patterns, preferences (not stored on-chain)

### Privacy Implications

While content remains confidential, on-chain metadata may:

- **Reveal interaction timing**: Event timestamps can show when DID operations occurred
- **Enable linkage between events**: Events indexed by tokenId can be linked to the same DID across time
- **Allow correlation across services**: Service endpoints may reveal service types and locations, enabling correlation with off-chain activity
- **Create permanent history trail**: DID document updates, attribute changes, and authorization events create an immutable history

This is a known and accepted trade-off in decentralized identity systems, where public metadata enables verifiability and resolution while content privacy is maintained through encryption.

### Design Intent

The system prioritizes:

1. **Strong content confidentiality at rest**: User chat blobs are client-encrypted and stored as ciphertext off-chain (not strict E2E to the LLM)
2. **Verifiable and resolvable identity**: Public metadata enables DID resolution and authorization verification
3. **Minimal but unavoidable metadata exposure**: Metadata exposure is minimized where possible, but some metadata (DID documents, service endpoints, events) is required for system functionality

---

## Optional Stronger Privacy Configurations

This section describes possible enhancements to reduce metadata exposure. **These approaches are not currently implemented and introduce trade-offs in complexity, cost, and resolvability.**

Possible enhancements to reduce metadata exposure include:

- **Hashing service endpoints**: Instead of storing service endpoint URLs in plaintext, store only hashes and require off-chain resolution
- **Off-chain DID documents**: Move DID documents fully off-chain with on-chain commitments (hashes only on-chain)
- **Privacy-preserving registries**: Use privacy-preserving blockchain solutions or ZK-based resolution mechanisms
- **DID rotation**: Rotate DIDs periodically to reduce long-term linkability (requires new DID minting and data migration)

**Trade-offs to consider**:

- **Complexity**: Off-chain resolution requires additional infrastructure and coordination
- **Cost**: Privacy-preserving solutions may increase gas costs or require additional services
- **Resolvability**: Reducing on-chain metadata may complicate DID resolution and verification
- **User experience**: More complex privacy configurations may impact usability

These approaches are documented for future consideration and are not enabled by default.
