# Repository Syntax Tree (AST) — SafePsy App

A tree view of the codebase where each **leaf** is a file with: **name**, **function**, **language**. Root folder name in clones may vary; paths below are relative to the repo root (e.g. **SPappv2**).

> **Last updated:** 2026-05-17 — removed `apps/ai-chatbot`, `deploy/chatbot`, `deployment/chatbot`; prod LLM via Scaleway direct (`documentation/chatbot-migration.md`).

---

## Root

```
./
├── package.json                    # Monorepo root: workspaces (`apps/*`), scripts (dev/build/test/lint/db; `dev:mobile` → Expo `safepsy-mobile`; `mobile:eas:build:ios` / `mobile:eas:submit:ios` → EAS TestFlight; `test`/`test:web`/`test:api` → `vitest run` for CI-clean exits), engines — JSON
├── package-lock.json               # npm lockfile — JSON
├── env.example                     # Root env template — Text
├── .env.production.example         # Production env template with secrets generation, contract addresses, deployment checklist — Text (created 2026-05-08)
├── docker-compose.local.yml         # Local dev deps: Postgres + Redis (+ optional Qdrant via profile) — YAML
├── .dockerignore                   # Docker build ignore rules — Text
├── prisma/
│   └── schema.prisma               # Legacy duplicate; canonical schema is `apps/api/schema.prisma` (root `db:*` use `--schema=apps/api/schema.prisma`) — Prisma
├── public/                         # Shared static assets (logos, hero imagery, `.well-known/apple-app-site-association` for iOS Universal Links) — PNG/JPG/JSON
├── logs/                           # Local log mount (e.g. healthcheck) — Text
├── api/                            # Workspace-adjacent Cursor scope (not the Express API)
│   └── .cursor/rules/service_scope.mdc
├── apps/
│   └── deployments/
│       └── sepolia-latest.json     # Copy/snapshot of latest Sepolia addresses (alongside `apps/api/deployments/`) — JSON
└── scripts/
    └── verify-production-setup.js  # Pre-deploy validation: env vars, secrets, external services, on-chain checks — JavaScript (created 2026-05-08)
```

---

## .github/workflows

```
.github/workflows/
├── ci.yml                    # CI: lint, test, typecheck — YAML
├── ci-cd.yml                 # CI/CD pipeline — YAML
├── deploy-production.yml     # Production deployment workflow — YAML
└── terraform.yml             # Terraform apply workflow — YAML
```

---

## .cursor/rules

```
.cursor/rules/
├── api/
│   └── contracts.mdc           # Smart-contract / Hardhat guidance — MDC
├── backend/architecture.mdc    # Legacy `backend/` app conventions — MDC
├── core/
│   ├── agent_behavior.mdc
│   ├── engineering_principles.mdc
│   ├── repository_syntax_tree.mdc  # When to refresh REPOSITORY_SYNTAX_TREE.md — MDC
│   └── senior_collaborator.mdc     # Voice, brevity, epistemic clarity — MDC
├── devops/
│   ├── deployment.mdc
│   ├── production_recovery.mdc
│   └── service_validation.mdc
├── frontend/architecture.mdc   # `apps/web` conventions — MDC
├── infra/
│   ├── caddy.mdc
│   ├── docker.mdc
│   └── terraform.mdc
```

---

## apps/api

```
apps/api/
├── package.json              # API deps & scripts (dev, build, test, deploy:contracts) — JSON
├── nodemon.json              # Nodemon config for dev — JSON
├── tsconfig.json             # TypeScript config (excludes `src/contracts/**`) — JSON
├── tsconfig.contracts.json   # Deploy/tooling scripts under `src/contracts` — JSON
├── tsconfig.hardhat.json     # Hardhat/contracts TS config — JSON
├── hardhat.config.js         # Hardhat: networks, Solidity, plugins — JavaScript
├── hardhat.config.cjs        # Hardhat CJS config — JavaScript
├── schema.prisma             # API DB schema (EmailSubscription, ContactMessage, EncryptedChat, Subscription, Payment, etc.) — Prisma
├── .eslintrc.cjs             # ESLint config — JavaScript
├── test-hardhat.js           # Hardhat diagnostic/test — JavaScript
├── test-imports.ts           # Import sanity check — TypeScript
├── test-prisma.ts            # Prisma connection test — TypeScript
├── vitest.config.ts          # Vitest config for API unit tests — TypeScript
├── .env.example              # API env template — Text
│
├── cache/
│   ├── solidity-files-cache.json   # Solidity compile cache — JSON
│   └── validations.json            # Validation cache — JSON
│
├── deployments/
│   ├── SEPOLIA_DEPLOYED_CONTRACTS.md      # Human-readable Sepolia contract reference — Markdown
│   ├── governance-sepolia.json           # Governance contracts on Sepolia — JSON
│   ├── local-latest.json                 # Local deployment addresses — JSON
│   ├── metadata-service-upgrade-proposal.json  # Upgrade proposal — JSON
│   ├── safe-addresses-registry.json      # Safe/multisig addresses — JSON
│   ├── sepolia-1765120263421.json        # Sepolia deployment snapshot — JSON
│   └── sepolia-latest.json               # Latest Sepolia deployment — JSON
│
├── scripts/
│   ├── audit-on-chain-verification.mjs   # On-chain audit verification — JavaScript (ESM)
│   ├── audit-on-chain-verification.ts    # Same, TS source — TypeScript
│   ├── bytecode-verification.mjs         # Bytecode verification — JavaScript (ESM)
│   ├── compile-contract.mjs              # Compile single contract — JavaScript (ESM)
│   ├── compile-solc.mjs                  # Solidity compile helper — JavaScript (ESM)
│   ├── deploy-direct.mjs                 # Direct deploy (no Hardhat) — JavaScript (ESM)
│   ├── deploy.cjs                        # Deploy entry (CJS) — JavaScript
│   ├── deploy.js                         # Deploy script — JavaScript
│   ├── deploy.mjs                         # Deploy script ESM — JavaScript (ESM)
│   ├── execute-timelock-batch.mjs        # Execute timelock batch — JavaScript (ESM)
│   ├── fix-sepolia-ownership.mjs         # Fix Sepolia contract ownership — JavaScript (ESM)
│   ├── index-faqs-tos.mjs                # Index FAQs/TOS for search — JavaScript (ESM)
│   ├── prepare-metadata-service-upgrade.mjs  # Prepare metadata upgrade — JavaScript (ESM)
│   ├── setup-governance.mjs              # Governance setup — JavaScript (ESM)
│   ├── verify-timelock-operation.mjs    # Verify timelock op — JavaScript (ESM)
│   ├── wire-registry-governance-only.mjs # Wire registry to governance — JavaScript (ESM)
│   └── verify-sepolia-etherscan.sh       # Etherscan verification on Sepolia — Shell
│
├── src/
│   ├── index.ts              # Process bootstrap: dotenv, `createApp()`, listen, LLM upstream health poller, crypto/IP validators — TypeScript
│   ├── app.ts                # `createApp()`: CORS, helmet, sanitize, rate limit, metrics, routes; `/api/testing` only when not production; static SPA from `apps/web/dist` — TypeScript
│   ├── shims-jsdom.d.ts      # Ambient `jsdom` declaration for typecheck — TypeScript
│   │
│   ├── routes/
│   │   ├── auth.ts           # Auth routes: wallet connect/verify, GET /api/auth/session & /me, logout — TypeScript
│   │   ├── beta-chat.ts      # Legacy POST /beta/chat forward + OpenAI POST /beta/chat/completions — TypeScript
│   │   ├── chat-completions.ts # Shared mount for OpenAI-style completions (used by chat + beta) — TypeScript
│   │   ├── chat.ts           # Chat: save/load, upstream-status; `mountChatCompletions` from `chat-completions.ts` — TypeScript
│   │   ├── contact.ts        # Contact form submit — TypeScript
│   │   ├── did.ts            # DID: register, metadata, services, verify; POST /api/did/update (auth, prepares updateChatReference calldata) — TypeScript
│   │   ├── metrics.ts        # POST /api/metrics/funnel — anonymous funnel timestamps intake — TypeScript
│   │   ├── payment.ts        # Payment & pricing — TypeScript
│   │   ├── rag.ts            # RAG: ingest, query, document delete, health — TypeScript
│   │   ├── subscribe.ts      # Email subscription — TypeScript
│   │   └── testing.ts        # Testing/health endpoints — TypeScript
│   │
│   ├── middleware/
│   │   ├── admin-auth.ts     # Admin auth middleware — TypeScript
│   │   ├── auth.ts           # General auth/session — TypeScript
│   │   ├── concurrency.ts    # Concurrency limiting — TypeScript
│   │   ├── did-verify.ts     # DID token verification — TypeScript
│   │   ├── error-handler.ts  # Global error handler — TypeScript
│   │   ├── log-redaction.ts  # PII/sensitive log redaction — TypeScript
│   │   ├── metrics.ts        # Metrics middleware — TypeScript
│   │   ├── quota.ts          # Usage quota — TypeScript
│   │   ├── request-id.ts     # Request ID — TypeScript
│   │   ├── safety.ts         # Input safety / abuse — TypeScript
│   │   ├── sanitize.ts       # Request sanitization — TypeScript
│   │   ├── upstream-status-auth.ts # Optional secret for GET /api/chat/upstream-status — TypeScript
│   │   ├── validation.ts     # Request validation — TypeScript
│   │   └── wallet-auth.ts    # Wallet-based auth — TypeScript
│   │
│   ├── lib/
│   │   ├── ai-gateway.service.ts    # AI gateway (LLM/completions) — TypeScript
│   │   ├── chat-rag-context.ts      # RAG enhancement for chat completions — TypeScript
│   │   ├── dr-safe-system-prompt.ts # Dr.Safe system prompt (response rules, soft exit, turn 2–3 retention, guest append) — TypeScript
│   │   ├── crisis-detection.ts      # EN/FR/RU crisis keyword scan (Scaleway direct path) — TypeScript
│   │   ├── llm-routing.ts           # USE_SCALEWAY_DIRECT vs legacy self-hosted — TypeScript
│   │   ├── response-cache.ts        # Redis cache for non-stream Scaleway completions — TypeScript
│   │   ├── scaleway-metrics.ts      # Token usage / cost estimates — TypeScript
│   │   ├── redis-shared.ts          # Shared Redis client for cache — TypeScript
│   │   ├── llm-upstream-health.ts   # Periodic /health probes for legacy self-hosted LLM — TypeScript
│   │   ├── api-helpers.ts           # Shared API helpers — TypeScript
│   │   ├── config.ts                # Config & secret manager init — TypeScript
│   │   ├── constants.ts             # App constants — TypeScript
│   │   ├── crypto-payment.service.ts # Crypto payment handling — TypeScript
│   │   ├── crypto.ts                # Crypto utilities — TypeScript
│   │   ├── did.service.ts           # DID contract interaction — TypeScript
│   │   ├── emailService.ts          # Email sending — TypeScript
│   │   ├── embedding-provider.ts    # Embeddings for RAG — TypeScript
│   │   ├── googleSheets.ts          # Google Sheets integration — TypeScript
│   │   ├── logger.ts               # Logger — TypeScript
│   │   ├── metrics.ts              # Metrics (Prometheus-style) — TypeScript
│   │   ├── price-oracle.service.ts  # Price oracle — TypeScript
│   │   ├── prisma.ts                # Prisma client singleton — TypeScript
│   │   ├── qdrant.service.ts        # Qdrant vector DB for RAG — TypeScript
│   │   ├── quota.service.ts         # Quota checks — TypeScript
│   │   ├── rag-audit.ts             # RAG audit logging — TypeScript
│   │   ├── ratelimit.ts             # Rate limiting — TypeScript
│   │   ├── retriever.service.ts     # RAG retrieval — TypeScript
│   │   ├── secret-manager.ts        # Secret manager (e.g. Scaleway) — TypeScript
│   │   ├── security-audit.ts         # Security audit helpers — TypeScript
│   │   ├── session.ts               # Session management — TypeScript
│   │   ├── wallet-nonce.service.ts  # SIWE nonce register/consume (replay protection; in-memory — Redis for multi-instance) — TypeScript
│   │   ├── storage.service.ts       # Storage (S3-compatible) — TypeScript
│   │   ├── subscription.service.ts  # Subscription logic — TypeScript
│   │   └── DIDIdentityToken.abi.json # DID token ABI — JSON
│   │
│   ├── __tests__/
│   │   ├── log-redaction.test.ts    # Log redaction tests — TypeScript
│   │   └── subscribe.test.ts       # Subscribe route tests (consent, validation) — TypeScript
│   │
│   ├── lib/__tests__/
│   │   └── retriever.service.test.ts # Retriever service tests — TypeScript
│   │
│   └── contracts/
│       ├── Actions.sol                  # Canonical action constants (REVOKE, ADD_CONTROLLER, etc.) — Solidity
│       ├── DIDIdentityTokenV2.sol       # ERC721 DID identity token — Solidity
│       ├── DIDMetadata.sol              # DID metadata storage — Solidity
│       ├── DIDOwnershipV2.sol           # DID ownership & authorization — Solidity
│       ├── DIDRegistryV2.sol            # ERC721 DID registry (mint/revoke) — Solidity
│       ├── DIDService.sol               # DID service endpoints — Solidity
│       ├── HARDHAT_SETUP.md             # Hardhat notes (in-tree) — Markdown
│       ├── governance/
│       │   └── GovernanceTimelock.sol   # Timelock controller for governance — Solidity
│       ├── interfaces/
│       │   ├── IDIDOwnership.sol        # DID ownership interface — Solidity
│       │   └── IDIDRegistry.sol         # DID registry interface — Solidity
│       ├── mocks/
│       │   └── MockDIDOwnership.sol     # Mock for tests — Solidity
│       ├── compilation/
│       │   └── DIDIdentityToken_compData.json  # Compilation data — JSON
│       └── scripts/
│           ├── deploy.ts                # Deploy entry — TypeScript
│           ├── deploy-idempotent.ts     # Idempotent deployment — TypeScript
│           ├── deploy-timelock.ts       # Deploy timelock — TypeScript
│           ├── deploy-upgradeable.ts    # Deploy upgradeable contracts — TypeScript
│           ├── deployment-registry.ts   # Deployment registry helpers — TypeScript
│           ├── fix-sepolia-ownership.ts # Fix Sepolia ownership — TypeScript
│           ├── setup-governance.ts      # Governance setup — TypeScript
│           ├── smoke-check.ts           # Post-deploy smoke check — TypeScript
│           └── types.ts                 # Shared deployment types — TypeScript
│
└── test/
    ├── Audit.Invariants.test.js      # Audit invariants — JavaScript
    ├── DIDMetadata.StorageLimits.test.js   # DIDMetadata storage limits — JavaScript
    ├── DIDOwnership.Authorization.test.js  # DIDOwnership auth — JavaScript
    ├── DIDService.StorageLimits.test.js   # DIDService storage limits — JavaScript
    └── UUPS.Upgrade.test.js         # UUPS upgrade tests — JavaScript
```

---

## apps/web

```
apps/web/
├── package.json              # Web app deps (React, ethers, WalletConnect, etc.) & scripts — JSON
├── README.md                 # Web app overview (guest vs wallet chat) — Markdown
├── index.html                # SPA shell + helmet placeholders + baseline OG/favicon; client loads `entry-client` — HTML
├── env.example               # Frontend env template (`VITE_*`, DID Sepolia) — Text
├── tsconfig.json             # TypeScript config — JSON
├── tsconfig.node.json        # Node/TS config for Vite — JSON
├── vite.config.ts            # Vite client build (proxy, CSS ordering plugin, SSR `noExternal` hint) — TypeScript
├── vite.ssr.config.ts        # Vite SSR bundle for Node prerender (`dist-ssr/entry-server.cjs`) — TypeScript
├── vitest.config.ts          # Vitest config — TypeScript
├── tailwind.config.ts        # Tailwind config — TypeScript
├── postcss.config.cjs        # PostCSS config — JavaScript
├── .eslintrc.cjs             # ESLint config — JavaScript
├── public/                   # Static assets (`HeadsOnlyTransparent.png` favicon, `Logotransparent.png` OG/social, sitemap, robots, marketing imagery); `.well-known/apple-app-site-association` + README — mixed
├── scripts/
│   ├── validate-aasa.mjs     # CLI: fetch AASA, check status/JSON/redirects — JavaScript (ESM)
│   ├── verify-sepolia-staging-checklist.mjs # Sepolia env + API /healthz + RPC prereqs — JavaScript (ESM)
│   └── prerender.mjs         # Post-build: SSR-render key routes into `dist/**/index.html` — JavaScript (ESM)
├── src/
│   ├── main.tsx              # Loads `entry-client` — TypeScript (TSX)
│   ├── entry-client.tsx      # Browser hydrate/root render; `createBrowserRouter`, `HelmetProvider` — TypeScript (TSX)
│   ├── entry-server.tsx      # SSR `render(url)` for prerender (react-router memory router + helmet) — TypeScript (TSX)
│   ├── router.tsx            # Shared `routes` (`RouteObject[]`) for client + SSR — TypeScript (TSX)
│   ├── App.tsx               # `RouterProvider`, Theme/Wallet/Auth, cookie banner — TypeScript (TSX)
│   ├── styles.css            # Global styles — CSS
│   ├── vite-env.d.ts         # Vite env types — TypeScript
│   ├── polyfills.ts          # Browser polyfills (buffer, etc.) — TypeScript
│   │
│   ├── config/
│   │   ├── api.ts            # API base URL helpers (`VITE_API_URL`, same-origin `/api`) — TypeScript
│   │   ├── seo.ts            # SEO config (meta, titles) — TypeScript
│   │   └── supportedChain.ts # Supported EVM chain ids / network config — TypeScript
│   │
│   ├── types/
│   │   └── seo.ts            # SEO-related types — TypeScript
│   │
│   ├── data/
│   │   ├── faq.ts            # Shared FAQ items (landing + FAQ page; landing-safe subset) — TypeScript
│   │   └── supportIssues.ts  # Support / issue taxonomy for Support page — TypeScript
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Session/JWT/DID bootstrap; sole owner of wallet login API flow — TypeScript (TSX)
│   │   ├── ThemeContext.tsx  # Theme (light/dark) — TypeScript (TSX)
│   │   └── WalletContext.tsx # EIP-1193 connect/disconnect/sign only — TypeScript (TSX)
│   │
│   ├── services/
│   │   └── auth.service.ts   # HTTP: /api/auth/wallet/*, /api/auth/me, logout, /api/did/check — TypeScript
│   │
│   ├── hooks/
│   │   ├── useChatEncryption.ts   # Chat encryption hook — TypeScript
│   │   ├── useCookieConsent.ts    # Cookie consent — TypeScript
│   │   ├── useFocusManagement.ts  # Focus management & keyboard nav — TypeScript
│   │   ├── useKeyboardNavigation.ts # Keyboard nav — TypeScript
│   │   ├── useOffline.ts          # Offline detection — TypeScript
│   │   ├── useScrollReveal.ts     # Scroll-triggered reveal — TypeScript
│   │   ├── useSEO.ts              # SEO per route — TypeScript
│   │   ├── useToast.tsx           # Toast notifications — TypeScript (TSX)
│   │   ├── useWalletAuth.ts       # Thin facade: login/logout/session from AuthContext — TypeScript
│   │   └── useWalletLogin.ts      # SIWE login orchestration (connect → challenge → sign → verify) — TypeScript
│   │
│   ├── utils/
│   │   ├── chat-retrieval.ts      # Chat retrieval from API — TypeScript
│   │   ├── chat-summary-retrieval.ts # Chat summary retrieval — TypeScript
│   │   ├── conversionMetrics.ts   # Optional funnel timestamps cookie (`sp_product_metrics`) — TypeScript
│   │   ├── cookieUtils.ts         # Cookie helpers — TypeScript
│   │   ├── crypto-helpers.ts      # Web Crypto BufferSource normalization — TypeScript
│   │   ├── did-contract.ts        # DID contract calls (frontend) — TypeScript
│   │   ├── did-key-metadata.ts    # On-chain encrypted DEK wire format helpers — TypeScript
│   │   ├── did-encryption.ts      # DID-based encryption — TypeScript
│   │   ├── encryption.ts          # General encryption — TypeScript
│   │   ├── ethers-helpers.ts      # Read-only ethers provider narrowing for DID reads — TypeScript
│   │   ├── errorMessages.ts      # User-facing error messages — TypeScript
│   │   ├── queueManager.ts       # Request/queue management — TypeScript
│   │   └── safepsy-web3-client.ts # Web3/wallet client — TypeScript
│   │
│   ├── components/
│   │   ├── AboutMe.tsx            # About me page — TypeScript (TSX)
│   │   ├── Explore.tsx            # `/explore` — mission, values, technology — TypeScript (TSX)
│   │   ├── BetaTutorial.tsx       # Beta / onboarding tutorial — TypeScript (TSX)
│   │   ├── ChatWidget.tsx         # Chat UI widget (guest cap + wallet persistence, DID update flow fixed 2026-05-08) — TypeScript (TSX)
│   │   ├── GuestModeLimitModal.tsx # Guest limit reached — wallet conversion — TypeScript (TSX)
│   │   ├── ConnectWallet.tsx      # Wallet connection UI — TypeScript (TSX)
│   │   ├── ContactUs.tsx         # Contact form — TypeScript (TSX)
│   │   ├── CookieBanner.tsx       # Cookie consent banner — TypeScript (TSX)
│   │   ├── CookieManager.tsx      # Cookie preferences — TypeScript (TSX)
│   │   ├── Cookies.tsx            # Cookies policy page — TypeScript (TSX)
│   │   ├── DIDManager.tsx         # DID management UI — TypeScript (TSX)
│   │   ├── DIDProfile.tsx         # DID profile display — TypeScript (TSX)
│   │   ├── DIDTokenVisualization.tsx # DID token viz — TypeScript (TSX)
│   │   ├── DPIA.tsx               # DPIA page — TypeScript (TSX)
│   │   ├── EmailSignup.tsx        # Email signup form (uses shared WaitlistForm) — TypeScript (TSX)
│   │   ├── EmptyState.tsx         # Empty state component — TypeScript (TSX)
│   │   ├── FAQ.tsx                # FAQ page — TypeScript (TSX)
│   │   ├── FAQAccordion.tsx       # Reusable FAQ accordion — TypeScript (TSX)
│   │   ├── Feedback.tsx           # User feedback UI — TypeScript (TSX)
│   │   ├── Footer.tsx             # Site footer — TypeScript (TSX)
│   │   ├── Header.tsx             # Site header/nav — TypeScript (TSX)
│   │   ├── Hero.tsx               # Landing hero (uses shared WaitlistForm) — TypeScript (TSX)
│   │   ├── HiddenPage.tsx         # Hidden/utility page — TypeScript (TSX)
│   │   ├── Landing.tsx            # Main landing (`/`); primary CTAs → `/register`; waitlist + FAQ JSON-LD — TypeScript (TSX)
│   │   ├── LoadingSpinner.tsx     # Loading spinner — TypeScript (TSX)
│   │   ├── Maintenance.tsx        # Maintenance page — TypeScript (TSX)
│   │   ├── NotFound.tsx           # 404 page — TypeScript (TSX)
│   │   ├── Register.tsx           # `/register` — waitlist-focused page (uses WaitlistForm) — TypeScript (TSX)
│   │   ├── Payment.tsx            # Payment UI — TypeScript (TSX)
│   │   ├── Paywall.tsx            # Paywall component — TypeScript (TSX)
│   │   ├── SEOHead.tsx            # Dynamic meta/SEO head — TypeScript (TSX)
│   │   ├── SecurityAndPrivacyPolicy.tsx # Security & privacy policy — TypeScript (TSX)
│   │   ├── ServerError.tsx        # 5xx error page — TypeScript (TSX)
│   │   ├── SkeletonLoader.tsx     # Skeleton loading — TypeScript (TSX)
│   │   ├── Status.tsx             # Status/health page — TypeScript (TSX)
│   │   ├── Support.tsx            # Support page — TypeScript (TSX)
│   │   ├── TableOfContents.tsx    # TOC component — TypeScript (TSX)
│   │   ├── TermsOfService.tsx     # ToS page — TypeScript (TSX)
│   │   ├── Testing.tsx            # Testing page — TypeScript (TSX)
│   │   ├── ThemeToggle.tsx        # Theme toggle — TypeScript (TSX)
│   │   ├── WaitlistForm.tsx       # Reusable waitlist form (email + consent + submit, shared across Hero/Landing/EmailSignup) — TypeScript (TSX)
│   │   └── __tests__/
│   │       ├── ContactUs.test.tsx # ContactUs tests — TypeScript (TSX)
│   │       ├── Hero.test.tsx      # Hero tests — TypeScript (TSX)
│   │       └── Status.test.tsx    # Status tests — TypeScript (TSX)
│   │
│   └── test/
│       └── setup.ts            # Test setup (e.g. jest-dom) — TypeScript
```

---

## apps/safepsy-mobile

```
apps/safepsy-mobile/
├── package.json              # Expo client: WC, ethers, quick-crypto, worklets, Gifted Chat, navigation, SecureStore, AsyncStorage, Sentry; EAS scripts — JSON
├── eas.json                  # EAS Build (dev internal, preview, production store); production `env` pins API + Universal + APP_DOMAIN — JSON
├── app.json                  # Expo: display name SafePsy, scheme `safepsy://`, iOS bundleId + applinks (`polinapsycho.com`, `www`) + ITSAppUsesNonExemptEncryption, plugins — JSON
├── babel.config.js           # babel-preset-expo + Reanimated plugin — JavaScript
├── env.example               # EXPO_PUBLIC_*, TestFlight/EAS notes — Text
├── App.tsx                   # validateProductionEnvironment, Sentry init, QueryClient, WalletConnectProvider, hydrate + restoreSession, AppState resume — TypeScript (TSX)
├── index.ts                  # url-polyfill, WC compat, quick-crypto install, RNGH, registerRootComponent — TypeScript
├── tsconfig.json             # TypeScript (strict, skipLibCheck) — JSON
├── assets/                   # Expo icon/splash/favicon — PNG
└── src/
    ├── config/
    │   ├── constants.ts      # Sepolia chain id / hex / addChain params — TypeScript
    │   ├── domains.ts        # UNIVERSAL_LINK_ORIGINS (sync with app.json applinks) — TypeScript
    │   ├── env.ts            # API_BASE_URL, UNIVERSAL_LINK_BASE, APP_DOMAIN_LOCK, WC project id — TypeScript
    │   └── productionEnv.ts  # validateProductionEnvironment(): release throws FATAL on domain/WC env mismatch — TypeScript
    ├── contexts/
    │   └── WalletConnectContext.tsx # WC provider: auth phases, timeouts, account-change crypto reset, disconnect — TypeScript (TSX)
    ├── lib/
    │   ├── cryptoHelpers.ts  # BufferSource helper for WebCrypto — TypeScript
    │   └── didEncryption.ts  # AES-GCM chat + wallet-wrapped DEK (parity with web did-encryption) — TypeScript
    ├── navigation/
    │   ├── types.ts          # Native stack param list — TypeScript
    │   ├── linking.ts        # Deep link / Universal Link prefixes (safepsy:// + https hosts) — TypeScript
    │   └── RootNavigator.tsx # NavigationContainer + linking + stack — TypeScript (TSX)
    ├── screens/
    │   ├── HomeScreen.tsx              # Hub, API + session hints — TypeScript (TSX)
    │   ├── SafetyDisclaimerScreen.tsx  # Crisis / non-clinical + privacy policy link — TypeScript (TSX)
    │   ├── ChatScreen.tsx              # Guest + wallet chat, SSE phases, encrypted save/load + DID after save — TypeScript (TSX)
    │   └── WalletAuthScreen.tsx        # WalletConnect + /api/auth/wallet/* + SecureStore JWT — TypeScript (TSX)
    ├── services/
    │   ├── api.ts            # Axios + Bearer + retry/backoff — TypeScript
    │   ├── chatHistoryService.ts # DEK in SecureStore; GET/POST /api/chat/load|save; optional DID trigger after save — TypeScript
    │   ├── chatSessionLifecycle.ts # Reset symmetric key + DEK + AsyncStorage on wallet change / logout — TypeScript
    │   ├── chatStream.ts     # POST /api/chat/completions SSE + retries + delta buffering + stream phases — TypeScript
    │   ├── didService.ts     # POST /api/did/update then wallet sendTransaction (chat reference) — TypeScript
    │   ├── secureToken.ts    # SecureStore: JWT + wrapped DEK per wallet — TypeScript
    │   ├── walletApi.ts      # fetch helpers: wallet connect/verify, /me, logout — TypeScript
    │   └── walletService.ts  # Sepolia switch, sign-in orchestration — TypeScript
    ├── instrumentation/
    │   ├── sentry.ts         # initSentry (release from expo-constants), captureException / monitoring — TypeScript
    │   └── activation.ts     # trackActivation funnel (Sentry breadcrumbs + messages) — TypeScript
    ├── store/
    │   └── authStore.ts      # Zustand: token, session fields, hydrate, restoreSession — TypeScript
    └── types/
        └── walletconnect.ts  # WcEthereumProvider type alias — TypeScript
```

---

## backend

```
backend/
├── package.json         # Backend app deps & scripts — JSON
├── package-lock.json    # Lockfile — JSON
├── tsconfig.json        # TypeScript config — JSON
├── vitest.config.ts     # Vitest config — TypeScript
├── .eslintrc.json       # ESLint config — JSON
├── .prettierrc          # Prettier config — JSON
├── env.example          # Env template — Text
├── .cursor/rules/service_scope.mdc
├── prisma/
│   └── schema.prisma    # Backend DB schema — Prisma
└── src/
    ├── server.ts        # Express server: contact, subscribe, security (helmet, rate limit) — TypeScript
    └── __tests__/
        └── api.test.ts  # API tests — TypeScript
```

---

## frontend

```
frontend/
├── package.json         # Frontend deps & scripts — JSON
├── package-lock.json    # Lockfile — JSON
├── index.html           # SPA entry — HTML
├── tsconfig.json        # TypeScript config — JSON
├── tsconfig.node.json   # Vite/Node TS config — JSON
├── vite.config.ts       # Vite config — TypeScript
├── vitest.config.ts     # Vitest config — TypeScript
├── tailwind.config.js   # Tailwind config — JavaScript
├── postcss.config.js    # PostCSS config — JavaScript
├── .eslintrc.cjs        # ESLint config — JavaScript
├── .prettierrc          # Prettier config — JSON
├── env.example          # Env template — Text
├── .cursor/rules/service_scope.mdc
└── src/
    ├── main.tsx         # React entry — TypeScript (TSX)
    ├── App.tsx          # App shell & routes — TypeScript (TSX)
    ├── index.css        # Global CSS — CSS
    ├── test/
    │   └── setup.ts     # Test setup — TypeScript
    └── components/
        ├── EmailSignup.tsx       # Email signup — TypeScript (TSX)
        ├── Footer.tsx            # Footer — TypeScript (TSX)
        ├── Hero.tsx              # Hero — TypeScript (TSX)
        ├── PlausibleAnalytics.tsx # Analytics — TypeScript (TSX)
        └── __tests__/
            └── EmailSignup.test.tsx # EmailSignup tests — TypeScript (TSX)
```

---

## deploy

```
deploy/
└── app/
    ├── .env.example         # App stack env template — Text
    └── .env                   # Local overrides (often gitignored) — Text
```

*(Compose files and Caddyfile are generated on the server by `deployment/deploy-app.sh`; env templates live under `deploy/app/`.)*

---

## deployment

```
deployment/
├── DEPLOY-RUNBOOK.md                  # Validated prod path (scw-last-app, Scaleway direct) — Markdown
├── deploy.sh                          # Canonical entrypoint: Terraform + deploy-app.sh (Scaleway direct) — Shell
├── deploy-app.sh                      # App stack only (called by deploy.sh; Caddy + SPA + Python/Scaleway proxy) — Shell
├── deploy-safepsy.sh                  # Thin wrapper → deploy.sh (CI compatibility) — Shell
├── deploy-live-app.sh                 # Prod preset → deploy.sh (151.115.151.231, Scaleway direct) — Shell
├── deploy-local-app.sh                # Local Docker stack (Caddy + SPA + Python proxy); writes .local-app-stack/ — Shell
├── deploy-instance-aware-roadmap.sh   # Deprecated wrapper → deploy.sh — Shell
├── local-app/
│   └── backend/                       # Shared Python API proxy (main.py) for deploy-app + local stack — Python
├── deploy-issue.md                    # Known deploy blockers + Scaleway / SSH checklist — Markdown
├── install-app-monitor-remote.sh      # Remote install for app monitor — Shell
├── on-app-server-recover.sh           # On-server recovery steps — Shell
├── verify-production.sh               # Production verification — Shell
├── logrotate-app-monitor.example      # Logrotate sample for monitor — Text
├── app-server-monitor/
│   └── monitor.sh                     # Host monitor script — Shell
├── systemd/
│   ├── app-monitor.service            # systemd unit — Unit file
│   └── app-monitor.timer              # systemd timer — Unit file
└── deployment-logs/                   # deploy.sh: deploy.jsonl (events), tf-output.json (terraform output -json), debug-fcc1a0.log (NDJSON) — Text
```

---

## scripts

```
scripts/
├── backup-all.sh              # Full backup — Shell
├── backup-config.env.example  # Backup script env template — Text
├── backup-gpu-images.sh       # GPU image backup — Shell
├── backup-mongodb.sh          # MongoDB backup — Shell
├── backup-redis.sh            # Redis backup — Shell
├── dr-disaster-recovery.sh    # Disaster recovery — Shell
├── restore-gpu-images.sh      # Restore GPU images — Shell
├── restore-mongodb.sh         # Restore MongoDB — Shell
├── restore-redis.sh           # Restore Redis — Shell
├── run-ci-locally.sh          # Run CI checks locally — Shell
├── restore-and-export-email-subscriptions.sh  # Restore Postgres dump then export waitlist CSV — Shell
├── run-local.sh               # Local dev orchestration helper — Shell
├── simulate-llm-failure.sh    # Manual LLM degradation / upstream-status checks — Shell
├── test-ci-cd.sh              # CI/CD smoke script — Shell
├── security-check.js          # Security check script — JavaScript
└── verify-mock-flow.ts        # E2E mock DID/auth flow (invoked via `npm run verify:flow`) — TypeScript
```

---

## infra

```
infra/
├── observability/
│   ├── prometheus/
│   │   ├── prometheus.yml   # Prometheus config — YAML
│   │   └── alerts.yml       # Alert rules — YAML
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   └── datasources.yml  # Grafana datasources — YAML
│       │   └── dashboards/
│       │       └── dashboards.yml   # Dashboard provisioning — YAML
│       └── dashboards/
│           ├── api-metrics.json       # API dashboard — JSON
│           ├── database-metrics.json  # DB dashboard — JSON
│           ├── email-recipients.json  # Email dashboard — JSON
│           └── system-metrics.json    # System dashboard — JSON
└── terraform/
    ├── .gitignore
    └── .terraform.lock.hcl  # Provider lock; `.tf` sources may be absent in this checkout — HCL
```

Terraform modules and usage are described under `documentation/private documentation/infra/terraform/` (see **documentation** below).

---

## tests (root-level)

```
tests/
├── emailService.test.ts    # Email service tests — TypeScript
├── emailSignup.test.tsx    # Email signup tests — TypeScript (TSX)
└── subscribeRoute.test.ts  # Subscribe route tests — TypeScript
```

---

## documentation

```
documentation/
├── README.md                    # Top-level doc pointer — Markdown
│
├── public documentation/        # Shareable / external-facing copies of guides
│   ├── README.md
│   ├── AUTHORS.md
│   ├── BETA_QUICKSTART.md
│   ├── BETA_QUICKSTART_AND_OFFBOARDING.md
│   ├── CHANGELOG.md
│   ├── CHAT_COMPLETE_GUIDE.md
│   ├── CLAIMS_AND_TRUST_LANGUAGE.md
│   ├── CODE_OF_CONDUCT.md
│   ├── CONVERSION_METRICS.md      # Funnel cookie schema (`sp_product_metrics`) — Markdown
│   ├── DEPENDENCIES.md
│   ├── DID_COMPLETE_GUIDE.md
│   ├── ENCRYPTION_COMPLETE_GUIDE.md
│   ├── FAQ.md
│   ├── LAUNCH.md
│   ├── LICENSE.md
│   ├── NODE-LICENSE.md
│   ├── outreach.md
│   ├── PRICING_COMPLETE_GUIDE.md
│   ├── PRIVACY-BY-DESIGN.md
│   ├── PRODUCTION_FIXES_2026_05_08.md  # Critical production blockers resolved (DID update flow, env template, verification script) — Markdown
│   ├── RAG_COMPLETE_GUIDE.md
│   ├── SECURITY_COMPLETE_GUIDE.md
│   ├── SMART_CONTRACTS_AUDIT_REPORT.md
│   ├── TESTING_COMPLETE_GUIDE.md
│   ├── THIRD-PARTY-NOTICES.md
│   ├── VALIDATION_QUICK_START.md
│   ├── WALLET_COMPLETE_GUIDE.md
│   ├── api/SSE_STREAMING_CONTRACT.md  # SSE wire format for apps/api chat streaming — Markdown
│   ├── api/contracts/governance/GOVERNANCE.md
│   ├── ISO27001/                # Policy pack (scope, SoA, checklist, etc.)
│   └── whitepaper/whitepaper.md
│
└── private documentation/       # Internal ops, CI/CD, contracts, runbooks (this file lives here)
    ├── README.md
    ├── REPOSITORY_SYNTAX_TREE.md   # This file — Markdown (updated 2026-05-10)
    ├── APPLY_SCHEMA.md
    ├── BACKUP_DR_COMPLETE_GUIDE.md
    ├── BACKUP_DR_IMPLEMENTATION_SUMMARY.md
    ├── CI_CD_GUIDE.md
    ├── CI_CD_SETUP_SUMMARY.md
    ├── CLAIMS_EVIDENCE_AND_MAINTENANCE.md
    ├── CONTRACT_IMPLEMENTATION_SUMMARY.md
    ├── DATABASE_DEBUG_GUIDE.md
    ├── DEPLOYMENT_AUDIT.md
    ├── DEPLOYMENT_FILES_INDEX.md
    ├── DEPLOYMENT_README.md
    ├── EXCHANGE_PARTNER_ONE_PAGER.md
    ├── GOVERNANCE.md
    ├── INCIDENT_ESCALATION_AND_COMMS.md
    ├── LAUNCH.md
    ├── MOBILE_LAUNCH_STRESS_TEST.md  # Pre-ship device checklist (WC, DID, deep links, compliance) — Markdown
    ├── PRODUCTION_ENV_LOCK.md        # API + Universal Link + AASA same-domain matrix; EAS secrets — Markdown
    ├── chatbot.md               # Chatbot + API gateway + Scaleway direct (internal)
    ├── ../chatbot-migration.md  # FastAPI VM removed; Scaleway direct (repo root documentation/)
    ├── CONTRACTS_SCRIPTS_TSC.md  # Why tsc reports errors under apps/api/src/contracts/scripts — Markdown
    ├── TYPESCRIPT_ISSUES_REPORT.md  # Snapshot of remaining TS diagnostics (esp. apps/web) — Markdown
    ├── GUEST_MODE.md           # Guest vs wallet chat flow (internal)
    ├── PERSONAS.md
    ├── SCALEWAY_SECRET_MANAGER_SETUP.md
    ├── SECURITY_HEADERS_IMPLEMENTATION.md   # Caddy headers + dependency review (ex-DEPENDENCY_SECURITY_REVIEW Mar 2026)
    ├── SEO_ACCESSIBILITY_IMPLEMENTATION.md
    ├── SHELL_SCRIPTS_DOCUMENTATION.md
    ├── SMART_CONTRACTS_COMPREHENSIVE_TESTING.md
    ├── SMART_CONTRACTS_DEPLOYMENT.md
    ├── TECHNICAL_REVIEW.md     # Restored from pre-consolidation `REVIEW_UX_UI_SECURITY.md` (UX/UI/security review; updated 2026-05-08 with production fixes; cross-check with sprint/tree when architecture changes)
    ├── TOKENOMICS.md
    ├── VC_ONE_PAGER.md
    ├── WAF_CONFIGURATION.md
    ├── programming_sprint.md   # Restored from pre-consolidation `COMPLETE_IMPLEMENTATION_SUMMARY.md` (implementation status + follow-ups; updated 2026-05-10 — `app.ts`, prod `/api/testing` gate)
    ├── safepsy-web3-client.md
    ├── api/contracts/           # Hardhat / deployment quick starts
    ├── api/deployments/         # DID, RAG, SSE, wallet RPC, email setup
    ├── infra/                   # Terraform & observability write-ups
    ├── ops/                     # Operations, DB, troubleshooting
    ├── runbooks/                # 01–10 numbered runbooks + README; `runbooks/scripts/README.md`
    └── scripts/                 # Backup / disk cleanup readme
```

Some guides exist in both **public** and **private** trees (e.g. `LAUNCH.md`, one-pagers, `PERSONAS.md`) with different paths; treat **private documentation** as the canonical place for runbooks and operational detail.

---

## Language summary

| Language     | Role |
|-------------|------|
| TypeScript  | API (Express), Web app (React), contract scripts, tests |
| TSX         | React components and pages |
| Solidity    | DID & governance smart contracts |
| JavaScript  | Configs, Hardhat, deploy/script ESM/CJS, some tests |
| Python      | App-stack API proxy (`deployment/local-app/backend`), deploy helpers |
| Prisma      | Database schema |
| JSON        | Package/config, deployments, Grafana dashboards |
| YAML        | CI/CD, Docker Compose, Prometheus/Grafana |
| Shell       | Deploy, backup/restore, entrypoints |
| CSS         | Global and component styles |
| HTML        | SPA entry (index.html) |
| Markdown    | Documentation |
| MDC         | Cursor rules (`.cursor/rules/**/*.mdc`) |
| Dockerfile  | App stack images (frontend/backend via deploy-app.sh) |
| Caddyfile   | Reverse proxy config (when present in deploy trees) |

---

## App flow (high level)

- **Web (`apps/web`)**: React SPA → WalletContext/AuthContext (`userMode`: guest vs authenticated) → DID, chat (guest: in-memory + `mode: guest` API; verified: encrypted save/load), payment, legal, FAQ, support/feedback, and landing (`Landing.tsx`: `/`, primary CTAs to `/register`; `/about-us` redirects to `/explore`; routes such as `/explore`, `/register`, `/contact-us`, `/faq`, `/beta/chat`). Production chat hits the app Python proxy (Scaleway direct) or `apps/api` when Node API is deployed.
- **API (`apps/api`)**: Express server (`index.ts` → `createApp()` in **`app.ts`**) → auth, did, chat, payment, subscribe, contact, rag routes; **`/api/testing`** mounted only outside production; middleware for auth, quota, safety, metrics; Prisma + PostgreSQL; DID contracts on-chain; `AIGatewayService` → Scaleway Generative API.
- **Backend / `frontend/`**: Legacy or parallel apps (contact, subscribe, simpler UI); **not** in npm `workspaces` (root workspaces are `apps/*` only).
- **Deploy**: `deployment/` scripts (deploy, verify, monitor), `deploy/*.env.example` templates; `infra/observability` for Prometheus/Grafana; Terraform docs under `documentation/private documentation/infra/terraform/`.
- **Docs**: `documentation/public documentation/` for outward-facing guides; `documentation/private documentation/` for runbooks, CI/CD, and ops.

---

## Build and dependency outputs (included in tree)

These directories are generated by tooling and are part of the repository tree; they are not versioned in full but their role is documented here.

| Path | Function | Language / contents |
|------|----------|----------------------|
| `dist/` | Compiled API output (e.g. `apps/api/dist/`): transpiled JS and `.d.ts` from `apps/api/src/` | JavaScript, TypeScript declarations |
| `artifacts/` | Hardhat build output (e.g. `apps/api/artifacts/`): compiled Solidity ABIs, bytecode, build info | JSON, Solidity build artifacts |
| `.terraform/` | Terraform state and provider cache (e.g. `infra/terraform/.terraform/`) | Terraform internal (providers, modules) |
| `node_modules/` | Installed npm dependencies at root, `apps/api`, `apps/web`, and optionally `backend` / `frontend` | Mixed (packages) |
| `apps/web/dist/` | Vite production build of the web app: bundled JS/CSS, `index.html`, hashed asset filenames | JavaScript, CSS, HTML |
| `apps/web/dist-ssr/` | SSR bundle + prerender output from `vite.ssr.config.ts` / `scripts/prerender.mjs` (e.g. `entry-server.cjs`); may be gitignored or generated locally | JavaScript, HTML fragments |

**Notes:**

- **`dist/`**: Produced by `tsc` (and/or the API build script). Entry: `apps/api/dist/index.js`.
- **`artifacts/`**: Produced by `hardhat compile`; contains OpenZeppelin and project contract artifacts under `apps/api/artifacts/`.
- **`.terraform/`**: Created by `terraform init`; holds providers and module cache; often gitignored.
- **`node_modules/`**: Created by `npm install`; contains all package dependencies; gitignored.
- **`apps/web/dist/`**: Produced by `vite build`; deployable static SPA output.
