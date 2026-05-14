# Programming sprint & implementation roadmap

> Restored from `COMPLETE_IMPLEMENTATION_SUMMARY.md` (last revision before deletion in commit `a45b56c14`). The **MVP launch** section is the live operator view. **Part 1 / Part 2** below were reconciled with `apps/web`, `apps/api`, and `apps/ai-chatbot` on **2026-04-12** (see **Repository verification**).
> 
> **Last updated:** 2026-05-14 — Phase D (web): chat DEK loads from DID `encryptedKeyMetadata` on-chain; `updateChatReference` sends UTF-8 key bytes; contract writes retry with backoff; legacy `localStorage` read-only migration. Retention / TTL / delete policy remains a product decision before schema work. Key rotation: design = re-wrap or regenerate DEK, re-encrypt all ciphertext, new `updateChatReference`; not automated yet.
>
> **Wallet verification (2026-05-10):** `AuthContext` POSTs JSON to **`/api/auth/wallet/connect`** and **`/api/auth/wallet/verify`**; `WalletContext` signs via EIP-1193 **`personal_sign`** (MetaMask + WalletConnect). API **`wallet-*` middleware** reads validated **`req.body`** first (legacy headers optional). See **`WALLET_COMPLETE_GUIDE.md`**.

---

## MVP launch roadmap (2026)

**Framework:** HubSpot’s [The $1M Solopreneur MVP](https://offers.hubspot.com/view/1m-solopreneur-mvp) stresses a **minimum viable *representation*** (ship something learnable fast), **maximize information per hour spent**, and pick tactics that match your strengths (landing + waitlist, demo video, lightweight tool, content, ads, “wizard of oz” manual fulfillment, etc.). SafePsy maps cleanly: **guest or wallet → DID → first Dr. Safe chat** is your activation story; everything else supports learning and trust, not vanity features.

### Canonical activation (what “launched” means)

Align with **`documentation/public documentation/BETA_QUICKSTART.md`**: user reaches value when **(1) DID exists** and **(2) at least one real exchange with Dr. Safe** has happened. Funnel metrics: visits → wallet connect attempts → successful session → DID mint → first chat completion → support/feedback.

### ✅ Repository verification (2026-04-12, updated 2026-05-10)

- ✅ **`npm run lint`** (root: web + api): passing  
- ✅ **Unit tests:** root **`npm test`** runs `vitest run` for web then API (exits cleanly for CI); per-app `cd apps/web && npm test` / `cd apps/api && npm test` are equivalent. All passing; API includes **`src/__tests__/subscribe.test.ts`**; `Status.test.tsx` uses `act()` around timer-driven updates so the suite stays warning-free.  
- ✅ **`npm run build`** (web + api): passing after pinning Tailwind to **`apps/web/tailwind.config.ts`** in **`apps/web/postcss.config.cjs`** so `vite build --config apps/web/vite.config.ts` from the monorepo root loads theme/content correctly  
- ✅ **Production fixes applied** (2026-05-08): DID update flow fixed in `ChatWidget.tsx`, `.env.production.example` created, `scripts/verify-production-setup.js` created, `PRODUCTION_FIXES_2026_05_08.md` documents all changes  
- ✅ **API layout (2026-05-10):** Express factory **`apps/api/src/app.ts`** (`createApp()`); **`/api/testing`** disabled in production via stub route in `app.ts`  

### Operator checklist — ship and learn

1. **Local sanity**
   - Root `env.example` → `.env`; `apps/api/.env.example` and web env templates filled (`DATABASE_URL`, JWT, chain/RPC, contract addresses, AI upstream as configured).
   - **Local dependencies (recommended)**: `docker compose -f docker-compose.local.yml up -d postgres redis` (and `--profile rag up -d qdrant` if using RAG). Then `npm run db:push`.
   - `npm install` at repo root; `npm run db:generate` / Prisma migrate as needed; `npm run dev` (web + API) for smoke testing.
   - **Waitlist storage**: DB is primary (`EmailSubscription`). If DB is unavailable, `/api/subscribe` can fall back to Google Sheets when enabled (see `.env` keys in `env.example`). Never commit service-account credentials; use a local file path and keep it out of git.

2. **Quality gate**
   - `npm run lint`, `npm run test`, `npm run build` before production.
   - Optional: `npm run verify:flow` for the mocked DID/auth path used in automation.

3. **Production deploy (this repository)**
   - Main path: **`deployment/deploy.sh`** — Terraform (`infra/terraform/envs/prod`) → chatbot stack on chatbot host → app deploy via **`deployment/deploy-app.sh`**. Requires Scaleway (or equivalent) credentials, Terraform variables, and SSH access; see script comments. Override **`APP_DOMAIN`**, **`APP_HOST`**, **`CHATBOT_HOST`**, **`SSH_KEY`** as needed; never commit secrets.
   - Legacy one-liner: `DEPLOY_LEGACY=1 ./deployment/deploy.sh` runs app deploy only.
   - Post-deploy: **`deployment/verify-production.sh`** (and any manual HTTPS/API checks you rely on).

4. **MVP learning tactics (pick 1–2 first week)**
   - **Beta access :** Use primary CTA—waitlist email and marketing via beta lmaunch website as well as social media.
   - **Demo video:** Short walkthrough (wallet, Sepolia, DID, first message); shareable without requiring a full product tour.
   - **Content MVP:** Reuse approved claims from **`documentation/public documentation/CLAIMS_AND_TRUST_LANGUAGE.md`** and positioning from **`documentation/private documentation/LAUNCH.md`** / **`PERSONAS.md`**.
   - **Wizard of Oz:** Manually onboard the first cohort while you observe friction (wallet, gas, errors).

5. **Weekly review**
   - Identify the largest funnel drop-off; fix that before new features. Re-read public security/privacy guides before changing copy.

### Local API sanity (quick)

- **`GET http://localhost:3001/healthz`** — expect `200` and body `ok` when the API process is running (Express root health; not the SPA).
- **`POST /api/auth/wallet/connect`** — send **`Content-Type: application/json`** with body at minimum `{ "address": "<0x…42>", "chainId": 11155111 }` (Sepolia). Empty `{}` fails validation (`address` required).
- **`POST /api/auth/wallet/verify`** — SIWE **`message`** + **`signature`** required; **`address`** / **`chainId`** optional (recovered from EIP-4361 when omitted). Legacy **`x-wallet-*`** headers still accepted behind **`validateWalletSignature`**.

---

## Integration status (wallet + docs, 2026-05-10)

- **SIWE (EIP-4361) + nonce replay protection (2026-05-10):** **`POST /api/auth/wallet/connect`** returns a **`SiweMessage.prepareMessage()`** challenge (domain **`SIWE_DOMAIN`** / **`safepsy.com`** default); **`wallet-nonce.service`** registers the nonce (TTL **5 min**); **`POST /api/auth/wallet/verify`** requires SIWE format, **`consumeWalletNonce`**, then JWT + **`walletSession`** cookie (**`sameSite: 'lax'`**). Verify accepts **`{ message, signature }`** only (address recovered from SIWE). Replace in-memory nonce store with **Redis** when running multiple API replicas.
- **Cookie-first web:** **`walletSessionToken`** removed from **`localStorage`**; authenticated fetches use **`credentials: 'include'`**; **`useWalletLogin`** orchestrates connect → SIWE → verify; **`AuthContext`** confirms session via **`GET /api/auth/me`**.

- **P0 resolved:** Aligned **JSON bodies** + SIWE; **`WalletContext`** only signs; session is **httpOnly cookie** + optional JWT in verify response (web no longer stores JWT). **`checkDID({ skipVerifiedCheck: true })`** and **`fetchWalletSession()`** on refresh.
- **DID base URL:** **`DIDManager.tsx`** uses **`apiUrl()`** from **`apps/web/src/config/api.ts`** (same-origin **`/api`** when `VITE_API_URL` unset).
- **Docs:** **`WALLET_COMPLETE_GUIDE.md`** / **`TESTING_COMPLETE_GUIDE.md`** / **`SECURITY_COMPLETE_GUIDE.md`** describe **`/api/auth/*`** and **`/api/did/*`** as production paths; **`/api/testing/*`** is dev-only.

### Phase D — Encryption keys (web, 2026-05-14)

**Shipped (web):** **`useChatEncryption`** reads wallet-wrapped DEK from **`getEncryptedKeyMetadata`** (identity token). **`saveKeyToDID`** calls **`updateEncryptedKeyMetadata`**. **`ChatWidget`** passes key bytes into **`updateChatReference`** (via **`keyMetadataBytesForDidUpdate`**) so saves no longer clear on-chain metadata. **`localStorage`** `encryptedKey_*` is **migration-only** when chain metadata is still empty.

### Data retention & encryption

- **`EncryptedChat`** (`schema.prisma`): ciphertext at rest; **no TTL** today.
- **Product / legal (open):** choose one or combine before implementation: **(A)** time-based TTL + job, **(B)** user-initiated delete API + UI, **(C)** export-then-delete. Until then, no new Prisma fields or purge jobs.
- **Key rotation (design):** generate new DEK, `encryptSymmetricKey` with wallet, `updateEncryptedKeyMetadata` or `updateChatReference` with new bytes, re-encrypt full history client-side, then `POST /api/chat/save` once; optional dual-write window if you must read old blobs during migration.

### Staging E2E (Sepolia checklist)

1. From **`apps/web`**: **`npm run verify:sepolia-staging`** (same as `node scripts/verify-sepolia-staging-checklist.mjs`). Optional **`STAGING_API_ORIGIN=https://your-api-host`** if `VITE_API_URL` is unset or same-origin. Fix any **DID address / RPC** failures before manual wallet steps.
2. Web + API against staging URLs; **`VITE_DID_IDENTITY_TOKEN_ADDRESS`** and **`VITE_API_URL`** set for Sepolia (DID address must match **`apps/api/deployments/sepolia-latest.json`** → `DIDIdentityTokenV2.address`).
3. Connect wallet → SIWE verify → cookie session (**`GET /api/auth/me`**).
4. Mint or confirm DID (**`/api/did/info`** has **`hasDid`**).
5. Send chat turn → wait for save → confirm **`updateChatReference`** tx on Sepolia explorer (blob hash + nonzero metadata length).
6. Hard refresh → chat decrypts without re-entering wallet beyond normal session.

### P2 — Doc reconciliation

- **`DID_COMPLETE_GUIDE.md`**: reconcile any lingering **mainnet** wording with **Sepolia-first** runtime (`did.service.ts`, auth routes).

---

## Waitlist implementation notes (2026-05-08)

- ✅ **Consent required**: `/api/subscribe` requires `consentGiven=true` and returns `400 { success:false, message:"Consent is required" }` otherwise.
- ✅ **Rate limit UX**: subscription endpoint is limited to **5/min**, returns `429` with a user-facing message.
- ✅ **Frontend consolidation**: a shared `WaitlistForm` component is used in `Hero`, `Landing`, and `EmailSignup` to ensure payload consistency and aligned validation/copy.

## Production readiness (2026-05-08)

**Status:** Sepolia beta ready — pending Scaleway API key configuration and secrets generation.

### Critical fixes applied

1. **DID contract update flow** — `ChatWidget.tsx` now properly:
   - Saves encrypted chat to database via `saveChat()`
   - Fetches the latest chat record to get `blobHash`
   - Calls `updateChatReference()` on DID contract
   - Shows user feedback via toast notifications
   - Makes DID update failures non-blocking (chat still saves)

2. **Frontend DID configuration** — Added `VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053` (Sepolia)

3. **Production environment template** — Created `.env.production.example` with:
   - Complete list of required/optional environment variables
   - Secret generation commands (`openssl rand -hex 32`)
   - Network-specific contract addresses (Sepolia/Mainnet)
   - Deployment checklist in comments

4. **Verification script** — Created `scripts/verify-production-setup.js`:
   - Validates environment variables (length, format)
   - Checks secret requirements (JWT_SECRET min 32 chars)
   - Tests external services (database, RPC, Scaleway API)
   - Exit codes: 0 (pass), 0 with warnings, 1 (must fix)

### Remaining action items (before production deploy)

1. **Scaleway API Key** — ✅ Present in repo root `.env` as `SCALEWAY_API_KEY` (local dev). For production/CI, ensure the same variable is set on the host or in GitHub/deploy secrets (not committed).

2. **Generate production secrets**:
   ```bash
   openssl rand -hex 32  # For JWT_SECRET
   openssl rand -hex 32  # For IP_SALT (if enabling IP hashing)
   ```

3. **Fund backend signer wallet** (optional for backend-initiated DID minting) — ✅ Done (~0.1 ETH on Sepolia).

4. **Run verification**:
   ```bash
   node scripts/verify-production-setup.js
   ```

See full details in **`documentation/public documentation/PRODUCTION_FIXES_2026_05_08.md`**.

## ✅ Part 1: Client-side encryption for storage (ChatWidget)

### Files Created/Modified

#### Backend
1. **Database Schema** (`apps/api/schema.prisma`)
   - ✅ `EncryptedChat` model for off-chain storage

2. **API Endpoints** (`apps/api/src/routes/chat.ts` + `apps/api/src/routes/chat-completions.ts`)
   - ✅ `POST /api/chat/save` — save encrypted chat
   - ✅ `GET /api/chat/load` — load encrypted chat
   - ✅ `POST /api/chat/completions` — mounted via `mountChatCompletions(router)` (shared handler with rate limits, guest mode, streaming)

3. **Encryption Utilities** (`apps/web/src/utils/did-encryption.ts`)
   - ✅ Wallet-based key encryption/decryption
   - ✅ AES-GCM chat encryption

#### Frontend
1. **Encryption Hook** (`apps/web/src/hooks/useChatEncryption.ts`)
   - ✅ Key management and chat load/save with encryption (verified-wallet path)
   - ⚠️ **Refinement:** symmetric key still falls back to **localStorage** when loading from DID metadata is incomplete; `saveKeyToDID` does not yet submit on-chain metadata (comments reference legacy `setDidData` wording — V2 flow uses **`updateChatReference`** from the widget)

2. **ChatWidget Integration** (`apps/web/src/components/ChatWidget.tsx`)
   - ✅ Uses `useChatEncryption` for verified sessions; guest mode stays in-memory with capped prompts
   - ✅ After save, when the API returns `requiresDidUpdate`, calls **`updateChatReference`** (`apps/web/src/utils/did-contract.ts`) to update the on-chain chat reference

### Encryption Scheme Details

**Key Material:**
- **Symmetric Key**: 32-byte AES-256-GCM key (generated client-side)
- **Encrypted Key**: Symmetric key encrypted with wallet signature
- **Storage**: Encrypted key in DID's `encryptedData` field (target); interim localStorage path remains in hook

**Data Flow:**
1. Generate symmetric key (client-side)
2. Encrypt key with wallet signature
3. Store encrypted key in DID
4. Use symmetric key to encrypt chat messages
5. Store encrypted chat in database
6. Store chat hash in DID for verification

**Security:**
- Chat and summary data are stored encrypted (ciphertext-only) and decrypted client-side for display.
- To provide AI responses, message content is decrypted temporarily in server memory during the request and sent to the AI provider for completion (not strict end-to-end encryption).
- Symmetric key never stored unencrypted
- Only wallet owner can decrypt (requires private key)

---

## ✅ Part 2: Production API Refactoring (core complete)

### Legacy / parallel testing endpoints (`apps/api/src/routes/testing.ts`)

Handlers remain in **`testing.ts`** for local/dev use. **`apps/api/src/app.ts`** mounts them only when **`NODE_ENV !== 'production'`**; in production the same path returns **`404`** (no legacy testing router), so `/api/testing/*` is not exposed on live deploys.

### ✅ Production endpoints (implemented)

- ✅ `POST /api/auth/wallet/connect` — `apps/api/src/routes/auth.ts`
- ✅ `POST /api/auth/wallet/verify` — same
- ✅ `GET /api/auth/session` — same
- ✅ `POST /api/auth/logout` — same
- ✅ `POST /api/did/check` — DID routes
- ✅ `POST /api/did/create` — DID routes
- ✅ `GET /api/did/info` — DID routes
- ✅ `POST /api/chat/save` — `chat.ts`
- ✅ `GET /api/chat/load` — `chat.ts`

### API refactoring — status

1. ✅ Create **`/api/auth/*`** routes (`routes/auth.ts`, mounted in **`app.ts`** via `createApp()`)
2. ✅ Wallet session logic available on production auth routes (legacy testing routes only in non-production)
3. ✅ **Gate `/api/testing` in production** — `createApp()` mounts **`testing`** only when not production; production responds with **`404`**
4. ✅ **Shared request validation** — `validate()` + Joi in `apps/api/src/middleware/validation.ts` (used across routes)

---

## Implementation Status

### ✅ Completed (verified in repo)

- [x] ✅ Encryption utilities (AES-GCM, wallet-based key encryption)
- [x] ✅ Database schema for encrypted chat storage
- [x] ✅ Backend chat save/load + **completions** (`chat-completions.ts`)
- [x] ✅ Frontend encryption hook
- [x] ✅ DID-aware chat persistence path (widget + contract `updateChatReference` when required)
- [x] ✅ ChatWidget integration with `useChatEncryption`
- [x] ✅ Production **`/api/auth/*`** endpoints

### ⚠️ Backlog / refinements

- [ ] **P0 — Align wallet auth HTTP client with API validation** — Update `WalletContext.tsx` and `AuthContext.tsx` so `POST /api/auth/wallet/connect` and `POST /api/auth/wallet/verify` include the same **JSON bodies** as `SafePsyWeb3Client` (plus existing headers). Optionally dedupe by routing connect/verify through one shared helper to avoid drift.
- [ ] **P0 — Re-test MVP funnel manually** — After the fix: connect wallet → verify signature → `GET/POST /api/did/check` → create DID if needed → encrypted chat save/load on Sepolia.
- [ ] **P1 — Cookies vs Bearer** — Standardize `credentials: 'include'` and/or rely on JWT header only; avoid double `/wallet/verify` if redundant once unified.
- [ ] **P1 — Unify API base URL** — Align `DIDManager` (and any other stragglers) with `VITE_API_URL || ''` same-origin pattern from `config/api.ts` / `AuthContext`.
- [ ] **P1 — Docs pass** — Refresh `WALLET_COMPLETE_GUIDE.md` (`/api/auth/*`) and Sepolia wording in `DID_COMPLETE_GUIDE.md`.
- [ ] **Persist encrypted symmetric key** via DID/contract metadata (reduce reliance on localStorage in `useChatEncryption`)
- [x] **Gate `/api/testing` in production** — implemented in `apps/api/src/app.ts` (`NODE_ENV === 'production'` → stub `404`)
- [ ] **Key rotation mechanism** (security checklist)
- [ ] **Contract failure handling** / retries for on-chain updates (security checklist + hook comments)
- [ ] **Continuous end-to-end testing** beyond unit tests (wallet + chain smoke in staging)
- [ ] **Optional policy:** **retention / deletion** for `EncryptedChat` (product decision + migration), if compliance requires TTL or user-initiated wipe beyond current flows

### ~~Remaining Tasks~~ (historical — superseded by verification above)

1. ~~Update ChatWidget to use `useChatEncryption`~~ → ✅ Done  
2. ~~Add contract interaction for on-chain chat reference~~ → ✅ `updateChatReference` from ChatWidget  
3. ~~Create production auth endpoints~~ → ✅ Done  
4. ~~Add shared API utilities~~ → ✅ `middleware/validation` pattern in place  
5. **Test end-to-end flow** — operator/staging responsibility (see MVP checklist)

---

## Quick Start Guide

### 1. Run Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_encrypted_chats
```

### 2. Update Environment Variables

```env
# Backend
DATABASE_URL=postgresql://...
DID_IDENTITY_TOKEN_ADDRESS=0x...
RPC_URL=https://sepolia.infura.io/v3/...
JWT_SECRET=your-secret-key
```

### 3. Test Endpoints

```bash
# Wallet connect (nonce + message) — body required for Joi
curl -s -X POST http://localhost:3001/api/auth/wallet/connect \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x0000000000000000000000000000000000000001" \
  -H "x-chain-id: 11155111" \
  -d '{"address":"0x0000000000000000000000000000000000000001","chainId":11155111}'

# Wallet verify — body must include address, message, signature (see validationSchemas.walletSignature)
# curl -X POST http://localhost:3001/api/auth/wallet/verify ...

# Save encrypted chat
curl -X POST http://localhost:3001/api/chat/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"encryptedChatBlob": "...", "didTokenId": "123"}'

# Load encrypted chat
curl -X GET http://localhost:3001/api/chat/load \
  -H "Authorization: Bearer <token>"
```

## Code Examples

### Frontend: Using Encryption Hook

```typescript
import { useChatEncryption } from '../hooks/useChatEncryption';

function ChatWidget() {
  const { symmetricKey, loadChat, saveChat, isLoading } = useChatEncryption();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (symmetricKey) {
      loadChat().then(setMessages);
    }
  }, [symmetricKey]);

  const handleSend = async (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    
    const updated = [...messages, newMessage];
    setMessages(updated);
    await saveChat(updated);
  };
}
```

### Backend: Protecting Chat Endpoints

```typescript
import { authenticateWallet } from '../middleware/auth';

router.post('/save', authenticateWallet, async (req, res) => {
  const wallet = req.wallet; // Authenticated wallet
  // Save encrypted chat...
});
```

## Security Checklist

- [x] ✅ Symmetric key generated client-side
- [x] ✅ Key encrypted with wallet signature
- [x] ✅ Plaintext not persisted (ciphertext-only storage); plaintext is decrypted temporarily in server memory for AI completions
- [x] ✅ Only ciphertext stored
- [x] ✅ DID ownership verified
- [x] ✅ Network validation (Sepolia by default in current deployments)
- [ ] Key rotation mechanism
- [ ] Contract failure handling

## Notes

- V2 DID contract uses **`updateChatReference`** / **`updateChatDataReference`** (`did-contract.ts`); older `setDidData` wording in hook comments is misleading — prefer aligning comments with the live ABI.
- Key rotation requires re-encrypting all chat history
- Network failures: chat saved locally, DID update retried later
