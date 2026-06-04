# Encryption Complete Guide - SafePsy

> **GDPR and consent:** For data protection impact, consent flows, and compliance framing, see the [Data Protection Impact Assessment (DPIA)](/dpia) in the SafePsy application.

This guide explains how SafePsy protects chat data. Each section starts with a short, plain-language summary, then adds technical detail for developers and reviewers.

**Related docs:** [PRIVACY-BY-DESIGN.md](./PRIVACY-BY-DESIGN.md) · [CLAIMS_AND_TRUST_LANGUAGE.md](./CLAIMS_AND_TRUST_LANGUAGE.md) · [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md) · [CHAT_COMPLETE_GUIDE.md](./CHAT_COMPLETE_GUIDE.md)

---

## 1. Your wallet is your key

### In plain terms

SafePsy does not run a password-based account with a “reset my data” button. Your **wallet** unlocks your encrypted chat history. If you lose the wallet (seed phrase gone), SafePsy **cannot** recover your chats. We do not store your encryption keys on our servers.

Back up your **wallet seed phrase**, not a separate SafePsy password. A hardware wallet (Ledger, Trezor, etc.) is recommended for high-value wallets.

### Technical detail

- **Access model:** Wallet-gated. No key escrow, no server-side DEK/KEK storage.
- **Recovery:** Deterministic only if you still control the wallet that created or wrapped the DEK.
- **Implementation:** `apps/web/src/utils/did-encryption.ts`, `apps/web/src/hooks/useChatEncryption.ts`, mobile parity in `apps/safepsy-mobile/src/lib/didEncryption.ts`.

---

## 2. How encryption fits together (big picture)

### In plain terms

Think of two locks:

1. **Chat lock (DEK):** A random secret encrypts your full conversation before it is saved.
2. **Wallet lock (KEK):** That random secret is itself encrypted using material derived from a **one-time wallet signature**, then stored on your DID on-chain.

Saved chats live in SafePsy’s database as **ciphertext only**. The wrapped chat key lives in your DID’s **`encryptedKeyMetadata`** on-chain. Only your browser (or the mobile app) can unwrap the key and read the chat.

When you talk to Dr. Safe, your device sends **readable message text** to our API over HTTPS so the AI can reply. That is separate from storage: we are **not** opening your saved ciphertext on the server to run the model.

### Technical detail

```
Layer 1 — Chat (off-chain DB)
  Algorithm: AES-256-GCM
  Key: random 32-byte DEK
  Payload: JSON chat history → single encrypted blob (iv:ciphertext hex)

Layer 2 — Key wrap (on-chain DID profile)
  Algorithm: AES-256-GCM
  KEK: SHA-256( UTF-8(signature) ‖ UTF-8(walletAddressLower) )
  Payload: DEK → stored as signature:ivHex:ciphertextHex in encryptedKeyMetadata (bytes)
  On-chain chat pointer: chatDataReference = SHA-256(encrypted blob) as bytes32
```

---

## 3. AI, privacy, and trust boundaries (read this carefully)

### In plain terms

**This is not “end-to-end encryption” in the strict sense** (where only you and the other party ever see plaintext).

| Phase | What happens |
|--------|----------------|
| **Saving chat** | Your browser encrypts the conversation, then uploads **ciphertext** to SafePsy. |
| **Loading chat** | SafePsy returns ciphertext; your browser decrypts it locally. |
| **Talking to Dr. Safe** | Your browser sends **plaintext messages** (over TLS) to SafePsy’s API so the model can answer. The server does **not** decrypt your database blob for this step. |
| **After the reply** | Your browser encrypts the updated thread again before saving. |

So: **strong encryption at rest**, but **the server and LLM provider see message content during each chat request** by design.

**Guest mode:** Without a verified wallet session, messages stay **only in browser memory** (capped prompts). Nothing is written to the encrypted chat store.

### Technical detail

**Authenticated chat completion flow**

1. Client: `ChatWidget` keeps messages in memory (decrypted after `loadChat` or new typing).
2. Client: `POST /api/chat/completions` with `{ messages: [{ role, content }], mode: 'authenticated' }` (plaintext bodies).
3. API: `chat-completions.ts` → `aiGatewayService` → LLM upstream (see §8).
4. Client: encrypts full history via `useChatEncryption.saveChat` → `POST /api/chat/save` with `encryptedChatBlob` only.

**Load/save paths never feed the LLM from `encryptedBlob`:** `GET /api/chat/load` returns ciphertext; decryption is client-side (`decryptChatHistory`).

**Trust boundaries**

| Component | Plaintext chat content? | Notes |
|-----------|-------------------------|--------|
| User device | Yes (session memory) | DEK in memory while session active |
| SafePsy API (completions) | Yes (request body, in-memory) | Does not derive wallet KEK; cannot decrypt DB blob without client DEK |
| PostgreSQL `encrypted_chats` | No | `encryptedBlob` only |
| LLM upstream | Yes (messages array) | Wallet/DID not attached in `buildSanitizedMessages` |
| TLS on the wire | Ciphertext on wire | HTTPS |

**Logging:** `apps/api/src/middleware/log-redaction.ts` redacts message bodies and keys in HTTP logs; this reduces accidental logging but is not a substitute for architectural privacy.

**Do not claim:** “SafePsy decrypts your saved chat on the server for AI.” **Do claim:** “Chat is encrypted at rest; for each AI request the client sends message content over TLS.”

---

## 4. Guest mode vs authenticated mode

### In plain terms

- **Guest:** Try Dr. Safe without saving an encrypted history to your account. Messages disappear on refresh (in-memory only).
- **Authenticated:** Connect wallet, sign in (SIWE), create or use a DID, then chat is encrypted and persisted.

### Technical detail

| | Guest | Authenticated |
|---|--------|----------------|
| Hook | Not used | `useChatEncryption` |
| Completions | `mode: 'guest'` | `mode: 'authenticated'` + session cookie |
| Persistence | None | `POST /api/chat/save` + on-chain `chatDataReference` / `encryptedKeyMetadata` |
| Reference | `ChatWidget.tsx`, `useChatEncryption.ts` header comment |

---

## 5. Keys: DEK, KEK, and when you sign

### In plain terms

- **DEK:** Random key that encrypts your chat JSON. Created the first time you need encrypted storage (or migrated from legacy browser storage once).
- **KEK:** Derived from a **fixed-purpose wallet signature** plus your address. Used only to wrap/unwrap the DEK.
- **First-time setup:** You sign the “SafePsy Chat Encryption Key” message once; the signature is **stored inside** the on-chain metadata so later visits can verify and unwrap without signing that message again.
- **Every visit:** You still **sign in** with your wallet (SIWE / session) to use the app and call save/load APIs.

### Technical detail

**Key-encryption message (exact):**

```
SafePsy Chat Encryption Key
Wallet: {walletAddress.toLowerCase()}
Purpose: Encrypt symmetric key for chat history
```

**KEK derivation:** `SHA-256( encode(signature) ‖ encode(addressLower) )` → 32 bytes. Not PBKDF2.

**Wire format (wallet-wrapped DEK):**

```
{signature}:{ivHex}:{ciphertextHex}
```

Inner `ivHex:ciphertextHex` is AES-256-GCM over the raw 32-byte DEK.

**Decrypt path:** `decryptSymmetricKey` reads `signature` from stored metadata, `ethers.verifyMessage`, re-derives KEK, unwraps DEK. Signer is not required to sign again (`_signer` unused).

**New DEK:** `encryptSymmetricKey` → `updateEncryptedKeyMetadata` on-chain (`did-contract.ts`, `did-key-metadata.ts`).

**Legacy:** `localStorage` key `encryptedKey_{address}` is read once for migration when chain metadata is empty, then removed after successful on-chain write.

---

## 6. Where data is stored

### In plain terms

| What | Where |
|------|--------|
| Encrypted chat | SafePsy database (off-chain) |
| Hash of that chat | On-chain `chatDataReference` (pointer only, not the message text) |
| Wrapped chat key (DEK) | On-chain `encryptedKeyMetadata` |
| Plaintext DEK | Only in your device memory during the session |

### Technical detail

**PostgreSQL (`EncryptedChat` / `encrypted_chats`):**

- `encryptedBlob` — ciphertext (hex `iv:ciphertext` from `did-encryption`)
- `encryptedBlobHash` — SHA-256 of blob (synced to DID reference)
- `encryptedSummaryRef` — optional pointer to off-chain summary object
- `didTokenId` — optional link to identity token
- `encryptedKey` — schema field; not populated by current save handler (metadata is on-chain)

**On-chain (`DIDIdentityToken` profile tuple):**

- `chatDataReference` — `bytes32` hash of encrypted blob
- `encryptedKeyMetadata` — `bytes`, UTF-8 encoding of `signature:iv:ciphertext` string
- `createdAt` / `lastUpdatedAt` — uint64 profile fields (not a JSON document on-chain)

**There is no on-chain JSON** of the form `{ encryptedKey, chatHash, updatedAt }` as a single blob; those are separate contract fields.

**Network (current deployment):** **Sepolia testnet** (chain ID `11155111`). API rejects other chains for chat save/load. See `apps/api/src/lib/constants.ts`. Mainnet is a future configuration change, not the current default.

---

## 7. Accessing your encrypted chat

### In plain terms

1. Connect wallet on **Sepolia** (as required by the app today).
2. Sign in (SIWE) to get a session.
3. If you already have a DID with key metadata, the app loads and unwraps your DEK (using the signature stored on-chain).
4. If you are new, you sign the chat encryption message once when the DEK is created.
5. Load: API returns ciphertext → browser decrypts → you see history.
6. Chat: browser sends plaintext to AI → browser encrypts → save ciphertext.

### Technical detail

**Auth middleware for chat APIs:** `authenticateWallet` in `apps/api/src/middleware/auth.ts` (JWT session from wallet connect), not `did-verify` on save/load.

**Initialization:** `useChatEncryption.initializeKey` order:

1. `getEncryptedKeyMetadata` → `onchainMetadataToEncryptedChatKey` → `decryptSymmetricKey`
2. Else legacy `localStorage` migrate → `updateEncryptedKeyMetadata`
3. Else `generateSymmetricKey` + `encryptSymmetricKey` + persist on-chain

**Load:** `GET /api/chat/load` → `decryptChatHistory(encryptedChatBlob, symmetricKey)`.

---

## 8. LLM routing (Scaleway and alternatives)

### In plain terms

Production may send chat requests to **Scaleway Generative API** or to a **self-hosted** OpenAI-compatible service, depending on environment variables. In both cases the upstream receives **message text**, not your wallet address in the message payload.

### Technical detail

- Routing: `apps/api/src/lib/llm-routing.ts` — `shouldUseScalewayDirect()` → Scaleway direct vs `AI_GPU_BASE_URL` / `CHATBOT_BASE_URL` chain.
- Sanitized payload: `ai-gateway.service.ts` → `buildSanitizedMessages()` (roles + content + system prompt only).
- Default model (Scaleway path): `SCALEWAY_MODEL` or `mistral-small-3.2-24b-instruct-2506`.
- Health: `GET /api/chat/upstream-status` (optional secret).

---

## 9. Optional chat summaries (separate from wallet DEK)

### In plain terms

When you save encrypted chat, the backend **may** also create an **encrypted summary** stored in object storage (S3/IPFS-style). That summary uses a **server-generated** encryption key, not your wallet DEK. The web client today usually does not send message plaintext on save, so summaries are often a short metadata fallback rather than an AI summary of the full thread.

### Technical detail

- Trigger: `POST /api/chat/save` with `generateSummary: true` (default).
- If `messages` array is included in the body, `generateChatSummary()` calls the AI gateway on **plaintext** messages.
- Web `saveChat` in `useChatEncryption.ts` does **not** send `messages`; fallback summary string is used.
- Summary encrypted with `encryptAES256GCM` + `generateEncryptionKey()` in `apps/api/src/lib/crypto.ts` (base64 wire format in `encryption.ts`).
- `encryptedSummaryKey` may be returned base64 in the save response; retrieval via `GET /api/chat/summary` and `chat-summary-retrieval.ts`.

---

## 10. Response caching

### In plain terms

If enabled in deployment, SafePsy can cache **AI reply text** in Redis keyed by a hash of the conversation messages. That is a performance feature, not part of your encrypted chat blob. Disable with `AI_RESPONSE_CACHE=0`.

### Technical detail

- `apps/api/src/lib/response-cache.ts` — `cacheResponse(messages, response)` on non-streaming Scaleway completions.
- TTL: `AI_RESPONSE_CACHE_TTL` (default 3600s).
- Stores **plaintext assistant output**, not user DB ciphertext.

---

## 11. DID revocation: what it does and does not do

### In plain terms

Revoking your DID is an **on-chain** action. It marks your identity token as revoked and is intended to stop **future** platform use tied to that DID. It does **not** erase ciphertext already in our database or bytes already on-chain.

**Important:** Today, encrypted chat **save/load** endpoints authenticate your **wallet session** and do not automatically block revoked DIDs. Revocation is not a cryptographic wipe of stored chats. Export or delete chat data separately if you need off-chain removal. On-chain hashes and metadata remain immutable.

### Technical detail

- Revocation check: `didService.isRevoked`, user-initiated via contract + `POST /api/did/revoke` (instructions response).
- `did-verify` middleware enforces revocation on routes that mount it (e.g. some testing/DID flows), **not** on `/api/chat/save` or `/api/chat/load`.
- Product copy should not promise “revocation instantly deletes all encrypted chat access” without noting API behavior.

---

## 12. Multi-device use

### In plain terms

Use any device with your wallet. Each device loads the same wrapped DEK from your DID on-chain after you sign in. There is no SafePsy “key sync service”; the blockchain metadata is the sync point.

### Technical detail

Same `encryptedKeyMetadata` bytes for all clients; mobile uses the same string format as web. Each device must complete wallet auth and hold DEK in memory independently.

---

## 13. Security practices

### In plain terms

Protect your seed phrase, prefer a hardware wallet, lock your device, sign out on shared computers, and understand that AI chat requires sending message content to our infrastructure.

### Technical detail

- Align marketing with [CLAIMS_AND_TRUST_LANGUAGE.md](./CLAIMS_AND_TRUST_LANGUAGE.md).
- Avoid claiming strict E2E or “we never see your messages.”
- Crisis detection and RAG may add system context server-side (`chat-rag-context.ts`, `dr-safe-system-prompt.ts`).

---

## 14. FAQ

### Can SafePsy recover my data if I lose my wallet?

**No.** Without the wallet that wrapped your DEK, we cannot unwrap your ciphertext.

### Is my chat end-to-end encrypted?

**No, not in the strict sense.** At rest it is client-encrypted; for each Dr. Safe request the client sends plaintext over TLS to the API and LLM upstream.

### Does the server decrypt my saved chat for AI?

**No.** The client decrypts for display, then sends plaintext in the completions request. The server never applies your wallet KEK to `encryptedBlob` for inference.

### Does SafePsy store my encryption keys?

**No plaintext DEK/KEK on servers.** Wrapped DEK is on-chain in `encryptedKeyMetadata`.

### What network do I use?

**Sepolia testnet** today (`11155111`). The app prompts you to switch if needed.

### What happens if I revoke my DID?

On-chain revocation is permanent for that identity. Off-chain encrypted blobs may still exist until you delete them; chat APIs may still allow session-authenticated access until product policy adds explicit revocation gates.

### Guest vs logged-in encryption?

Guests: no encrypted persistence. Logged-in: full wallet-wrapped DEK path.

### Can I use multiple devices?

**Yes**, with the same wallet and on-chain key metadata.

### What does the LLM provider see?

Message roles and content (and system prompt). Not wallet or DID in `buildSanitizedMessages`. Network-level metadata may still apply at the provider.

### What encryption algorithms are used?

**AES-256-GCM** for chat and key wrap; **SHA-256** for wallet-based KEK. PBKDF2 exists in `encryption.ts` / `crypto.ts` for optional password-based use, not for wallet DEK wrap.

---

## 15. Developer reference

### Key files

| Area | Path |
|------|------|
| Wallet wrap + chat crypto (web) | `apps/web/src/utils/did-encryption.ts` |
| Base64 AES helpers (summaries) | `apps/web/src/utils/encryption.ts` |
| On-chain metadata encode/decode | `apps/web/src/utils/did-key-metadata.ts` |
| Chat encrypt hook | `apps/web/src/hooks/useChatEncryption.ts` |
| Chat UI + completions | `apps/web/src/components/ChatWidget.tsx` |
| Mobile parity | `apps/safepsy-mobile/src/lib/didEncryption.ts` |
| Server AES / summary keys | `apps/api/src/lib/crypto.ts` |
| Chat routes | `apps/api/src/routes/chat.ts`, `chat-completions.ts` |
| LLM gateway | `apps/api/src/lib/ai-gateway.service.ts` |
| Session auth | `apps/api/src/middleware/auth.ts` |
| DID verify (selected routes) | `apps/api/src/middleware/did-verify.ts` |
| Log redaction | `apps/api/src/middleware/log-redaction.ts` |

### API surface (authenticated chat storage)

- `POST /api/chat/save` — body: `{ encryptedChatBlob, didTokenId?, generateSummary?, messages? }`
- `GET /api/chat/load` — returns `{ encryptedChatBlob, blobHash, ... }`
- `POST /api/chat/completions` — body: `{ messages, mode: 'guest' \| 'authenticated', stream? }`

### Further reading

- `documentation/private documentation/TECHNICAL_REVIEW.md` (encryption bullet and product-truth pointers)
- `documentation/public documentation/PRIVACY-BY-DESIGN.md` (encryption scope section)

---

## 16. Summary

### In plain terms

1. **Wallet = access** to your encrypted history; no SafePsy recovery without it.
2. **Saved chats** are ciphertext in our DB; **keys** are wallet-wrapped on your DID.
3. **Dr. Safe** needs plaintext each turn: your browser sends it; we do not decrypt the DB blob for AI.
4. **Guests** do not get persistent encrypted storage.
5. **Revocation** is on-chain identity lifecycle, not automatic deletion of off-chain ciphertext.
6. **Summaries and AI cache** are separate mechanisms; know what your deployment enables.

### Technical detail

| Guarantee | Limit |
|-----------|--------|
| Ciphertext-only `encryptedBlob` in Postgres | Plaintext in `/api/chat/completions` body |
| No server-side DEK/KEK storage | Server-generated summary keys optional |
| `encryptedKeyMetadata` on-chain | Sepolia-only chain guard today |
| Log redaction for sensitive fields | Redis AI response cache optional |
| Client-side encrypt before save | Not Signal-style E2E to the LLM |

---

*Last aligned with repository behavior: web `useChatEncryption` + `ChatWidget`, API `chat.ts` / `chat-completions.ts` / `ai-gateway.service.ts`, chain ID Sepolia `11155111`.*
