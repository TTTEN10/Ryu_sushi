# SafePsy — Comprehensive Features Review & Improvement Plan

**Date:** 2026-06-05
**Based on:** UI_UX_USER_ACTIONS.md, codebase audit, user feedback

---

## Executive Summary

SafePsy is a **privacy-first mental wellness platform** with:
- ✅ Wallet-based authentication (SIWE)
- ✅ Soulbound DID identity tokens (Sepolia)
- ✅ AES-256-GCM encrypted chat at rest
- ✅ Guest mode (5 messages/session)
- ✅ Freemium quota system (10/day, 100/month free)
- ✅ Premium tier via crypto payments (ETH, USDT, USDC)
- ✅ Cookie consent management (GDPR-compliant)
- ✅ Offline form queuing
- ✅ Mobile app (Expo/React Native)

**Activation Definition:** DID created + first meaningful chat exchange

**Current Gaps:** Several features are latent/unreleased, and UX friction points exist in the activation flow.

---

## 1. Complete Feature Inventory

### 1.1 Frontend Features (Web)

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Authentication** | Wallet connect (MetaMask/WalletConnect) | ✅ Shipped | Sepolia only |
| | SIWE verification (sign-in with Ethereum) | ✅ Shipped | No gas required |
| | Session management (httpOnly cookies) | ✅ Shipped | 7-day expiry |
| | Idle timeout (1 hour) | ✅ Shipped | Auto-logout |
| **Identity** | DID status check | ✅ Shipped | Backend + on-chain |
| | DID creation modal | ✅ Shipped (fixed) | Non-dismissible |
| | DID profile visualization | ⚠️ Latent | `AboutMe.tsx` not routed |
| **Chat** | Guest mode (5 msgs/session) | ✅ Shipped | In-memory only |
| | Encrypted chat persistence | ✅ Shipped | Wallet-derived keys |
| | Streaming responses (SSE) | ✅ Shipped | OpenAI-compatible |
| | Message edit (30s window) | ✅ Shipped | Authenticated only |
| | Message delete | ✅ Shipped | With confirmation |
| | Conversation history load | ✅ Shipped | Decrypts on load |
| | Suggestion chips (2 presets) | ✅ Shipped | Empty state |
| | Offline indicator | ✅ Shipped | Blocks send |
| **Quotas** | Free tier (10/day, 100/month) | ✅ Shipped | Backend-enforced |
| | Quota exceeded detection | ✅ Shipped | 429 response |
| | Paywall modal | ✅ Shipped | ETH/USDT/USDC |
| | Premium tier (100/day, 1000/month) | ✅ Shipped | Backend config |
| **Payments** | Crypto payment (ETH) | ✅ Shipped | CoinGecko oracle |
| | Crypto payment (USDT/USDC) | ✅ Shipped | Fixed $20/30 days |
| | Transaction verification | ✅ Shipped | POST `/api/payment/crypto` |
| | Payment receipt | ⚠️ Partial | In-app only, no email |
| **Consent** | Cookie banner (essential/functional/analytics) | ✅ Shipped | GDPR-compliant |
| | Cookie preferences modal | ✅ Shipped | Granular control |
| | Consent persistence (localStorage) | ✅ Shipped | Per-domain |
| **Forms** | Waitlist signup | ✅ Shipped | POST `/api/subscribe` |
| | Contact form | ✅ Shipped | POST `/api/contact` |
| | Feedback form | ⚠️ Client-only | No API endpoint |
| | Offline queueing | ✅ Shipped | sessionStorage |
| **Navigation** | Header (logo, theme toggle, wallet) | ✅ Shipped | Contextual |
| | Footer (links, legal) | ✅ Shipped | All legal docs |
| | Floating CTA (landing) | ✅ Shipped | Bottom-right |
| | Theme toggle (light/dark) | ✅ Shipped | Persisted |
| **Accessibility** | Skip links / focus management | ✅ Shipped | `useFocusManagement` |
| | ARIA labels on accordions | ✅ Shipped | FAQ, Support |
| | Keyboard navigation | ✅ Shipped | `useKeyboardNavigation` |
| | Min touch target (44px) | ✅ Shipped | All buttons |
| **Performance** | Lazy loading | ⚠️ Partial | Some components |
| | Image optimization | ❌ Missing | No images yet |
| | Code splitting | ✅ Shipped | React Router |
| **Analytics** | Privacy-first funnel tracking | ✅ Shipped | No PII in payload |
| | Conversion metrics (first message/reply) | ✅ Shipped | LocalStorage counters |
| | Consent-aware SDK loading | ✅ Shipped | Dynamic import |

### 1.2 Backend Features (API)

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Auth** | SIWE signature verification | ✅ Shipped | Ethers.js |
| | JWT session tokens | ✅ Shipped | 7-day expiry |
| | httpOnly cookies | ✅ Shipped | Secure, HttpOnly |
| | Logout (clear cookie) | ✅ Shipped (fixed) | No auth required |
| **DID** | DID existence check | ✅ Shipped | Legacy + V2 registry |
| | DID creation (backend signer) | ✅ Shipped (fixed) | Legacy contract only |
| | DID profile retrieval | ✅ Shipped | On-chain + DB |
| | Encrypted key metadata | ✅ Shipped | On-chain storage |
| | Chat reference sync | ✅ Shipped | Hash-based pointer |
| **Chat** | Streaming completions (SSE) | ✅ Shipped | Scaleway API |
| | Encrypted chat save | ✅ Shipped | POST `/api/chat/save` |
| | Encrypted chat load | ✅ Shipped | GET `/api/chat/load` |
| | Chat summary generation | ⚠️ Partial | AI summary, encrypted storage |
| | Chat export | ⚠️ Latent | `POST /api/chat/export` exists |
| | Chat deletion | ✅ Shipped | DELETE `/api/chat` |
| | Concurrency guard | ✅ Shipped | One request per wallet |
| **Quotas** | Redis-based counter | ✅ Shipped | Daily + monthly |
| | Subscription tiers | ✅ Shipped | FREE / PREMIUM |
| | Quota reset scheduling | ✅ Shipped | Auto-reset |
| **Payments** | Crypto price oracle (CoinGecko) | ✅ Shipped | Real-time ETH price |
| | Payment verification | ✅ Shipped | On-chain tx check |
| | Tier upgrade | ✅ Shipped | Immediate activation |
| **Safety** | Injection filter (SQL/XSS/command) | ✅ Shipped | Safety middleware |
| | Content moderation | ✅ Shipped | Profanity/hate speech |
| | PII redaction (logs) | ✅ Shipped | Email/phone/SSN |
| | Rate limiting | ✅ Shipped | Per-endpoint |
| **Storage** | Scaleway Object Storage | ✅ Shipped | Encrypted summaries |
| | IPFS fallback | ⚠️ Configured | Not tested |
| **Email** | Postmark integration | ✅ Shipped | Stub mode default |
| | AWS SES integration | ✅ Shipped | Alternative |
| | Confirmation email pipeline | ⚠️ Feature flag | `ENABLE_CONFIRMATION_EMAIL` |
| | Admin notifications | ⚠️ Feature flag | `ENABLE_ADMIN_NOTIFICATION_EMAIL` |
| **Observability** | Structured logging (Winston) | ✅ Shipped | JSON format |
| | Health endpoints | ✅ Shipped | `/health`, `/readyz` |
| | Upstream health monitoring | ✅ Shipped | LLM probe interval |
| **Database** | PostgreSQL (Prisma ORM) | ✅ Shipped | Migrations |
| | Encrypted chats table | ✅ Shipped | Wallet-address keyed |
| | Subscriptions table | ✅ Shipped | Tier tracking |
| | Security audit logs | ✅ Shipped | Event tracking |

### 1.3 Mobile App Features (Expo)

| Feature | Status | Parity with Web |
|---------|--------|-----------------|
| Guest chat (5 msgs) | ✅ Shipped | ✅ |
| WalletConnect auth | ✅ Shipped | ✅ |
| SIWE verification | ✅ Shipped | ✅ |
| Encrypted chat | ✅ Shipped | ✅ |
| Streaming responses | ✅ Shipped | ✅ |
| Paywall | ⚠️ Check parity | ✅ |
| Cookie consent | ❌ N/A (native) | — |
| Waitlist/contact forms | ❌ Missing | ⚠️ Web only |
| Theme toggle | ❌ System default | ⚠️ Web only |

---

## 2. Identified Gaps & Friction Points

### 2.1 Critical UX Friction (Blocks Activation)

| # | Issue | Impact | Priority |
|---|-------|--------|----------|
| 1 | **DID creation requires Sepolia ETH** (gas) | Users can't activate without faucet | 🔴 P0 |
| 2 | **Backend DID creation broken on production** | Error: "public minting not allowed" | 🔴 P0 |
| 3 | **Logout doesn't clear session** | Users stuck logged in | 🔴 P0 |
| 4 | **Chat decryption fails after refresh** | Lost chats, poor retention | 🔴 P0 |
| 5 | **No clear path to DID creation** | Users miss activation step | 🟠 P1 |
| 6 | **Feedback form has no API** | User feedback lost | 🟡 P2 |

### 2.2 Feature Gaps (Missing but Valuable)

| # | Feature | Value | Effort | Priority |
|---|---------|-------|--------|----------|
| 1 | **Email receipts for payments** | Trust, compliance | Low | 🟠 P1 |
| 2 | **Chat export UI** (AboutMe) | Data ownership, GDPR | Low | 🟠 P1 |
| 3 | **Onboarding tutorial** (BetaTutorial) | Reduce confusion | Low | 🟠 P1 |
| 4 | **DID profile page** (routed AboutMe) | Transparency | Low | 🟡 P2 |
| 5 | **Pricing page** (routed Payment) | Discoverability | Low | 🟡 P2 |
| 6 | **Multi-language support** | Accessibility | Medium | 🟡 P2 |
| 7 | **Crisis resource banner** | Safety, compliance | Low | 🟠 P1 |
| 8 | **Chat search** | Usability | Medium | 🟢 P3 |
| 9 | **Conversation folders/tags** | Organization | High | 🟢 P3 |
| 10 | **Mobile app store deployment** | Reach | High | 🟠 P1 |

### 2.3 Technical Debt

| # | Issue | Risk | Priority |
|---|-------|------|----------|
| 1 | **Redis not configured in production** | Quotas not enforced | 🔴 P0 |
| 2 | **404 errors on analytics endpoints** | Broken funnel tracking | 🟠 P1 |
| 3 | **Paywall copy mismatch** (125 vs 100 daily) | Confusion | 🟡 P2 |
| 4 | **No error boundary on chat widget** | App crashes on SSE errors | 🟠 P1 |
| 5 | **No retry logic for failed payments** | Lost conversions | 🟠 P1 |

---

## 3. Recommended Improvements (Prioritized)

### Phase 1: Fix Activation Flow (Week 1-2)

#### 3.1.1 Sponsor DID Creation Gas (P0)
**Problem:** Users need Sepolia ETH for gas (~$0.05) to create DID — friction point.

**Solutions:**
- **Option A:** Backend-sponsored mint (backend pays gas, user doesn't transact)
  - Requires: Backend signer wallet with Sepolia ETH
  - UX: "Create Safe ID Token" button → backend mints → user sees success
  - Cost: ~$0.05 per user (backend absorbs)

- **Option B:** Gasless meta-transaction (relayer)
  - Requires: Biconomy/Stackup integration
  - UX: User signs message → relayer submits tx
  - Cost: ~$0.10-0.50 per user (relayer fees)

- **Option C:** Keep user-pays but improve education
  - Add faucet links to modal
  - Show "Get Sepolia ETH" button before create
  - Cost: $0 (user pays)

**Recommendation:** **Option A** (backend-sponsored) — lowest friction, aligns with "no gas required" messaging.

#### 3.1.2 Deploy Backend Fixes (P0)
**Required deploys:**
1. `apps/api/src/routes/auth.ts` — Logout without auth requirement
2. `apps/api/src/lib/did.service.ts` — Legacy contract fallback for `hasDid()`
3. `apps/api/src/routes/did.ts` — Use legacy contract for `createDid()`

**Deploy script:**
```bash
# On production server
cd /opt/safepsy
git pull origin main
DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-app.sh
```

#### 3.1.3 Add Crisis Resource Banner (P1)
**Implementation:**
```tsx
// ChatWidget.tsx — above chat input
{!isGuest && (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
    <p className="text-xs text-amber-800 dark:text-amber-300">
      <strong>Crisis support:</strong> Dr. Safe is not a crisis service. 
      If you're in crisis, please contact your local emergency number or 
      visit <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a>.
    </p>
  </div>
)}
```

#### 3.1.4 Route AboutMe Component (P1)
**Add to router:**
```typescript
// apps/web/src/router.tsx
{
  path: '/profile',
  element: (
    <RouteWithSEO>
      <AboutMe />
    </RouteWithSEO>
  ),
}
```

**Update DID modal:**
```tsx
// After successful DID creation
showToast('success', 'Safe ID Token created! View your profile →')
// Link to /profile
```

### Phase 2: Improve Retention (Week 3-4)

#### 3.2.1 Implement Onboarding Tutorial (P1)
**Component:** `BetaTutorial.tsx` (already exists)

**Wire up:**
```tsx
// Testing.tsx
const [showTutorial, setShowTutorial] = useState(() => {
  return !localStorage.getItem('betaTutorialDismissed');
});

{showTutorial && <BetaTutorial onDismiss={() => {
  localStorage.setItem('betaTutorialDismissed', '1');
  setShowTutorial(false);
}} />}
```

**Content:**
1. What is Dr. Safe? (AI companion, not therapy)
2. How it works (guest → wallet → DID)
3. Privacy & encryption (your keys, your data)
4. Quotas & Premium (free tier limits)
5. Crisis disclaimer (not for emergencies)

#### 3.2.2 Enable Payment Receipts (P1)
**Backend:**
```typescript
// apps/api/src/routes/payment.ts
import { sendPaymentReceipt } from '../lib/email';

// After successful payment verification
await sendPaymentReceipt({
  to: user.email, // If available
  walletAddress,
  tier: 'PREMIUM',
  amount: '20 USDT',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  txHash: receipt.hash,
});
```

**Email template:**
```html
<!-- templates/payment-receipt.html -->
<h1>SafePsy Premium Activated</h1>
<p>Your Premium tier is active for 30 days.</p>
<ul>
  <li>100 messages/day</li>
  <li>1000 messages/month</li>
  <li>Expires: {expiresAt}</li>
</ul>
<p>Transaction: {txHash}</p>
```

#### 3.2.3 Fix Feedback Form (P2)
**Backend endpoint:**
```typescript
// apps/api/src/routes/feedback.ts
router.post('/submit', async (req, res) => {
  const { email, feedback } = req.body;
  // Store in DB or send to admin email
  await saveFeedback({ email, feedback, timestamp: new Date() });
  res.json({ success: true, message: 'Thank you for your feedback!' });
});
```

**Frontend:**
```tsx
// Feedback.tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await apiFetch('/api/feedback/submit', {
    method: 'POST',
    body: JSON.stringify({ email, feedback }),
  });
  // Handle success/error
};
```

### Phase 3: Polish & Scale (Week 5-6)

#### 3.3.1 Add Chat Search (P3)
**Backend:**
```typescript
// POST /api/chat/search
const searchResults = await prisma.encryptedChat.findMany({
  where: {
    walletAddress,
    // Decrypt and search content (requires key)
  },
});
```

**Frontend:**
```tsx
// Search modal in ChatWidget
const [showSearch, setShowSearch] = useState(false);
const [query, setQuery] = useState('');
const [results, setResults] = useState([]);
```

#### 3.3.2 Implement Multi-Language (i18n) (P2)
**Library:** `react-i18next`

**Supported languages:**
- English (default)
- French (priority, given "Dr. Safe" positioning)
- Spanish (optional)

**Implementation:**
```bash
npm install react-i18next i18next
```

```tsx
// i18n/config.ts
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ... } },
    fr: { translation: { ... } },
  },
  fallbackLng: 'en',
});
```

#### 3.3.3 Mobile App Store Deployment (P1)
**Checklist:**
- [ ] TestFlight (iOS) / Internal Testing (Android)
- [ ] App Store screenshots
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Age rating (17+ for mental health)
- [ ] App Review submission

---

## 4. Metrics & Success Criteria

### 4.1 Activation Funnel (Primary KPI)

| Stage | Current | Target | Measurement |
|-------|---------|--------|-------------|
| Landing → Beta Chat | ~60% | 80% | Analytics: `landing_visit` → `beta_chat_open` |
| Beta Chat → Wallet Connect | ~20% | 40% | Analytics: `wallet_connect_click` |
| Wallet Connect → Verify | ~70% | 90% | Analytics: `wallet_verified` |
| Verify → DID Created | ~30% | 70% | Analytics: `did_created` |
| DID Created → First Chat | ~80% | 95% | Analytics: `first_message_sent` |
| **Overall Activation Rate** | **~2.5%** | **15%** | Product of all stages |

### 4.2 Retention Metrics

| Metric | Current | Target |
|--------|---------|--------|
| D1 Retention (return within 24h) | TBD | 40% |
| D7 Retention (return within 7 days) | TBD | 25% |
| D30 Retention | TBD | 15% |
| Premium Conversion | TBD | 5% |

### 4.3 Technical Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API latency (p95) | < 500ms | > 1000ms |
| SSE stream start time | < 2s | > 5s |
| Chat save success rate | > 99% | < 95% |
| DID creation success rate | > 95% | < 80% |
| Payment success rate | > 90% | < 75% |

---

## 5. Implementation Roadmap

### Week 1-2: Critical Fixes
- [ ] Deploy backend logout fix
- [ ] Deploy backend DID creation fix
- [ ] Implement backend-sponsored DID mint (gas sponsorship)
- [ ] Add crisis resource banner
- [ ] Fix chat decryption (localStorage key validation)

### Week 3-4: Activation Improvements
- [ ] Route AboutMe component (`/profile`)
- [ ] Implement onboarding tutorial
- [ ] Enable payment receipts (email)
- [ ] Fix feedback form API
- [ ] Add Redis to production (quota enforcement)

### Week 5-6: Polish & Scale
- [ ] Implement chat search
- [ ] Add multi-language support (EN/FR)
- [ ] Mobile app TestFlight deployment
- [ ] Add error boundaries
- [ ] Implement payment retry logic

### Month 2: Advanced Features
- [ ] Chat folders/tags
- [ ] Conversation export UI
- [ ] Admin dashboard (quota management)
- [ ] RAG integration (contextual responses)
- [ ] Mobile app store launch

---

## 6. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sepolia faucet downtime | Medium | High | Multiple faucet links; backend sponsorship |
| DID contract gas price spike | Low | Medium | Gas buffer in backend signer wallet |
| Redis outage (quotas) | Low | Medium | Fallback to DB counters |
| Payment verification failure | Medium | High | Manual review queue; retry logic |
| Legal/compliance issues | Low | High | Legal review of all copy; crisis disclaimers |

---

## 7. Conclusion

SafePsy has a **solid foundation** with:
- ✅ Privacy-first architecture
- ✅ Wallet-based auth (no email/password)
- ✅ On-chain identity (DID)
- ✅ Encrypted chat at rest
- ✅ Freemium model with crypto payments

**Critical next steps:**
1. **Fix activation flow** (DID creation, logout, chat decryption)
2. **Reduce friction** (gas sponsorship, onboarding tutorial)
3. **Improve trust** (crisis banner, payment receipts, chat export)

**Expected outcome:** Activation rate increase from ~2.5% → 15%, D7 retention from TBD → 25%.

---

**Appendix A:** Related Documentation
- [UI_UX_USER_ACTIONS.md](./private%20documentation/UI_UX_USER_ACTIONS.md) — Complete UX inventory
- [LAUNCH.md](./public%20documentation/LAUNCH.md) — Product positioning
- [PERSONAS.md](./private%20documentation/PERSONAS.md) — User segments
- [BETA_QUICKSTART_AND_OFFBOARDING.md](./public%20documentation/BETA_QUICKSTART_AND_OFFBOARDING.md) — Onboarding/offboarding

**Appendix B:** Code Locations
- Frontend: `apps/web/src/`
- Backend: `apps/api/src/`
- Mobile: `apps/safepsy-mobile/src/`
- Deployment: `deployment/`
