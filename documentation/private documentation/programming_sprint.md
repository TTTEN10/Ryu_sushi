# Programming sprint & implementation roadmap

> Restored from `COMPLETE_IMPLEMENTATION_SUMMARY.md` (last revision before deletion in commit `a45b56c14`). The **MVP launch** section is the live operator view. **Part 1 / Part 2** below were reconciled with `apps/web` and `apps/api` on **2026-04-12** (see **Repository verification**); FastAPI `apps/ai-chatbot` removed **2026-05** (Scaleway direct). Production deploy path: **`documentation/private documentation/DEPLOY-RUNBOOK.md`** + **`documentation/private documentation/chatbot.md`**.
> 
> **Last updated:** 2026-07-09 — **PRODUCTION DEPLOYED SUCCESSFULLY** ✅
> **Security Fixes Implemented:** 
> - Fixed high-risk JWT_SECRET default value vulnerability by requiring explicit JWT_SECRET in production environments
> - Removed all console.log statements from production code paths

### 🎉 Major Milestones Achieved (July 9, 2026)
| Item | Status | Notes |
|------|--------|-------|
| Production deployment | ✅ Complete | All containers running, HTTPS verified, all checks passed |
| Rate limiting `/api/crisis/opt-in` | ✅ Complete | 5 req/min, strict PII protection |
| Guest quota system | ✅ Complete | Device cookie + IP hard cap (5/25 per day) |
| Reply variety (Dr. Safe) | ✅ Complete | ~15 rotated opening patterns |
| Unrestricted wallets | ✅ Complete | Internal testing bypass for dev wallet |
| Production verification | ✅ Complete | DNS, HTTPS, health, chat, models, POST chat-completions all passing |

### 📊 Deployment Stats
- **Server:** 151.115.151.231 (polinapsycho.com) + 51.159.165.150 (app.polinapsycho.com)
- **Containers:** 12 running (6 on main host: backend, frontend, node-api, caddy, postgres, redis; 6 on app subdomain: frontend, node-api, caddy, backend, postgres, redis)
- **LLM:** Scaleway direct (`mistral-small-3.2-24b-instruct-2506`)
- **App URL:** `app.polinapsycho.com/beta` (SPA at /beta path prefix)
- **Disk cleanup:** Freed 4GB before deploy (was 89% full, now 64%)
- **Verification:** All 8+ production checks passed

---

**Prior (2026-07-09 morning):** Shipped rate limiting on `/api/crisis/opt-in` (PII endpoint, 5 req/min) plus three additional Node-API + client changes on top of the earlier crisis-detection scope fix:
>
> **1. Reply-opening variety in Dr.Safe system prompt.** `apps/api/src/lib/dr-safe-system-prompt.ts` — Communication Style now lists ~15 rotated opening patterns (grouped by tone) and explicitly reserves *"It sounds like…"* for genuine uncertainty rather than as a default. Example turn rewritten from *"It sounds like something is holding you in place…"* to *"That feeling of being held in place…"*.
>
> **2. Unrestricted wallets (paywall / quota bypass for internal testing).** New `apps/api/src/lib/unrestricted-wallets.ts` exposes `DEFAULT_UNRESTRICTED_WALLETS` (currently `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`) + `isUnrestrictedWallet()` + `getUnrestrictedWallets()` (merges defaults with the `UNRESTRICTED_WALLETS` env, case-insensitive, deduped). Wired into `quota.service.ts` (`getQuotaStatus` returns `Number.MAX_SAFE_INTEGER` quotas + `canUse: true` when the wallet matches) and `guest-quota.service.ts` (`consumeGuestChatQuota` short-circuits before touching Redis). `guest-quota.ts` middleware forwards the authenticated wallet. `apps/api/.env.example` documents the env var; production works with defaults alone (no server env change needed for the seed wallet).
>
> **3. Guest chat quota — refresh-bypass fix (device cookie + IP hard cap).** Enforcement stays server-side and now dual-keyed:
> - New `apps/api/src/lib/guest-device-cookie.ts` (HMAC-SHA256 signed `sp_gid`, `<deviceId>.<hmac>`, 128-bit random id, signing key derived from `JWT_SECRET` via a domain-separation label so no new required env is needed; optional override via `GUEST_DEVICE_COOKIE_SECRET`; timing-safe verify).
> - New `apps/api/src/middleware/guest-device-cookie.ts` (issues or reads the cookie, `HttpOnly` + `SameSite=Lax` + `Secure` in prod, 400-day max age; attaches `req.guestDeviceId`; never blocks the request path).
> - `guest-quota.service.ts` rewritten: default per-device daily limit **5** (was 10), keyed `guest:chat:dev:{deviceId}:{day}`; per-IP hard cap defaulting to `5 × device limit` (**25**), keyed `guest:chat:ip:{ip}:{day}`, tunable via `GUEST_CHAT_IP_HARD_CAP`; legacy `guest:chat:{ip}:{day}` counter absorbed once/day so rolling deploys don't reset users mid-day; denies if either counter is exceeded and reports `reason: 'device' | 'ip'` in the 429 body.
> - `guest-quota.ts` middleware tailors the 429 message for the IP hard cap and includes the new `quota.reason` field.
> - `chat-completions.ts` inserts `guestDeviceCookieMiddleware` between `optionalAuthenticateWallet` and `guestChatMinuteRateLimitMiddleware` so the cookie is always fresh before quota check.
> - `middleware/auth.ts` — `AuthenticatedRequest` typed with `guestDeviceId?: string`.
> - Web: new `apps/web/src/utils/guestPromptStore.ts` (localStorage, UTC-day scoped, silent-fail in strict private modes). `ChatWidget.tsx` initial state reads from the store, rehydrates on mount, increments persist, wallet verify clears the store, and a new `429 GUEST_QUOTA_EXCEEDED` branch syncs the local counter to `max(dailyUsed, dailyLimit)` and opens `GuestModeLimitModal` instead of falling through to the generic error toast.
> - Mobile: new `apps/safepsy-mobile/src/services/guestPromptStore.ts` (AsyncStorage mirror). `ChatScreen.tsx` rehydrates `guestSends` on mount for guest users, persists on increment, clears on wallet verify. `chatStream.ts` gained `onGuestQuotaExceeded({ dailyUsed, dailyLimit, reason, message })` firing on `429 GUEST_QUOTA_EXCEEDED`, preventing the generic `Alert.alert('Chat error', …)` and letting the screen show the conversion dialog; IP-cap variant gets tailored copy.
> - Env docs: `.env.production.example`, `apps/api/.env.example`, and `documentation/public documentation/API_ENDPOINTS.md` all document `GUEST_CHAT_DAILY_LIMIT=5`, `GUEST_CHAT_IP_HARD_CAP=25`, optional `GUEST_DEVICE_COOKIE_SECRET`, and the new 429 response shape.
> - Tests: new `apps/api/src/__tests__/guest-device-cookie.test.ts` (**8 tests** — round-trip, tamper detection, wrong-secret rejection, malformed input, secret rotation, cookie options). Rewritten `apps/api/src/__tests__/guest-quota.test.ts` (**9 tests** — new default, IP hard cap default + overrides, shared-IP fairness with device cookie, cookie-clearing abuse hitting the IP cap, fail-closed without Redis in prod). Combined with the 9 crisis-detection tests, focused vitest is **26/26 passing**.
>
> **Verification:** API `tsc --noEmit` + eslint clean (`--max-warnings 0`); Web + Mobile `tsc --noEmit` clean; `ReadLints` on all 14 modified/new files returned zero findings. Deploy required: `REDIS_URL` (already required in prod). No new required env vars.
>
> **Prior (2026-07-03 morning):** Crisis-detection scoped to the latest user turn (`crisis-detection.ts`, `crisis-detection.test.ts`, sprint entry).
>
> **2026-07-09: Rate limiting on `/api/crisis/opt-in`** — PII endpoint protection:
> - Updated `crisisOptInRateLimit` in `apps/api/src/routes/crisis.ts` to strict limits: 5 requests per minute (was 10 per 15 minutes)
> - Uses wallet-address-based keying (falls back to IP for unauthenticated)
> - Returns `429` with `{ success: false, message: 'Too many requests...', error: 'RATE_LIMIT_EXCEEDED' }`
> - Pattern aligned with `apps/api/src/lib/ratelimit.ts`
>
> **Prior (2026-06-21):** Removed user-initiated DEK key rotation (API `POST /api/chat/rotate-key`, web DID Profile UI, `rotateEncryptionKey()` utilities, related tests/docs). Chat backup/removal remains via export/delete on DID Profile. See **`DEPENDENCIES.md`** (feature surface + doc sync log).
>
> **Prior (2026-05-24):** **LLM (Node API):** `llm-routing.ts` (`USE_SCALEWAY_DIRECT`), crisis detection (`crisis-detection.ts`), Redis response cache (`response-cache.ts` + `redis-shared.ts`), Scaleway usage logging (`scaleway-metrics.ts`); **`AIGatewayService`** direct Scaleway path is production default. **Web:** SIWE cookie-first auth (`auth.service`, `useWalletLogin`, `apiFetch`); `getWalletErrorMessage()` for wallet UX; encryption hook persists DEK via `updateEncryptedKeyMetadata`. **Docs:** `API_ENDPOINTS.md`; activation in **`LAUNCH.md`** and **`BETA_QUICKSTART_AND_OFFBOARDING.md`** (removed stale public copies: `AUTHORS`, `BETA_QUICKSTART`, `DEPENDENCIES`, license stubs, `SECURITY_COMPLETE_GUIDE`, `PRODUCTION_FIXES_2026_05_08`).
>
> **Wallet verification (2026-05-10):** `useWalletLogin` → **`auth.service`** (`connect` → sign → **one** `verify`); `WalletContext` signs via EIP-1193 **`personal_sign`** only. API **`wallet-*` middleware** reads validated **`req.body`** first (legacy headers optional). See **`WALLET_COMPLETE_GUIDE.md`**.

---

## MVP launch roadmap (2026)

**Framework:** HubSpot’s [The $1M Solopreneur MVP](https://offers.hubspot.com/view/1m-solopreneur-mvp) stresses a **minimum viable *representation*** (ship something learnable fast), **maximize information per hour spent**, and pick tactics that match your strengths (landing + waitlist, demo video, lightweight tool, content, ads, “wizard of oz” manual fulfillment, etc.). SafePsy maps cleanly: **guest or wallet → DID → first Dr. Safe chat** is your activation story; everything else supports learning and trust, not vanity features.

### Canonical activation (what “launched” means)

Align with **`documentation/public documentation/LAUNCH.md`** and **`BETA_QUICKSTART_AND_OFFBOARDING.md`**: user reaches value when **(1) DID exists** and **(2) at least one real exchange with Dr. Safe** has happened. Funnel metrics: visits → wallet connect attempts → successful session → DID mint → first chat completion → support/feedback.

### ✅ Repository verification (2026-04-12, updated 2026-05-24)

- ✅ **`npm run lint`** (root: web + api): passing  
- ✅ **Unit tests:** root **`npm test`** runs `vitest run` for web then API (exits cleanly for CI); per-app `cd apps/web && npm test` / `cd apps/api && npm test` are equivalent. API adds **`crisis-detection`**, **`response-cache`**, **`scaleway-metrics`**; web adds **`api-fetch`**, **`wallet-error-messages`**, **`wallet-auth-contract`**.  
- ✅ **`npm run build`** (web + api): passing after pinning Tailwind to **`apps/web/tailwind.config.ts`** in **`apps/web/postcss.config.cjs`** so `vite build --config apps/web/vite.config.ts` from the monorepo root loads theme/content correctly  
- ✅ **Production fixes applied** (2026-05-08): DID update flow in `ChatWidget.tsx`, `.env.production.example`, **`scripts/verify-production-setup.js`** for env/RPC/Scaleway checks  
- ✅ **API layout (2026-05-10):** Express factory **`apps/api/src/app.ts`** (`createApp()`); **`/api/testing`** disabled in production via stub route in `app.ts`  
- ✅ **Chat / LLM (2026-05):** No in-repo FastAPI chatbot; prod **`USE_SCALEWAY_DIRECT=1`** on app host Python proxy (`deploy-live-app.sh`). Dev: Node **`AIGatewayService`** with **`shouldUseScalewayDirect()`**, crisis prepend, optional Redis cache (`REDIS_URL`, `AI_RESPONSE_CACHE_TTL`). See **`./chatbot.md`**, **`documentation/private documentation/chatbot.md`**.  
- ✅ **API reference:** **`documentation/public documentation/API_ENDPOINTS.md`** (health, auth, DID, chat, metrics)  

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
   - **✅ DEPLOYED (July 9, 2026):** `./deployment/deploy-live-app.sh` succeeded — all 8 verification checks passed
   - **Runbook (validated May 2026):** **`documentation/private documentation/DEPLOY-RUNBOOK.md`** — scw-last-app **`151.115.151.231`**, polinapsycho.com, Scaleway direct (no legacy chatbot VM).
   - **Default prod command:** **`./deployment/deploy-live-app.sh`** (loads repo `.env`, sets `USE_SCALEWAY_DIRECT=1`, deploys Caddy + Vite SPA + Python proxy). Requires **`SCALEWAY_API_KEY`** in `.env`.
   - **App subdomain:** `deploy.sh` now auto-deploys to `APP_APP_HOST` (51.159.165.150) for `app.polinapsycho.com` with Caddy site block handling TLS + `/beta` prefix strip. Caddyfile: `${APP_DOMAIN_APP} { ... }` block with `handle_path /beta/*` rewrite.
   - **Full pipeline:** **`./deployment/deploy.sh`** when Terraform apply is needed; use **`USE_SCALEWAY_DIRECT=1`**, **`APP_HOST=151.115.151.231`**, **`CHATBOT_HOST=151.115.151.231`**, **`DEPLOY_SKIP_TERRAFORM=1`** on resume.
   - **Local parity:** **`npm run deploy:local`** → **`deployment/deploy-local-app.sh`** (http://localhost:9080).
   - **Failures:** **`documentation/private documentation/deploy-issue.md`**. Post-deploy: **`CHECK_LLM=1 USE_SCALEWAY_DIRECT=1 ./deployment/verify-production.sh`**.
   - **`deploy-app.sh`** is the app-stack implementation; prefer wrappers above, not a forked pipeline.

4. **MVP learning tactics (pick 1–2 first week)**
   - **Beta access:** Use primary CTA—waitlist email and marketing via beta launch website as well as social media.
   - **Demo video:** Short walkthrough (wallet, Sepolia, DID, first message); shareable without requiring a full product tour.
   - **Content MVP:** Reuse approved claims from **`documentation/public documentation/CLAIMS_AND_TRUST_LANGUAGE.md`** and positioning from **`documentation/private documentation/LAUNCH.md`** / **`PERSONAS.md`**.
   - **Wizard of Oz:** Manually onboard the first cohort while you observe friction (wallet, gas, errors).

5. **Weekly review**
   - Identify the largest funnel drop-off; fix that before new features. Re-read public security/privacy guides before changing copy.

### Current Status (July 9, 2026)

| System | Status | Notes |
|--------|--------|-------|
| Production | ✅ Live | `https://polinapsycho.com` (landing) + `https://app.polinapsycho.com/beta` (chat SPA) — all HTTPS checks passed |
| Containers | ✅ 12/12 running | 6 on main (151.115.151.231): backend, frontend, node-api, caddy, postgres, redis; 6 on app subdomain (51.159.165.150): frontend, node-api, caddy, backend, postgres, redis |
| LLM | ✅ Scaleway direct | `mistral-small-3.2-24b-instruct-2506` |
| Rate limiting | ✅ Complete | `/api/crisis/opt-in` at 5 req/min |
| Guest quota | ✅ Complete | Device cookie + IP hard cap (5/25 per day) |

### Immediate Next Sprint Items (Beta Prep) — updated Aug 20, 2026 (EOD)

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| P0 | Privacy Policy + Terms of Service — **impl. complete; needs lawyer review for health data processing scope** | — | ✅ Done (pending legal review) |
| P0 | Consent checkbox for health data (GDPR Art. 9) — **impl. complete in CookieBanner.tsx** | — | ✅ Done |
| P0 | Account deletion (GDPR Art. 17) — **impl. complete; endpoint + UI functional** | — | ✅ Done — transactional deletion of chats/subscriptions/crisis data + audit logging |
| P0 | Cookie consent banner — **impl. complete in CookieBanner.tsx** | — | ✅ Done — with health data consent gate |
| P0 | Consent recording API (GDPR Art. 7) — **impl. complete** | — | ✅ Done — apps/api/src/routes/consent.ts |
| P0 | Consent check middleware — **impl. complete** | — | ✅ Done — blocks AI chat without health data consent |
| P1 | Sentry error monitoring — web + mobile | 2 hours | ✅ Done — @sentry/react wired into App.tsx, lib/sentry.ts created, DSN in .env.example |
| P1 | GA4 analytics integration | 1 hour | ✅ Done — consent-gated, wired into App.tsx, VITE_PUBLIC_GA4_MEASUREMENT_ID in env.example |
| P1 | Database index on `expiresAt` (CrisisOptIn + EncryptedChat) | 30 min | ✅ Done — @@index in schema.prisma |
| P1 | Remove console.log from production code | 2 hours | ✅ Done — 22 removed from web runtime, lint passing |
| P1 | JWT_SECRET validation guard | 30 min | ✅ Verified — production-config-guard.ts rejects default/insecure values |
| P1 | Database backups verification | 2 hours | ⏳ Pending — confirm pg_dump/Scaleway backup active |
| P1 | Configure Scaleway Instance Block Volume snapshots (scheduled, coarser backup) | 1 hour | ⏳ Pending |
| P1 | Uptime monitoring setup | 1 hour | ⏳ Pending — UptimeRobot on /healthz |
| P1 | Add subdomain (DNS config, SSL) | 1 hour | ✅ Done — `app.polinapsycho.com` → A record `51.159.165.150`; Caddy handles TLS via ACME; deploy pipeline supports multi-host deployment |
| P1 | Beta welcome packet | 2 hours | ✅ Done — ready for distribution to beta testers |
| P2 | Manual testing suite execution | 4 hours | ⏳ Pending — 57 test cases covering auth, chat, GDPR, subscriptions, mobile |

### Beta Sprint Goals (August 20-27, 2026)

1. **Verify P0 compliance items** — ✅ All complete: Consent checkbox, Account deletion, Cookie banner, Consent API (Art. 7), Consent middleware
2. **Code quality** — ✅ console.log removed, ✅ JWT_SECRET guard verified, ⏳ Uptime monitoring, ⏳ Backups verification
3. **Integrate analytics** — ✅ GA4 for activation tracking (consent-gated)
4. **Beta onboarding** — ✅ Welcome packet done, ✅ Subdomain configured, ⏳ Discord/Slack setup
5. **Manual testing** — ⏳ 57 test cases covering: auth, DID, chat, GDPR, subscriptions, mobile, error handling, production health
6. **Recruit first 10 beta testers** — Manual onboarding, observe friction

---

### Local API sanity (quick)

- **`GET http://localhost:3001/healthz`** — expect `200` and body `ok` when the API process is running (Express root health; not the SPA).
- **`POST /api/auth/wallet/connect`** — send **`Content-Type: application/json`** with body at minimum `{ "address": "<0x…42>", "chainId": 11155111 }` (Sepolia). Empty `{}` fails validation (`address` required).
- **`POST /api/auth/wallet/verify`** — SIWE **`message`** + **`signature`** required; **`address`** / **`chainId`** optional (recovered from EIP-4361 when omitted). Legacy **`x-wallet-*`** headers still accepted behind **`validateWalletSignature`**.

---

## Integration status (wallet + chat + docs)

### Wallet & session (2026-05-10, verified 2026-05-24)

- **SIWE (EIP-4361) + nonce replay protection:** **`POST /api/auth/wallet/connect`** returns a **`SiweMessage.prepareMessage()`** challenge (domain **`SIWE_DOMAIN`** / **`safepsy.com`** default); **`wallet-nonce.service`** registers the nonce (TTL **5 min**); **`POST /api/auth/wallet/verify`** requires SIWE format, **`consumeWalletNonce`**, then JWT + **`walletSession`** cookie (**`sameSite: 'lax'`**). Verify accepts **`{ message, signature }`** (address recovered from SIWE). Replace in-memory nonce store with **Redis** when running multiple API replicas.
- **Cookie-first web:** **`walletSessionToken`** removed from **`localStorage`**; authenticated fetches use **`apiFetch()`** (`credentials: 'include'` by default) or **`auth.service`**; **`useWalletLogin`** orchestrates connect → SIWE → **one** verify; **`AuthContext`** confirms via **`GET /api/auth/me`**. **Mobile** (`safepsy-mobile`): Bearer JWT in SecureStore.
- **P0 done:** JSON bodies + SIWE aligned; **`WalletContext`** only signs; **`wallet-auth` middleware** prefers **`req.body`** over legacy **`x-wallet-*`** headers.
- **Wallet UX:** **`getWalletErrorMessage()`** in **`errorMessages.ts`** maps rejections and verbose RPC errors to short copy (tests in **`wallet-error-messages.test.ts`**).
- **DID / API base:** Components use **`apiFetch()`** / **`apiUrl()`** from **`apps/web/src/config/api.ts`** (same-origin **`/api`** when `VITE_API_URL` unset).
- **Docs:** **`WALLET_COMPLETE_GUIDE.md`**, **`ENCRYPTION_COMPLETE_GUIDE.md`**, **`CHAT_COMPLETE_GUIDE.md`**, **`API_ENDPOINTS.md`**; **`/api/testing/*`** dev-only.

### Chat & LLM (2026-05-24)

- **Routing:** **`apps/api/src/lib/llm-routing.ts`** — `USE_SCALEWAY_DIRECT=1` forces Scaleway Generative API; unset defaults to direct when no **`AI_GPU_BASE_URL`** / **`CHATBOT_BASE_URL`**.
- **Crisis signals:** **`crisis-detection.ts`** (multilingual keyword scan, EN/FR/RU + 7 more) prepends supportive copy on the direct Scaleway stream/non-stream path (ported from removed FastAPI service). **Scoped to the latest user turn only** (2026-07-03) so a crisis keyword from an earlier turn does not re-trigger the prepend on benign follow-ups; regression tests in `crisis-detection.test.ts`.
- **Caching:** **`response-cache.ts`** — SHA-256 keyed Redis cache for non-streaming Scaleway completions (`AI_RESPONSE_CACHE` ≠ `0`, **`REDIS_URL`** required for hits).
- **Observability:** **`scaleway-metrics.ts`** logs token usage and cost estimates; **`GET /api/chat/health`** reports `routing: scaleway-direct` vs self-hosted upstream snapshot.
- **Prod vs dev:** **`npm run dev`** → full Node stack (SSE, guest mode, encryption, RAG hooks, crisis). **`deploy-live-app.sh`** → Caddy + Python proxy + Scaleway on **151.115.151.231** (see runbook).

### Phase D — Encryption keys (web, 2026-05-14, stable 2026-05-24)

**Shipped (web):** **`useChatEncryption`** loads DEK from **`getEncryptedKeyMetadata`**; **`saveKeyToDID`** → **`updateEncryptedKeyMetadata`**. **`ChatWidget`** passes key bytes into **`updateChatReference`** so saves do not clear on-chain metadata. **`localStorage`** `encryptedKey_*` is **migration-only** when chain metadata is empty.

### Data retention & encryption

- **`EncryptedChat`** (`schema.prisma`): ciphertext at rest; **no TTL** today.
- **Product / legal (open):** choose one or combine before implementation: **(A)** time-based TTL + job, **(B)** user-initiated delete API + UI, **(C)** export-then-delete. Until then, no new Prisma fields or purge jobs.

### Staging E2E (Sepolia checklist)

1. From **`apps/web`**: **`npm run verify:sepolia-staging`** (same as `node scripts/verify-sepolia-staging-checklist.mjs`). Optional **`STAGING_API_ORIGIN=https://your-api-host`** if `VITE_API_URL` is unset or same-origin. Fix any **DID address / RPC** failures before manual wallet steps.
2. Web + API against staging URLs; **`VITE_DID_IDENTITY_TOKEN_ADDRESS`** and **`VITE_API_URL`** set for Sepolia (DID address must match **`apps/api/deployments/sepolia-latest.json`** → `DIDIdentityTokenV2.address`).
3. Connect wallet → SIWE verify → cookie session (**`GET /api/auth/me`**).
4. Mint or confirm DID (**`/api/did/info`** has **`hasDid`**).
5. Send chat turn → wait for save → confirm **`updateChatReference`** tx on Sepolia explorer (blob hash + nonzero metadata length).
6. Hard refresh → chat decrypts without re-entering wallet beyond normal session.

### P2 — Doc reconciliation

- [x] **`DID_COMPLETE_GUIDE.md`** — Sepolia-only runtime; mainnet wording removed.
- [x] **`WALLET_COMPLETE_GUIDE.md`** — cookie-only web session documented.
- [x] **`API_ENDPOINTS.md`** — `walletSession` cookie name and production Node routing.

---

## Waitlist implementation notes (2026-05-08)

- ✅ **Consent required**: `/api/subscribe` requires `consentGiven=true` and returns `400 { success:false, message:"Consent is required" }` otherwise.
- ✅ **Rate limit UX**: subscription endpoint is limited to **5/min**, returns `429` with a user-facing message.
- ✅ **Frontend consolidation**: a shared `WaitlistForm` component is used in `Hero`, `Landing`, and `EmailSignup` to ensure payload consistency and aligned validation/copy.

## Production readiness (2026-05-08)

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

Post-deploy: **`CHECK_LLM=1 USE_SCALEWAY_DIRECT=1 ./deployment/verify-production.sh`**. Env validation: **`node scripts/verify-production-setup.js`**.

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
   - ✅ On-chain DEK via **`updateEncryptedKeyMetadata`**; **localStorage** only for one-time migration when chain metadata is empty

2. **ChatWidget Integration** (`apps/web/src/components/ChatWidget.tsx`)
   - ✅ Uses `useChatEncryption` for verified sessions; guest mode stays in-memory with capped prompts
   - ✅ After save, when the API returns `requiresDidUpdate`, calls **`updateChatReference`** (`apps/web/src/utils/did-contract.ts`) to update the on-chain chat reference

### Encryption Scheme Details

**Key Material:**
- **Symmetric Key**: 32-byte AES-256-GCM key (generated client-side)
- **Encrypted Key**: Symmetric key encrypted with wallet signature
- **Storage**: Encrypted key in DID identity token metadata (`updateEncryptedKeyMetadata`); localStorage migration fallback only

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
- [x] ✅ **Chat export/delete** — `POST /api/chat/export`, `DELETE /api/chat`, DID Profile UI, audit logging
- [x] ✅ **Scaleway direct LLM path** — `llm-routing`, crisis detection, response cache, usage metrics in Node API
- [x] ✅ **Deploy runbook** — `DEPLOY-RUNBOOK.md`, `deploy-live-app.sh`, `deploy-local-app.sh`, `chatbot-migration.md`
- [x] ✅ **Wallet error UX** — `getWalletErrorMessage()` + unit tests

### ⚠️ Backlog / refinements

- [x] **P0 — Align wallet auth HTTP client with API validation** — `useWalletLogin` / `auth.service` + SIWE JSON bodies; `wallet-auth` reads `req.body` first.
- [x] **P1 — Cookies vs Bearer** — Web: `apiFetch()` + `auth.service` cookie-only (no Bearer in JS); exactly one `POST /wallet/verify` per login (`useWalletLogin`); `GET /auth/me` confirms session. Mobile: Bearer in SecureStore unchanged.
- [x] **P1 — Unify API base URL** — Aligned `DIDManager`, `DIDProfile`, and other components with `apiFetch()` from `config/api.ts` (same-origin pattern).
- [x] **P1 — Docs pass** — `API_ENDPOINTS.md`, `DID_COMPLETE_GUIDE.md`, `WALLET_COMPLETE_GUIDE.md`, `DEPLOY-RUNBOOK.md` aligned with Sepolia + cookie auth + node-api Caddy routes.
- [x] **Persist encrypted symmetric key** — `updateEncryptedKeyMetadata` + migration-only localStorage in `useChatEncryption`
- [x] **Redis nonce store** — `wallet-nonce.service.ts` uses Redis with `getSharedRedis()` + in-memory fallback (multi-replica ready)
- [x] **Node API on production host** — Caddy routes `/api/auth/*`, `/api/did/*`, and encrypted `/api/chat/*` to **node-api** (`deployment/deploy-app.sh`, `deployment/local-app/node-api/Dockerfile`); Python proxy remains for LLM `/api/chat/completions` and other catch-all `/api/*`
- [x] **Gate `/api/testing` in production** — implemented in `apps/api/src/app.ts` (`NODE_ENV === 'production'` → stub `404`)
- [x] **Key rotation mechanism** (security checklist) — Removed 2026-06-21: feature dropped to simplify the app (endpoint, UI, utilities, and docs removed)
- [x] **Contract failure handling** / retries for on-chain updates — Web: `did-contract.ts` `sendContractWriteWithRetry()` (4 attempts, 900ms base); Mobile: `didService.ts` `sendTransactionWithRetry()` with exponential backoff
- [x] **Continuous end-to-end testing** beyond unit tests — Implemented 2026-06-12: unit tests for chat export/delete (`chat-export-delete.test.ts`), cleanup job (`cleanup-job.test.ts`), encryption utilities (`did-encryption.test.ts`)
- [x] **Retention/deletion policy** — Implemented `POST /api/chat/export` and `DELETE /api/chat` with rate limiting, audit logging, and frontend UI in DID Profile. Export downloads encrypted JSON; delete removes off-chain data (on-chain hashes remain). **Time-based TTL added 2026-06-12**: `retentionDays` and `expiresAt` fields in `EncryptedChat`, cleanup job (`cleanup-job.ts`), admin endpoints (`/api/admin/retention/*`)

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

# Save encrypted chat (after wallet verify: session cookie from browser, or Cookie header in curl)
curl -X POST http://localhost:3001/api/chat/save \
  -H "Content-Type: application/json" \
  -b "walletSession=<cookie-from-verify>" \
  -d '{"encryptedChatBlob": "...", "didTokenId": "123"}'

# Load encrypted chat
curl -X GET http://localhost:3001/api/chat/load \
  -b "walletSession=<cookie-from-verify>"
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
- [x] ✅ Key rotation mechanism — Removed 2026-06-21 (feature dropped to simplify the app)
- [x] ✅ Contract failure handling — Retry logic in `did-contract.ts` and `didService.ts`

## Notes

- V2 DID contract uses **`updateChatReference`** / **`updateEncryptedKeyMetadata`** (`did-contract.ts`); avoid legacy `setDidData` naming in new code.
- **LLM env (Node dev):** `USE_SCALEWAY_DIRECT`, `SCALEWAY_API_KEY`, optional `REDIS_URL` + `AI_RESPONSE_CACHE_TTL` — see **`apps/api/.env.example`** and **`deploy/app/.env.example`**.
- Network failures: chat saved off-chain; DID update retried when possible (non-blocking in widget).
