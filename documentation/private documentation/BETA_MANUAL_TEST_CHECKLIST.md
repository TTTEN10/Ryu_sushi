# Beta Manual Testing Checklist — SafePsy

**Document Version:** 1.0  
**Created:** August 20, 2026  
**Beta Launch Target:** August 27 - September 3, 2026

---

## Test Session Information

**Test Date:** _______________  
**Tester:** _______________  
**Environment:** ☐ Local (localhost:9080) | ☐ Staging | ☐ Production (polinapsycho.com)  
**Browser:** ☐ Chrome | ☐ Firefox | ☐ Safari | ☐ Edge | Version: _______  
**Wallet:** ☐ MetaMask | ☐ WalletConnect | ☐ Other: _______  
**Network:** ☐ Sepolia Testnet | ☐ Ethereum Mainnet  

---

## Pre-Test Setup

### 1. Prerequisites Checklist

- [ ] MetaMask or compatible wallet installed in browser
- [ ] Sepolia network added to wallet
- [ ] Wallet has some Sepolia ETH (for user transactions, optional if backend-sponsored)
- [ ] Backend signer wallet funded (~0.8 ETH for gas sponsorship)
- [ ] Redis running (for quota enforcement):
  ```bash
  # Local
  docker run -d -p 6379:6379 --name safepsy-redis redis:alpine
  
  # Production (verify after deploy)
  docker-compose exec redis redis-cli ping  # Should return: PONG
  ```

### 2. Deploy Application

```bash
# Production deploy
cd /Users/thibauttenenbaum/Documents/Dev/SafePsy/SPiOSv2
./deployment/deploy-live-app.sh

# Local deploy (alternative)
npm run deploy:local
```

### 3. Verify Deployment

```bash
# Check API health
curl https://polinapsycho.com/healthz  # Should return: ok

# Check chat health
curl https://polinapsycho.com/api/chat/health

# Check Redis connection
docker-compose exec redis redis-cli ping  # Should return: PONG

# Check containers running
docker-compose ps
```

---

## Section 1: Authentication & Wallet Flow (6 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **AUTH-01** | Wallet Connect | 1. Navigate to app<br>2. Click "Connect Wallet"<br>3. Approve signature in MetaMask | Wallet connected, session cookie set, address displayed | ☐ | |
| **AUTH-02** | Wallet Disconnect | 1. Connect wallet<br>2. Click disconnect<br>3. Confirm | Wallet disconnected, page reloads, session cleared | ☐ | |
| **AUTH-03** | Session Persistence | 1. Connect wallet<br>2. Hard refresh (Cmd+Shift+R)<br>3. Check session | Session persists, wallet still connected | ☐ | |
| **AUTH-04** | Idle Timeout | 1. Connect wallet<br>2. Wait for timeout (or mock)<br>3. Check session | Session expires, user logged out | ☐ | |
| **AUTH-05** | Guest Mode | 1. Skip wallet connect<br>2. Start chat | Guest chat works (limited prompts, local only) | ☐ | |
| **AUTH-06** | Guest to Wallet Transition | 1. Start as guest<br>2. Connect wallet<br>3. Check chat continuity | Guest chat preserved, now encrypted | ☐ | |

**Section 1 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 2: DID (ID Token) Flow (5 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **DID-01** | Check DID Status | 1. Connect wallet<br>2. Go to /profile | Shows hasDid: true/false correctly | ☐ | |
| **DID-02** | Mint DID | 1. Connect wallet (no DID)<br>2. Click "Create ID Token"<br>3. Sign tx | DID minted, on-chain confirmation, no gas paid by user | ☐ | |
| **DID-03** | DID Persistence | 1. Mint DID<br>2. Hard refresh<br>3. Check /profile | DID still present | ☐ | |
| **DID-04** | DID Revocation | 1. Go to /profile<br>2. Click "Revoke DID"<br>3. Confirm | DID revoked, on-chain confirmation | ☐ | |
| **DID-05** | Revoked DID Restrictions | 1. Revoke DID<br>2. Try to mint again | Blocked from minting new DID | ☐ | |

**Section 2 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 3: Chat & AI Features (10 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **CHAT-01** | Send Message (Guest) | 1. As guest<br>2. Type message<br>3. Send | Message sent, AI replies | ☐ | |
| **CHAT-02** | Send Message (Wallet) | 1. Connect wallet<br>2. Type message<br>3. Send | Message sent, encrypted, AI replies | ☐ | |
| **CHAT-03** | Chat Persistence | 1. Send message<br>2. Hard refresh<br>3. Check chat | Messages persist after refresh | ☐ | |
| **CHAT-04** | Chat Decryption | 1. Send messages<br>2. Hard refresh<br>3. Verify decryption | All messages decrypt correctly | ☐ | |
| **CHAT-05** | Streaming Response | 1. Send message<br>2. Observe response | Tokens stream in real-time | ☐ | |
| **CHAT-06** | Crisis Detection | 1. Send message with crisis keywords<br>2. Observe response | Crisis modal appears with hotline | ☐ | |
| **CHAT-07** | Crisis False Positive | 1. Send benign message with trigger word<br>2. Observe | No crisis modal (correctly filtered) | ☐ | |
| **CHAT-08** | Guest Quota Limit | 1. As guest<br>2. Send 5 messages<br>3. Try 6th | 429 error, quota exceeded modal | ☐ | |
| **CHAT-09** | Chat Export | 1. Go to /profile<br>2. Export Chat | JSON file downloads | ☐ | |
| **CHAT-10** | Chat Deletion | 1. Go to /profile<br>2. Delete Chat<br>3. Confirm | Chat deleted, confirmation shown | ☐ | |

**Section 3 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 4: GDPR & Consent Features (7 tests) 🔴 CRITICAL

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **GDPR-01** | Cookie Banner Shows | 1. First visit (clear cookies)<br>2. Check banner appears | Banner visible, blocks interaction | ☐ | |
| **GDPR-02** | Health Data Consent Required | 1. Try to accept without health data checkbox | "Agree" button disabled | ☐ | |
| **GDPR-03** | Consent Recording | 1. Accept all<br>2. Check /api/consent/status | Consent recorded in database | ☐ | |
| **GDPR-04** | Consent Withdrawal | 1. Go to consent panel<br>2. Withdraw<br>3. Confirm | Consent withdrawn, access blocked | ☐ | |
| **GDPR-05** | Re-Consent Flow | 1. Withdraw<br>2. Try to chat<br>3. Re-consent | Access restored after re-consent | ☐ | |
| **GDPR-06** | Account Deletion | 1. Go to settings<br>2. Delete Account<br>3. Confirm | Account deleted, audit log created | ☐ | |
| **GDPR-07** | Deletion Verification | 1. Delete account<br>2. Check database | All user data removed (chats, consent, subscriptions) | ☐ | |

**Section 4 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 5: Subscription & Payment Flow (5 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **SUB-01** | View Subscription Plans | 1. Go to /subscribe | Plans displayed correctly (Free, Pro, Unlimited) | ☐ | |
| **SUB-02** | Wallet Payment Flow | 1. Select plan<br>2. Connect wallet<br>3. Pay | Payment processed, subscription active | ☐ | |
| **SUB-03** | Quota Enforcement | 1. Free tier<br>2. Exceed limit<br>3. Try to send | Upgrade prompt shown | ☐ | |
| **SUB-04** | Subscription Status | 1. Active subscription<br>2. Check /profile | Status shows "Active", expiry date | ☐ | |
| **SUB-05** | Payment History | 1. Go to /profile<br>2. Payment History | List of payments displayed | ☐ | |

**Section 5 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 6: Mobile-Specific Tests (safepsy-mobile) (4 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **MOB-01** | Wallet Connect (Mobile) | 1. Tap connect<br>2. Approve in wallet app | Wallet connected | ☐ | iOS/Android: ___ |
| **MOB-02** | Chat on Mobile | 1. Send message<br>2. Receive reply | Chat works on mobile | ☐ | iOS/Android: ___ |
| **MOB-03** | Crisis Modal (Mobile) | 1. Send crisis message | Modal appears with hotline | ☐ | iOS/Android: ___ |
| **MOB-04** | Sentry Error Tracking | 1. Trigger error<br>2. Check Sentry dashboard | Error captured with mobile context | ☐ | iOS/Android: ___ |

**Section 6 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 7: Error Handling & Edge Cases (5 tests)

| # | Test | Steps | Expected Result | Pass/Fail | Notes |
|---|------|-------|-----------------|-----------|-------|
| **ERR-01** | Network Error | 1. Disconnect internet<br>2. Send message | Error message shown, retry option | ☐ | |
| **ERR-02** | LLM Unavailable | 1. Mock LLM failure<br>2. Send message | Graceful error, no crash | ☐ | |
| **ERR-03** | Database Error | 1. Mock DB failure<br>2. Try to save chat | Error logged, user notified | ☐ | |
| **ERR-04** | Invalid Signature | 1. Modify signature<br>2. Try to verify | Rejection with clear error message | ☐ | |
| **ERR-05** | Rate Limit Exceeded | 1. Rapid requests<br>2. Check response | 429 with retry-after header | ☐ | |

**Section 7 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Section 8: Production Health Checks (5 tests)

| # | Test | Command | Expected Result | Pass/Fail | Notes |
|---|------|---------|-----------------|-----------|-------|
| **HLTH-01** | Healthz Endpoint | `curl https://polinapsycho.com/healthz` | 200 OK, body: "ok" | ☐ | |
| **HLTH-02** | Chat Health | `curl https://polinapsycho.com/api/chat/health` | 200 OK, routing: scaleway-direct | ☐ | |
| **HLTH-03** | LLM Connectivity | `CHECK_LLM=1 USE_SCALEWAY_DIRECT=1 ./deployment/verify-production.sh` | All checks pass | ☐ | |
| **HLTH-04** | Database Connection | SSH → `psql -c "SELECT 1"` | Connection successful | ☐ | |
| **HLTH-05** | Redis Connection | SSH → `redis-cli ping` | PONG | ☐ | |

**Section 8 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test Summary

### Overall Results

| Section | Tests | Passed | Failed | Blocked | Pass Rate |
|---------|-------|--------|--------|---------|-----------|
| 1. Authentication & Wallet | 6 | ___ | ___ | ___ | ___% |
| 2. DID (ID Token) | 5 | ___ | ___ | ___ | ___% |
| 3. Chat & AI Features | 10 | ___ | ___ | ___ | ___% |
| 4. GDPR & Consent | 7 | ___ | ___ | ___ | ___% |
| 5. Subscription & Payment | 5 | ___ | ___ | ___ | ___% |
| 6. Mobile-Specific | 4 | ___ | ___ | ___ | ___% |
| 7. Error Handling | 5 | ___ | ___ | ___ | ___% |
| 8. Production Health | 5 | ___ | ___ | ___ | ___% |
| **TOTAL** | **47** | ___ | ___ | ___ | ___% |

### Critical Tests (Must Pass for Beta Launch)

| Test ID | Description | Result |
|---------|-------------|--------|
| **GDPR-01** | Cookie banner shows on first visit | ☐ PASS ☐ FAIL |
| **GDPR-02** | Health data consent required | ☐ PASS ☐ FAIL |
| **GDPR-06** | Account deletion functional | ☐ PASS ☐ FAIL |
| **AUTH-01** | Wallet connect | ☐ PASS ☐ FAIL |
| **CHAT-02** | Send message (wallet) | ☐ PASS ☐ FAIL |
| **CHAT-06** | Crisis detection | ☐ PASS ☐ FAIL |

**Beta Launch Decision:**
- ☐ **APPROVED** — All critical tests pass, pass rate > 90%
- ☐ **CONDITIONAL** — Minor issues, can launch with fixes in progress
- ☐ **BLOCKED** — Critical failures, must fix before launch

---

## Issues Log

| ID | Issue | Section | Severity | Steps to Reproduce | Expected vs Actual | Status |
|----|-------|---------|----------|-------------------|-------------------|--------|
| 1 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | | | ☐ Open ☐ Fixed |
| 2 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | | | ☐ Open ☐ Fixed |
| 3 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | | | ☐ Open ☐ Fixed |
| 4 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | | | ☐ Open ☐ Fixed |
| 5 | | | ☐ Critical ☐ High ☐ Medium ☐ Low | | | ☐ Open ☐ Fixed |

**Severity Definitions:**
- **Critical:** Blocks beta launch, data loss, security vulnerability
- **High:** Major feature broken, workaround available
- **Medium:** Minor feature broken, cosmetic issue
- **Low:** Nice-to-have, typo, minor UX issue

---

## Recommendations

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

---

## Appendix A: Debug Commands

```bash
# Check API logs
docker-compose logs node-api | tail -50

# Check Redis keys
docker-compose exec redis redis-cli KEYS "quota:*"
docker-compose exec redis redis-cli KEYS "wallet-nonce:*"
docker-compose exec redis redis-cli KEYS "consent:*"

# Check database
docker-compose exec postgres psql -U safepsy_user -d safepsy_prod -c "SELECT * FROM encrypted_chats LIMIT 5;"
docker-compose exec postgres psql -U safepsy_user -d safepsy_prod -c "SELECT * FROM user_consents LIMIT 5;"
docker-compose exec postgres psql -U safepsy_user -d safepsy_prod -c "SELECT * FROM subscriptions LIMIT 5;"

# Check backend signer balance
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c","latest"],"id":1}'

# Verify DID contract
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x103eAd096f898132E138ad228E35296db983A053","data":"0x..."}],"id":1}'
```

---

## Appendix B: Sepolia Explorer URLs

- **DID Identity Token:** https://sepolia.etherscan.io/token/0x103eAd096f898132E138ad228E35296db983A053
- **DID Ownership:** https://sepolia.etherscan.io/address/0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
- **DID Registry:** https://sepolia.etherscan.io/address/0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
- **Backend Signer:** https://sepolia.etherscan.io/address/0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c

---

## Appendix C: Environment Variables Reference

```bash
# Web (.env)
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_API_URL=  # Empty = same-origin /api
VITE_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # For GA4
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# API (.env)
REDIS_URL=redis://redis:6379/0
DID_BACKEND_SIGNER_PRIVATE_KEY=0x...
DATABASE_URL=postgresql://...
JWT_SECRET=...
SCALEWAY_API_KEY=...
SCALEWAY_PROJECT_ID=...
```

---

## Appendix D: Test Execution Schedule

| Day | Date | Focus | Sections | Target |
|-----|------|-------|----------|--------|
| Day 1 | Aug 21 | Auth + Infrastructure | 1, 8 | 100% |
| Day 2 | Aug 22 | Chat + GDPR | 3, 4 | 100% |
| Day 2 | Aug 22 | DID + Subscriptions | 2, 5 | 100% |
| Day 3 | Aug 23 | Mobile + Errors | 6, 7 | 100% |
| Day 4 | Aug 24 | Re-test failures | All failed | 100% |
| Day 5 | Aug 25 | Final verification | Critical only | 100% |

---

**Test Completed:** _______________ (Date)  
**Tester Signature:** _______________  
**Next Review Date:** _______________