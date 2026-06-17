# Manual E2E Test Checklist — SafePsy MVP Activation Flow

**Test Date:** _______________  
**Tester:** _______________  
**Environment:** ☐ Local (localhost:9080) | ☐ Staging | ☐ Production (polinapsycho.com)  
**Wallet Address:** _______________  

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
cd /Users/thibauttenenbaum/Desktop/SP/SPiOSv2
./deployment/deploy-live-app.sh

# Local deploy (alternative)
npm run deploy:local
```

### 3. Verify Deployment

```bash
# Check API health
curl https://polinapsycho.com/api/healthz  # Should return: ok

# Check Redis connection
docker-compose exec redis redis-cli ping  # Should return: PONG

# Check containers running
docker-compose ps
```

---

## Test 1: First-Time User Activation Flow 🔴 CRITICAL

**Objective:** Verify a new user can complete the full activation (DID + first chat).

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1.1 | Open browser to `https://polinapsycho.com/beta/chat` | Page loads, chat widget visible | ☐ | |
| 1.2 | Click "Connect Wallet" | Wallet popup appears | ☐ | |
| 1.3 | Select Sepolia network, confirm connection | Wallet connects, address shown | ☐ | |
| 1.4 | Click "Verify" (SIWE) | MetaMask asks to sign message | ☐ | |
| 1.5 | Sign SIWE message | Success toast, wallet verified | ☐ | |
| 1.6 | DID prompt appears | Modal shows "Create Safe ID Token" | ☐ | |
| 1.7 | Click "Create Safe ID Token" | **No gas confirmation** (backend-sponsored) | ☐ | Key test! |
| 1.8 | Wait for transaction | Toast: "Safe ID Token created! Gas was sponsored" | ☐ | |
| 1.9 | Check console logs | `BACKEND-SPONSORED mint (backend pays gas)` | ☐ | F12 → Console |
| 1.10 | Send test message: "Hello, this is a test" | Message appears, AI responds | ☐ | |
| 1.11 | Wait for save | Toast: "Chat saved successfully" | ☐ | |
| 1.12 | Check console for DID update | `DID updated! Chat reference stored on-chain` | ☐ | |
| 1.13 | Open Sepolia explorer (link in console) | Transaction visible on-chain | ☐ | Paste tx hash |

**Test 1 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 2: Chat Save → Refresh → Load 🔴 CRITICAL

**Objective:** Verify encrypted chat persists and decrypts after page refresh.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 2.1 | From Test 1, note the test message | "Hello, this is a test" visible | ☐ | |
| 2.2 | Hard refresh (Cmd+Shift+R or Ctrl+Shift+R) | Page reloads, wallet disconnected | ☐ | |
| 2.3 | Click "Connect Wallet" (same wallet) | Wallet connects | ☐ | |
| 2.4 | Click "Verify" and sign SIWE | Wallet verified | ☐ | |
| 2.5 | Check console logs | `Successfully loaded key from localStorage` OR `from DID contract` | ☐ | |
| 2.6 | Check chat history | Previous message ("Hello, this is a test") appears | ☐ | |
| 2.7 | Verify decryption | Message content readable (not garbled) | ☐ | |

**Test 2 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 3: DID Profile Page

**Objective:** Verify users can view their DID profile.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 3.1 | Navigate to `https://polinapsycho.com/profile` | Page loads (no 404) | ☐ | |
| 3.2 | Connect wallet (if not already) | Wallet connects | ☐ | |
| 3.3 | View DID information | Token ID, contract address visible | ☐ | |
| 3.4 | Check on-chain data | Chat reference hash displayed | ☐ | |

**Test 3 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 4: Crisis Resource Banner

**Objective:** Verify crisis disclaimer appears in chat.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 4.1 | Connect wallet and verify (authenticated mode) | Chat widget visible | ☐ | |
| 4.2 | Look above chat input area | Amber banner visible | ☐ | |
| 4.3 | Check banner content | "Dr. Safe is not a crisis service" + findahelpline.com link | ☐ | |
| 4.4 | Click findahelpline.com link | Opens in new tab | ☐ | |

**Test 4 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 5: Quota Enforcement (Redis Required)

**Objective:** Verify 10 messages/day limit is enforced.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 5.1 | Send messages 1-10 | All succeed, AI responds | ☐ | |
| 5.2 | Send message 11 | **429 error**, paywall modal opens | ☐ | Key test! |
| 5.3 | Check error message | "Chat quota exceeded. Upgrade to Premium" | ☐ | |
| 5.4 | Check console/Redis | `quota:did:<tokenId>:daily` = 10 | ☐ | `docker-compose exec redis redis-cli KEYS "quota:*"` |

**Test 5 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 6: Logout Flow

**Objective:** Verify logout clears session properly.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 6.1 | Click wallet button → "Disconnect" | Logout confirmed | ☐ | |
| 6.2 | Check page state | "Connect Wallet" button visible | ☐ | |
| 6.3 | Refresh page | Still logged out (no auto-reconnect) | ☐ | |
| 6.4 | Reconnect wallet | No "1 hour inactivity" toast | ☐ | Key test! |

**Test 6 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 7: Wrong Wallet Recovery (Security)

**Objective:** Verify wrong wallet cannot access another user's chats.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 7.1 | Complete Test 1 with Wallet A | Chat saved | ☐ | |
| 7.2 | Logout | Session cleared | ☐ | |
| 7.3 | Connect Wallet B (different address) | Wallet connects | ☐ | |
| 7.4 | Verify wallet (SIWE) | Wallet verified | ☐ | |
| 7.5 | Check chat history | Empty (cannot access Wallet A's chats) | ☐ | |
| 7.6 | Check console | `Failed to decrypt... wrong wallet` (graceful) | ☐ | |

**Test 7 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 8: Backend-Sponsored DID Mint (Gas Check)

**Objective:** Verify user doesn't pay gas for DID creation.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 8.1 | Use wallet with **zero** Sepolia ETH | Wallet connected | ☐ | |
| 8.2 | Click "Create Safe ID Token" | Transaction succeeds | ☐ | Key test! |
| 8.3 | Check toast | "Gas was sponsored — no ETH needed" | ☐ | |
| 8.4 | Check console | `BACKEND-SPONSORED mint` | ☐ | |
| 8.5 | Verify backend signer balance decreased | ~0.001 ETH deducted | ☐ | Etherscan |

**Test 8 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 9: Key Rotation (Optional — Advanced)

**Objective:** Verify encryption key can be rotated.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 9.1 | Navigate to `/profile` | DID profile loads | ☐ | |
| 9.2 | Find "Rotate Encryption Key" option | Button visible | ☐ | |
| 9.3 | Click "Rotate Key" | New key generated | ☐ | |
| 9.4 | Check chat history | Still decrypts with new key | ☐ | |

**Test 9 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Test 10: Chat Export/Delete (Optional — Advanced)

**Objective:** Verify user can export and delete their data.

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 10.1 | Navigate to `/profile` | DID profile loads | ☐ | |
| 10.2 | Click "Export Chat" | JSON download starts | ☐ | |
| 10.3 | Open exported file | Encrypted JSON visible | ☐ | |
| 10.4 | Click "Delete Chat" | Confirmation dialog | ☐ | |
| 10.5 | Confirm delete | Chat removed from backend | ☐ | |
| 10.6 | Refresh page | Chat history empty | ☐ | |

**Test 10 Result:** ☐ PASS | ☐ FAIL  
**Issues Found:** _______________________________________________

---

## Summary

### Overall Results

| Test | Result | Critical? |
|------|--------|-----------|
| Test 1: First-Time User Activation | ☐ PASS ☐ FAIL | 🔴 YES |
| Test 2: Chat Save → Refresh → Load | ☐ PASS ☐ FAIL | 🔴 YES |
| Test 3: DID Profile Page | ☐ PASS ☐ FAIL | 🟡 NO |
| Test 4: Crisis Resource Banner | ☐ PASS ☐ FAIL | 🟡 NO |
| Test 5: Quota Enforcement | ☐ PASS ☐ FAIL | 🟡 NO (Redis required) |
| Test 6: Logout Flow | ☐ PASS ☐ FAIL | 🟡 NO |
| Test 7: Wrong Wallet Recovery | ☐ PASS ☐ FAIL | 🟡 NO |
| Test 8: Backend-Sponsored DID Mint | ☐ PASS ☐ FAIL | 🔴 YES |
| Test 9: Key Rotation | ☐ PASS ☐ FAIL ☐ N/A | 🟢 NO |
| Test 10: Chat Export/Delete | ☐ PASS ☐ FAIL ☐ N/A | 🟢 NO |

### Critical Tests Summary

**Tests 1, 2, 8 must pass for MVP launch.**

### Issues Log

| Issue | Severity | Steps to Reproduce | Expected vs Actual |
|-------|----------|-------------------|-------------------|
| | | | |
| | | | |
| | | | |

### Recommendations

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

# Check database
docker-compose exec postgres psql -U safepsy_user -d safepsy_dev -c "SELECT * FROM encrypted_chats LIMIT 5;"

# Check backend signer balance
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c","latest"],"id":1}'

# Verify DID contract
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0x103eAd096f898132E138ad228E35296db983A053","data":"0x..."}],"id":1}'
```

## Appendix B: Sepolia Explorer URLs

- **DID Identity Token:** https://sepolia.etherscan.io/token/0x103eAd096f898132E138ad228E35296db983A053
- **DID Ownership:** https://sepolia.etherscan.io/address/0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
- **DID Registry:** https://sepolia.etherscan.io/address/0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
- **Backend Signer:** https://sepolia.etherscan.io/address/0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c

## Appendix C: Environment Variables Reference

```bash
# Web (.env)
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_API_URL=  # Empty = same-origin /api

# API (.env)
REDIS_URL=redis://redis:6379/0
DID_BACKEND_SIGNER_PRIVATE_KEY=0x...
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

---

**Test Completed:** _______________ (Date)  
**Next Review Date:** _______________
