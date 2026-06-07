# End-to-End Test: DID-Based Chat Save & Retrieve

**Test Date:** 2026-06-05
**Test Environment:** Production (polinapsycho.com)
**Test Wallet:** 0x4D32FFBA2A7e090a10789fc094572f61E956f809

---

## Test Objective

Verify the complete flow of:
1. User connects wallet → verifies → creates DID (backend-sponsored)
2. Encryption key generated → stored in localStorage AND on-chain DID metadata
3. Chat message sent → encrypted → saved to backend
4. DID contract updated with chat reference hash + encrypted key metadata
5. Page refresh → key recovered → chat history loaded and decrypted
6. Multiple chats → all retrievable by same user

---

## Prerequisites

### Environment Variables (Backend)
```bash
# Required for DID creation
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
DID_BACKEND_SIGNER_PRIVATE_KEY=0x...  # Backend signer wallet (for gas sponsorship)

# Required for quotas
REDIS_URL=redis://...  # Redis instance

# Required for database
DATABASE_URL="postgresql://..."
JWT_SECRET="..."

# Network
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

### Environment Variables (Frontend)
```bash
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_WALLETCONNECT_PROJECT_ID=...
```

---

## Test Cases

### Test 1: First-Time User Flow (No Existing DID)

**Steps:**
1. Open https://polinapsycho.com/beta/chat
2. Clear browser data (Cmd+Shift+R, clear localStorage)
3. Connect wallet (MetaMask)
4. Click "Verify" → sign SIWE message
5. DID prompt appears
6. Click "Create Safe ID Token"
7. Approve transaction (backend-sponsored, user doesn't pay gas)
8. Wait for success toast
9. Send a chat message: "Hello Dr. Safe, this is a test"
10. Wait for response and save
11. Check console logs
12. Hard refresh page (Cmd+Shift+R)
13. Reconnect wallet
14. Verify wallet
15. Check if chat history loads and decrypts

**Expected Results:**
- ✅ Step 7: No MetaMask gas confirmation (backend pays)
- ✅ Step 8: Toast: "Safe ID Token created! Gas was sponsored — no ETH needed."
- ✅ Step 9-10: Chat saved successfully
- ✅ Step 11: Console shows:
  ```
  DID created for 0x...: token ID 123, tx 0x..., sponsored=true
  Encrypted key stored in localStorage: {localStorageKey: 'encryptedKey_0x...', ...}
  New key persisted to DID contract
  Chat saved successfully: {blobHash: '0x...', requiresDidUpdate: true}
  DID updated! Chat reference stored on-chain
  ```
- ✅ Step 15: Chat history loads and decrypts successfully

**Actual Results:**
_[Fill in during test]_

---

### Test 2: Key Recovery from localStorage (No DID)

**Steps:**
1. Connect wallet but SKIP DID creation (if possible)
2. Send a chat message
3. Check console: key saved to localStorage
4. Hard refresh page
5. Reconnect wallet
6. Check console: key recovered from localStorage
7. Check if previous chat decrypts

**Expected Results:**
- ✅ Step 3: `Encrypted key stored in localStorage`
- ✅ Step 6: `Found encrypted key in localStorage... Successfully loaded key from localStorage`
- ✅ Step 7: Previous chat decrypts successfully

**Note:** Current implementation forces DID creation (non-dismissible modal), so this test may not be possible without code modification.

**Actual Results:**
_[Fill in during test]_

---

### Test 3: Key Recovery from On-Chain DID Metadata

**Steps:**
1. User with existing DID connects wallet
2. Verify wallet
3. Check console: key loaded from DID contract
4. Send a chat message
5. Hard refresh page
6. Reconnect and verify
7. Check console: key loaded from DID contract again
8. Check if chat decrypts

**Expected Results:**
- ✅ Step 3: `Successfully loaded key from DID contract`
- ✅ Step 7: Same message
- ✅ Step 8: Chat decrypts successfully

**Actual Results:**
_[Fill in during test]_

---

### Test 4: Multiple Chats Retrieval

**Steps:**
1. User with DID sends 5 chat messages (separate conversations)
2. After each message, verify save success
3. Hard refresh page
4. Reconnect and verify
5. Load chat history
6. Verify all 5 messages are present and decrypt correctly

**Expected Results:**
- ✅ Step 2: Each save returns `requiresDidUpdate: true`
- ✅ Step 5: Chat history loads with all messages
- ✅ Step 6: All messages decrypt correctly

**Actual Results:**
_[Fill in during test]_

---

### Test 5: Wrong Wallet Recovery (Key Mismatch)

**Steps:**
1. User A creates DID and sends chat
2. Logout
3. Connect User B wallet (different address)
4. Verify wallet
5. Try to load chat history

**Expected Results:**
- ✅ Step 5: Decryption fails gracefully
- ✅ Console: `Failed to decrypt localStorage key (wrong wallet?)`
- ✅ User B sees empty chat (can't access User A's chats)

**Actual Results:**
_[Fill in during test]_

---

### Test 6: Corrupted Chat Cleanup

**Steps:**
1. Manually corrupt localStorage key (remove colons)
2. Refresh page
3. Connect and verify
4. Check console: key validation fails
5. New key generated
6. Old corrupted chat deleted from backend

**Expected Results:**
- ✅ Step 4: `Stored key has invalid format (missing colons), clearing and regenerating`
- ✅ Step 5: New key generated and saved
- ✅ Step 6: `Chat decryption failed - clearing corrupted chat from backend`

**Actual Results:**
_[Fill in during test]_

---

### Test 7: DID Update After Chat Save

**Steps:**
1. Send chat message
2. Check backend response: `requiresDidUpdate: true`
3. Check if `updateChatReference` is called
4. Verify transaction on Etherscan
5. Check on-chain data matches

**Expected Results:**
- ✅ Step 2: Backend returns `requiresDidUpdate: true`
- ✅ Step 3: `updateChatReference` called with:
  - `chatReference`: blob hash
  - `encryptedKeyMetadata`: wallet-wrapped key
- ✅ Step 4: Transaction visible on Etherscan (Sepolia)
- ✅ Step 5: On-chain data matches

**Actual Results:**
_[Fill in during test]_

---

### Test 8: Quota Enforcement (Redis)

**Steps:**
1. User sends 10 messages (free tier daily limit)
2. On 11th message, check for quota error
3. Paywall should appear
4. Check Redis counter incremented

**Expected Results:**
- ✅ Step 2: 429 response: `QUOTA_EXCEEDED`
- ✅ Step 3: Paywall modal opens
- ✅ Step 4: Redis key `quota:did:<tokenId>:daily` = 10

**Actual Results:**
_[Fill in during test]_

---

### Test 9: Logout and Session Clear

**Steps:**
1. User logged in with DID
2. Click logout/disconnect
3. Check console: logout successful
4. Refresh page
5. Check if user is logged out (no session cookie)
6. Reconnect wallet
7. Check if "1 hour inactivity" toast does NOT appear

**Expected Results:**
- ✅ Step 3: `User logged out successfully`
- ✅ Step 5: No session cookie, auth state cleared
- ✅ Step 7: No inactivity toast (manual logout)

**Actual Results:**
_[Fill in during test]_

---

### Test 10: Backend-Sponsored DID Mint (Gas Check)

**Steps:**
1. Connect wallet (no Sepolia ETH)
2. Verify wallet
3. Click "Create Safe ID Token"
4. Check if transaction goes through WITHOUT user gas
5. Check backend signer wallet balance decreased

**Expected Results:**
- ✅ Step 4: DID created successfully (user didn't pay gas)
- ✅ Step 5: Backend signer balance: -0.001-0.01 Sepolia ETH
- ✅ Console: `BACKEND-SPONSORED mint (backend pays gas)`

**Actual Results:**
_[Fill in during test]_

---

## Success Criteria

**All tests pass if:**
- [ ] Test 1: First-time user can create DID and save/retrieve chat ✅
- [ ] Test 2: localStorage key recovery works ✅
- [ ] Test 3: On-chain DID key recovery works ✅
- [ ] Test 4: Multiple chats all retrievable ✅
- [ ] Test 5: Wrong wallet can't access another user's chats ✅
- [ ] Test 6: Corrupted chats cleaned up gracefully ✅
- [ ] Test 7: DID contract updated correctly after save ✅
- [ ] Test 8: Quotas enforced via Redis ✅
- [ ] Test 9: Logout clears session properly ✅
- [ ] Test 10: Backend-sponsored DID mint works (no user gas) ✅

---

## Debugging Checklist

### If Chat Doesn't Save:
- [ ] Check backend logs for `/api/chat/save` errors
- [ ] Verify `DATABASE_URL` is set
- [ ] Check Prisma connection: `npx prisma studio`
- [ ] Verify JWT_SECRET is set (session auth)

### If Chat Doesn't Load:
- [ ] Check console: `Chat load response: {hasChat: true/false, ...}`
- [ ] Check console: `Failed to decrypt chat history: OperationError`
- [ ] Verify localStorage key format: `signature:iv:ciphertext` (2+ colons)
- [ ] Check if DID contract has `encryptedKeyMetadata`

### If DID Creation Fails:
- [ ] Check backend logs: `DID create error: ...`
- [ ] Verify `DID_IDENTITY_TOKEN_ADDRESS` is set
- [ ] Verify `DID_BACKEND_SIGNER_PRIVATE_KEY` is set
- [ ] Check backend signer wallet has Sepolia ETH
- [ ] Verify RPC_URL is working

### If Quotas Not Enforced:
- [ ] Check Redis connection: `redis-cli -u $REDIS_URL ping`
- [ ] Check Redis keys: `KEYS quota:*`
- [ ] Verify `REDIS_URL` is set in backend
- [ ] Check quota middleware is applied to `/api/chat/completions`

---

## Test Results Summary

**Test Date:** 2026-06-07  
**Backend Signer Wallet:** `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`  
**Backend Signer Balance:** 0.801 ETH (~800 DID mints possible)

| Test # | Status | Notes |
|--------|--------|-------|
| 1 | ⏳ Pending Manual | Backend configured ✅ Requires browser testing |
| 2 | ⏳ Pending Manual | Backend configured ✅ Requires browser testing |
| 3 | ⏳ Skipped | Redis not configured (`REDIS_URL` not set) |
| 4 | ⏳ Pending Manual | Requires Test 1 to pass first |
| 5 | ⏳ Pending Manual | Requires Test 1 to pass first |
| 6 | ⏳ Pending Manual | Code implemented, needs verification |
| 7 | ⏳ Pending Manual | Requires Test 1 to pass first |
| 8 | ⏳ Skipped | Redis not configured (`REDIS_URL` not set) |
| 9 | ⏳ Pending Manual | Code implemented, needs verification |
| 10 | ⏳ Pending Manual | Backend configured ✅ Requires browser testing |

**Overall Status:** 🟡 **Backend Ready, Awaiting Manual Browser Testing**

### Configuration Verification (2026-06-07 13:57 UTC)

```bash
# Environment Variables Set ✅
DID_BACKEND_SIGNER_PRIVATE_KEY=0x48d3642d9eb0552f3331dcc213b324a22e724adc6d5d87dec38c018816711261
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DATABASE_URL=postgresql://...
JWT_SECRET=local-dev-jwt-secret-do-not-use-in-production-32chars

# Backend Signer Wallet ✅
Address: 0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c
Balance: 0.801298977349924307 ETH
Estimated DID Mints: ~801

# API Server ✅
Status: Running on port 3001
Health Check: PASS
DID Endpoint: Responding (requires auth)
```

### Manual Testing Required

To complete tests 1, 2, 4, 5, 6, 7, 9, 10:

1. Open browser to `http://localhost:3000` or production URL
2. Connect wallet (MetaMask or WalletConnect)
3. Follow test steps above
4. Fill in actual results in each test section
5. Report any bugs or unexpected behavior

### Redis Configuration (Optional for Tests 3, 8)

To enable quota enforcement testing:

```bash
# Add to .env
REDIS_URL=redis://localhost:6379/0

# Or use Docker
docker run -d -p 6379:6379 --name safepsy-redis redis:alpine

# Or use Upstash (free tier)
# https://upstash.com/docs/redis/overall/getstarted
```

---

## Next Steps

After all tests pass:
1. Document any bugs found
2. Fix critical issues (P0)
3. Re-test failed scenarios
4. Update UX documentation if flows changed
5. Consider adding automated E2E tests (Playwright)
