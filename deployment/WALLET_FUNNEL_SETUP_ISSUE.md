# Wallet funnel: "Setup issue" after SIWE (production investigation)

**Date:** 2026-06-04  
**Last Updated:** 2026-06-04  
**Symptom:** Wallet connects and SIWE verify succeeds (green `0x…` badge), then header shows **Setup issue** (amber). Encrypted chat save/load after refresh does not work.

## Quick Fix (TL;DR)

The "Setup issue" badge appears when the backend is missing environment variables. To fix:

```bash
# On production server (or in .env before deploy):
export RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
export DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
export DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export JWT_SECRET="<32-char-random-string>"

# Redeploy:
cd /path/to/SP/SPiOSv2
DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-app.sh
```

**Verify fix:**
```bash
# Should return 401 (not 503) when not authenticated:
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://polinapsycho.com/api/did/check

# Check env vars in container:
ssh root@151.115.151.231 'cd /home/safepsy/app && docker compose exec node-api printenv | grep -E "RPC_URL|DID_|DATABASE"'
```

---

## Expected Flow (DID → chat → hard refresh → decrypt)

| Step | User Action | Request | Healthy Response |
|------|-------------|---------|------------------|
| 1 | Connect wallet | `POST /api/auth/wallet/connect` | 200 + SIWE message |
| 2 | Sign in wallet | (wallet `personal_sign`) | — |
| 3 | Verify signature | `POST /api/auth/wallet/verify` | 200 + `Set-Cookie: walletSession` |
| 4 | Session check | `GET /api/auth/me` | 200, `isVerified: true` |
| 5 | DID check | `POST /api/did/check` | 200, `{ hasDid: true/false }` — **not** 503/500 |
| 6 | Create DID (if none) | Click "Unlock chat save" → `POST /api/did/create` | 200 + mint tx on Sepolia |
| 7 | Send chat | `POST /api/chat/completions` → `POST /api/chat/save` | 200 + `blobHash` |
| 8 | DID update | Frontend: `updateChatReference()` on-chain | Tx confirmed |
| 9 | Hard refresh | `GET /api/chat/load` | 200 + `encryptedChatBlob` |
| 10 | Decrypt | Frontend: read `encryptedKeyMetadata` from DID → decrypt | Messages appear |

**Observed on prod (pre-fix):** Steps 1-4 OK; **step 5 (`POST /api/did/check`) → 503**; **step 9 (`GET /api/chat/load`) → 500** (Prisma: `DATABASE_URL` missing).

## Root Cause

The **node-api** container on `151.115.151.231` was missing critical environment variables:

### Missing Variables (Backend)

| Variable | Purpose | UI Symptom if Missing |
|----------|---------|----------------------|
| `RPC_URL` or `ETH_RPC_URL` | Sepolia RPC for DID contract reads | `/did/check` → 503; "Setup issue" |
| `DID_REGISTRY_ADDRESS` | DID registry contract (verification) | `/did/check` → 503 |
| `DID_IDENTITY_TOKEN_ADDRESS` | Identity token with `updateChatReference()` | Chat reference not linked on-chain |
| `DATABASE_URL` | PostgreSQL for encrypted chat blobs | `/chat/save`, `/chat/load` → 500 |
| `JWT_SECRET` | Session cookie signing | SIWE verify fails; no session |

### Missing Variables (Frontend Build)

| Variable | Purpose | UI Symptom if Missing |
|----------|---------|----------------------|
| `VITE_DID_IDENTITY_TOKEN_ADDRESS` | On-chain contract address for `updateChatReference()` | DID update fails; chat not linked |
| `VITE_RPC_URL` | Browser-side RPC for contract reads | On-chain reads may timeout |

## Fix (Deploy Instructions)

### 1. Set Backend Environment Variables

On the deploy host (or in `.env` before running `deploy-app.sh`):

```bash
# Required: Session JWT (generate strong random value)
JWT_SECRET="<generate-32-char-random-string>"

# Required: Sepolia RPC (public or Alchemy/Infura)
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Required: DID Contracts (Sepolia)
DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053

# Required: Database (PostgreSQL)
DATABASE_URL="postgresql://safepsy_user:safepsy_password@postgres:5432/safepsy"
```

### 2. Set Frontend Build Variables

In `.env` (read by `deploy-app.sh`):

```bash
# Frontend build (baked into SPA bundle)
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_WALLETCONNECT_PROJECT_ID=<your_walletconnect_project_id>
```

### 3. Deploy with All Variables

```bash
cd /path/to/SP/SPiOSv2

# Ensure .env has all required variables (see above)
# Then deploy:
DEPLOY_FRESH_CONTAINERS=1 ./deployment/deploy-app.sh
```

The deploy script (`deploy-app.sh`) automatically passes these to the node-api container (lines 126-130, 497-501).

### 4. Post-Deploy Verification

```bash
# 1. DID route (should return 401 without cookie, NOT 503)
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://polinapsycho.com/api/did/check
# Expected: 401 (unauthorized without session cookie)

# 2. Check node-api env vars
ssh root@151.115.151.231 'cd /home/safepsy/app && docker compose exec node-api printenv | grep -E "RPC_URL|DID_|DATABASE"'
# Expected: All variables present

# 3. Check DID service initialized
ssh root@151.115.151.231 'cd /home/safepsy/app && docker compose logs node-api --tail=50 | grep -i "DID"'
# Expected: "DID service initialized" — not "DID service not configured"

# 4. Test chat save (authenticated, with session cookie)
# This requires a valid wallet session cookie from SIWE

# 5. Test chat load (hard refresh simulation)
# After saving a chat, hard refresh and verify messages decrypt
```

## Manual Funnel Test (After Redeploy)

1. **Connect wallet** → Click "Connect" → MetaMask/WalletConnect approves
2. **Authorize (SIWE)** → Click "Verify" / "Authorize" → Sign message → Badge shows `0x...` (green)
3. **Check DID status** → Header shows:
   - **"Unlock chat save"** = `hasDid: false` (click to mint)
   - **"Chat saved"** = `hasDid: true` ✓
   - **NOT "Setup issue"** (amber) ← this was the bug
4. **Create DID** (if "Unlock chat save" shown):
   - Click button → Mint on Sepolia (requires Sepolia ETH for gas)
   - Wait for tx confirmation
   - Badge updates to "Chat saved"
5. **Send chat** → Network tab: `POST /api/chat/save` → 200 OK
6. **DID update** → Network tab: wallet tx `updateChatReference` → Confirmed
7. **Hard refresh** (Cmd+Shift+R / Ctrl+Shift+F5)
8. **Verify decrypt** → `GET /api/chat/load` → 200 + messages appear decrypted

## If Issues Remain

| Check | Action |
|-------|--------|
| `POST /api/did/check` still 503 | Confirm node-api env: `docker compose exec node-api printenv \| grep -E 'RPC\|DID_'` |
| RPC rate limits / timeouts | Use Alchemy/Infura Sepolia URL in `RPC_URL` |
| `hasDid: false` after mint | Fund wallet with Sepolia ETH for gas; check tx on Sepolia Etherscan |
| Chat 500 after fix | `docker compose exec node-api npx prisma db push --schema=schema.prisma` |
| Frontend build missing DID address | Rebuild with `VITE_DID_IDENTITY_TOKEN_ADDRESS` set; verify in browser DevTools → `window` globals or bundle |
| JWT on prod still dev placeholder | Rotate `JWT_SECRET` in `.env` and redeploy |

## Files Updated

- `apps/web/env.example` — Uncommented and documented `VITE_DID_IDENTITY_TOKEN_ADDRESS`, `VITE_RPC_URL`
- `apps/api/.env.example` — Added comments explaining impact of missing `RPC_URL`, `DATABASE_URL`, `DID_*` vars
- `deployment/deploy-app.sh` — Already passes all required vars to node-api (lines 126-130, 497-501)

## Wallet session inactivity (1 hour)

Verified wallet sessions disconnect after **1 hour without user activity** (mouse, keyboard, scroll, touch, click). The app clears the httpOnly session, disconnects the wallet extension, and prompts the user to reconnect and sign in again to resume encrypted chat.

Implementation: `apps/web/src/lib/wallet-inactivity.ts`, `apps/web/src/hooks/useWalletInactivityTimeout.ts`, wired in `AuthContext`.

## Related Documentation

- `documentation/public documentation/DID_COMPLETE_GUIDE.md` — Full DID setup guide
- `documentation/public documentation/ENCRYPTION_COMPLETE_GUIDE.md` — Encryption flow
- `documentation/chatbot-migration.md` — LLM routing (Scaleway vs vLLM)
- `apps/api/src/lib/did.service.ts` — DID service implementation
- `apps/web/src/hooks/useChatEncryption.ts` — Frontend encryption hook
