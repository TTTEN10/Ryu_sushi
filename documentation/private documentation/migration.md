# SafePsy Migration Guide

**Date:** August 26, 2026  
**Status:** Pre-migration playbook — execute in order  
**Estimated total time:** 4-6 hours (including verification)

---

## Overview

This guide covers three migration waves:

| Wave | What | Affected Systems |
|------|------|-----------------|
| **Wave 1** | Alpha → Beta URL — redirect `polinapsycho.com/beta/chat` → `app.polinapsycho.com/beta` | Caddy configs, frontend links, SIWE domain, docs |
| **Wave 2** | Sepolia → Mainnet — DID contracts, RPC, chain ID | Backend env, frontend env, contract scripts, docs |
| **Wave 3** | Payment contracts on mainnet + feature parity | Smart contracts, treasury, verification |

Each wave has pre-checks, execution steps, and verification. Do not proceed to the next wave until the previous wave's verification passes.

---

## Pre-flight Checklist (Before Starting)

- [ ] SSH access to both servers:
  - Main host: `root@151.115.151.231`
  - App host: `root@51.159.159.150` (app.polinapsycho.com)
- [ ] `.env` file backed up on both servers
- [ ] Git working tree clean, `main` branch up to date
- [ ] DID backend signer key available (`DID_BACKEND_SIGNER_PRIVATE_KEY`)
- [ ] Treasury wallet funded with ETH for mainnet gas
- [ ] Ethplorer/Etherscan API keys available for contract verification
- [ ] Domain DNS managed (both `polinapsycho.com` and `app.polinapsycho.com`)

---

# Wave 1: Alpha → Beta URL Migration

## Goal

Consolidate the app subdomain (`app.polinapsycho.com/beta`) as the single entry point for the chat SPA, while keeping `polinapsycho.com` as the landing/marketing domain.

## Current State

| URL | Purpose | Server |
|-----|---------|--------|
| `polinapsycho.com/beta` | Landing + SPA (same origin) | 151.115.151.231 |
| `app.polinapsycho.com/beta` | SPA only (separate server) | 51.159.165.150 |
| `www.polinapsycho.com` | Alias of polinapsycho.com | 151.115.151.231 |

## Steps

### Step 1.1 — Configure Caddy on Main Host for Landing Page

Update `deploy-app.sh` on the main host (151.115.151.231) to ensure `polinapsycho.com` serves only the landing/marketing pages (no SPA `/beta` path):

```bash
# On main host
ssh -i ~/.ssh/id_ed25519 root@151.115.151.231
cd /home/safepsy/app
nano Caddyfile
```

Ensure the Caddyfile has:

```
polinapsycho.com, www.polinapsycho.com {
    # Landing page (React build)
    root * /var/www/html
    file_server
    
    # SPA fallback — serve index.html for non-API paths
    @notApi not path /api/*
    rewrite @notApi /beta/index.html

    # API proxy to backend
    reverse_proxy /api/* localhost:3001

    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
    }
}
```

### Step 1.2 — Configure App Subdomain (SPA + API)

On the app host (51.159.165.150), ensure `app.polinapsycho.com` serves the SPA with `/beta` prefix stripping:

```bash
# On app host
ssh -i ~/.ssh/id_ed25519 root@51.159.165.150
cd /home/safepsy/app
nano Caddyfile
```

```
app.polinapsycho.com {
    handle_path /beta/* {
        root * /var/www/html/beta
        file_server
    }
    handle /beta {
        root * /var/www/html/beta
        file_server
    }
    handle /api/* {
        reverse_proxy localhost:3001
    }
    handle /* {
        redir /beta {uri}
    }
    
    encode gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}
```

### Step 1.3 — Add Redirect from Old URL

On the main host, add a redirect so that anyone visiting `polinapsycho.com/beta/chat` is redirected to `app.polinapsycho.com/beta`:

Update the main Caddyfile to include:

```
www.polinapsycho.com {
    redir https://polinapsycho.com{uri}
}
```

### Step 1.4 — Update SIWE Domain

Update `.env` on the main host:

```bash
# Set SIWE domain to production
SIWE_DOMAIN=polinapsycho.com
# Or for app subdomain:
# SIWE_DOMAIN=app.polinapsycho.com
```

This affects SIWE message signing. Users connecting wallets will see `polinapsycho.com` (or `app.polinapsycho.com`) in the wallet signature popup.

### Step 1.5 — Update Frontend Links

Search and update all hardcoded references to `polinapsycho.com/beta` in the codebase where appropriate:

```bash
grep -r "polinapsycho.com/beta" apps/web/src/
grep -r "app.polinapsycho.com" apps/web/src/
```

Update any links, meta tags, or social previews to point to `app.polinapsycho.com/beta` as the primary app URL.

### Step 1.6 — Verify Wave 1

```bash
# Test landing page
curl -fsS https://polinapsycho.com/ | head -20

# Test SPA loads
curl -fsS https://polinapsycho.com/beta | head -5

# Test app subdomain
curl -fsS https://app.polinapsycho.com/beta | head -5

# Test API works on both
curl -fsS https://polinapsycho.com/api/healthz
curl -fsS https://app.polinapsycho.com/beta/api/healthz
```

**Expected:** Landing page on `polinapsycho.com`, SPA accessible on both, API responds on both.

---

# Wave 2: Sepolia → Ethereum Mainnet

## Goal

Migrate all blockchain interactions (DID minting, DID verification, gas sponsorship, payment processing) from Sepolia testnet to Ethereum mainnet.

## Current State

| Setting | Current (Sepolia) | Target (Mainnet) |
|---------|-------------------|------------------|
| Chain ID | `11155111` | `1` |
| RPC URL | `https://ethereum-sepolia-rpc.publicnode.com` | `https://ethereum-rpc.publicnode.com` |
| DID Registry | `0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5` | *(new deployment)* |
| DID Ownership | `0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722` | *(new deployment)* |
| DID Metadata | `0x27965EE779822819729a662717eAC7360Eb7FCDF` | *(new deployment)* |
| DID Service | `0x2E9058F31127C994f01099406ff3C85d87063627` | *(new deployment)* |
| Timelock | `0xdD26Ade2e6432FE8356CedA5607C0b548fa5397B` | *(new deployment)* |
| Legacy Identity Token | `0x103eAd096f898132E138ad228E35296db983A053` | *(new deployment)* |
| Gas cost per tx | ~$0.01-0.05 | ~$2-10 |
| Confirmations | 12 | 12 (configurable) |

## Prerequisites

### 2.P1 — Deploy DID Contracts to Mainnet

Use the existing Hardhat scripts:

```bash
cd apps/api/src/contracts

# 1. Set up .env for deployment
cp ../../.env .env
# Add: ETH_RPC_URL=https://ethereum-rpc.publicnode.com
# Add: PRIVATE_KEY=YOUR_MAINNET_SIGNER_KEY
# Add: ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# 2. Compile
npx hardhat compile

# 3. Deploy core contracts (in order)
# DIDOwnershipV2 first (circular dependency — deployed with 0x0)
npx hardhat run scripts/deploy-upgradeable.ts --network ethereum

# 4. Deploy DIDRegistryV2 (references ownership)
npx hardhat run scripts/deploy-idempotent.ts --network ethereum

# 5. Deploy upgradeable implementations
npx hardhat run scripts/deploy-timelock.ts --network ethereum

# 6. Setup governance
npx hardhat run scripts/setup-governance.ts --network ethereum

# 7. Execute migration batch (wires Metadata/Service to new Registry)
npx hardhat run scripts/migrate-to-new-registry.ts --network ethereum

# 8. Smoke test
npx hardhat run scripts/smoke-check.ts --network ethereum
```

### 2.P2 — Record Mainnet Contract Addresses

After successful deployment, record the addresses:

| Contract | Mainnet Address |
|----------|----------------|
| DIDOwnershipV2 | *(fill after deploy)* |
| DIDRegistryV2 | *(fill after deploy)* |
| DIDMetadata (proxy) | *(fill after deploy)* |
| DIDService (proxy) | *(fill after deploy)* |
| GovernanceTimelock | *(fill after deploy)* |
| DIDIdentityTokenV2 | *(fill after deploy)* |

### 2.P3 — Fund the Backend Signer

The backend signer (`DID_BACKEND_SIGNER_PRIVATE_KEY`) needs ETH on mainnet for gas-sponsored DID minting.

```bash
# Transfer ~1-2 ETH from your treasury wallet to the signer address
# Signer address (derived from DID_BACKEND_SIGNER_PRIVATE_KEY):
# Check: cast address --private-key $DID_BACKEND_SIGNER_PRIVATE_KEY
```

### Step 2.1 — Update Backend Environment (`.env` on both servers)

On **main host** (151.115.151.231):

```bash
ssh -i ~/.ssh/id_ed25519 root@151.115.151.231
cd /home/safepsy/app
nano .env
```

Replace:

```env
# OLD (Sepolia)
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
DID_OWNERSHIP_ADDRESS=0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053

# NEW (Mainnet)
RPC_URL=https://ethereum-rpc.publicnode.com
ETH_RPC_URL=https://ethereum-rpc.publicnode.com
DID_REGISTRY_ADDRESS=0x<NEW_MAINNET_REGISTRY>
DID_OWNERSHIP_ADDRESS=0x<NEW_MAINNET_OWNERSHIP>
DID_IDENTITY_TOKEN_ADDRESS=0x<NEW_MAINNET_IDENTITY_TOKEN>
```

On **app host** (51.159.165.150):

```bash
ssh -i ~/.ssh/id_ed25519 root@51.159.165.150
cd /home/safepsy/app
# Same .env changes as above
```

### Step 2.2 — Update Frontend Environment

Update `apps/web/.env.example`:

```env
# OLD
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053

# NEW
VITE_RPC_URL=https://ethereum-rpc.publicnode.com
VITE_DID_IDENTITY_TOKEN_ADDRESS=0x<NEW_MAINNET_IDENTITY_TOKEN>
```

### Step 2.3 — Update Contract Scripts (Mainnet Configuration)

In `apps/api/src/contracts/hardhat.config.ts`, ensure the `ethereum` network is configured:

```typescript
networks: {
  ethereum: {
    url: process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 1,
    gas: 'auto',
    gasPrice: 'auto',
    timeout: 120000, // 2 min timeout for mainnet
  },
  sepolia: {
    // Keep for reference/testing
  }
}
```

### Step 2.4 — Update Timelock Delay

Change from 1-hour testing delay to 72-hour production delay:

In `setup-governance.ts`, set `minDelay = 259200` (72 hours) instead of `3600` (1 hour).

### Step 2.5 — Update All Sepolia References in Code

```bash
# Search for remaining Sepolia references
grep -r "sepolia" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.sh" .
```

Key replacements needed:

| File | Replace | With |
|------|---------|------|
| `apps/api/src/lib/constants.ts` | `SUPPORTED_NETWORK_NAME = 'Sepolia Testnet'` | `'Ethereum Mainnet'` |
| `apps/api/src/lib/constants.ts` | `SUPPORTED_CHAIN_ID = 11155111` | `1` |
| `apps/api/src/lib/crypto-payment.service.ts` | `sepolia.etherscan.io` | `etherscan.io` |
| `apps/web/components/SubscriptionTerminal.tsx` | `sepolia.etherscan.io` | `etherscan.io` |
| `apps/web/components/PaymentHistory.tsx` | `sepolia.etherscan.io` | `etherscan.io` |
| `apps/web/components/ConnectWallet.tsx` | `sepolia.etherscan.io` | `etherscan.io` |
| `apps/web/components/SubscriptionStatus.tsx` | `sepolia.etherscan.io` | `etherscan.io` |
| `deployment/deploy-app.sh` | `ethereum-sepolia-rpc.publicnode.com` | `ethereum-rpc.publicnode.com` |
| `deployment/deploy-local-app.sh` | `ethereum-sepolia-rpc.publicnode.com` | `ethereum-rpc.publicnode.com` |

### Step 2.6 — Update Documentation

Update `documentation/public documentation/api/contracts/SEPOLIA_DEPLOYED_CONTRACTS.md`:
- Add a "Mainnet Migration" section with new addresses
- Or create `MAINNET_DEPLOYED_CONTRACTS.md`

Update `documentation/private documentation/programming_sprint.md`:
- Update the Migration Planning table to mark Sepolia→Mainnet as complete
- Update contract addresses

Update all `*.md` files that reference Sepolia chain ID `11155111` — add a note about mainnet.

### Step 2.7 — Deploy and Verify Wave 2

```bash
# Deploy from repo root
git add -A && git commit -m "feat: migrate DID contracts and RPC to Ethereum mainnet" && git push

# Deploy to both servers
ssh -i ~/.ssh/id_ed25519 root@151.115.151.231 "cd /home/safepsy/app && git pull && ./deploy-app.sh"
ssh -i ~/.ssh/id_ed25519 root@51.159.165.150 "cd /home/safepsy/app && git pull && ./deploy-app.sh"
```

**Verification:**

```bash
# Test DID creation on mainnet
curl -fsS -X POST https://app.polinapsycho.com/beta/api/did/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT>" \
  -d '{"chatReference": "test"}'

# Check backend logs
ssh root@151.115.151.231 "cd /home/safepsy/app && docker compose logs -f backend --tail=50"

# Verify on Etherscan
# Check that the DIDRegistry contract exists and is verified
```

**Expected:** DID minting succeeds on mainnet, backend logs show successful contract interaction, Etherscan shows the transaction.

---

# Wave 3: Payment Contracts on Mainnet

## Goal

Deploy and wire up crypto payment smart contracts (already migrated in code, but need contract deployment verification).

## Current State

Payment system is already code-migrated to mainnet:
- `PAYMENT_TREASURY_ADDRESS=0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c` (in `.env`)
- `PAYMENT_CHAIN_ID=1` (in `.env`)
- `PAYMENT_RPC_URL=https://ethereum-rpc.publicnode.com` (in `.env`)
- ETH and USDT (ERC-20) payments with 1% fee
- USDT contract: `0xdAC17F958D2ee523a2206206994597C13D831ec7` (already on mainnet)

## Steps

### Step 3.1 — Verify Payment Env on Servers

```bash
# On both servers
ssh root@151.115.151.231 "grep PAYMENT_ /home/safepsy/app/.env"
ssh root@51.159.165.150 "grep PAYMENT_ /home/safepsy/app/.env"
```

All `PAYMENT_*` vars should be present and match the values in repo `.env`.

### Step 3.2 — Verify Backend Payment Service

```bash
# Check the payment service is configured
ssh root@151.115.151.231 "docker exec backend sh -c 'node -e \"const s=require(\\\"./dist/lib/crypto-payment.service\\\"); console.log(s.isConfigured())\"'"
```

### Step 3.3 — Test Payment Flow End-to-End

1. Navigate to `app.polinapsycho.com/beta`
2. Connect wallet
3. Select a plan ($20 Premium)
4. Choose ETH or USDT
5. Execute a small test transaction (1-5 USDT or 0.001 ETH)
6. Verify the backend confirms the transaction

### Step 3.4 — Verify Treasury Receipt

Check the treasury wallet on Etherscan:
- https://etherscan.io/address/0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c

---

# Post-Migration Cleanup

## After All Waves Pass Verification

### Clean Up Sepolia Artifacts

```bash
# Review but DO NOT delete immediately — keep for rollback reference:
# apps/api/src/contracts/scripts/fix-sepolia-ownership.ts
# apps/api/src/contracts/scripts/deploy.ts (basic deploy, superseded)
```

### Update DNS Records (if applicable)

If you had a CNAME or A record for a subdomain pointing to the old beta URL:

```bash
# Check current DNS
dig polinapsycho.com A
dig app.polinapsycho.com A
```

### Update Public Documentation

Add production URL sections to all guides that reference localhost:

```markdown
## Production URLs

| Resource | URL |
|----------|-----|
| Landing | https://polinapsycho.com |
| App (SPA) | https://app.polinapsycho.com/beta |
| API | https://app.polinapsycho.com/beta/api |
| Etherscan | https://etherscan.io |
```

---

## Rollback Plan

If any wave fails, rollback procedure:

### Wave 1 Rollback
- Revert Caddy config changes
- Revert `.env` SIWE_DOMAIN changes
- The SPA on `polinapsycho.com/beta` continues to work

### Wave 2 Rollback
- Revert `.env` changes on both servers:
  ```bash
  # Switch back to Sepolia
  RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
  DID_REGISTRY_ADDRESS=0x8e5F41f2B8B3E28a8966e37181B257f9E2725bA5
  DID_OWNERSHIP_ADDRESS=0xac5Ad1482d73d0E09ED3960C02EebF428Ad63722
  DID_IDENTITY_TOKEN_ADDRESS=0x103eAd096f898132E138ad228E35296db983A053
  ```
- Redeploy both servers
- DID minting reverts to Sepolia

### Wave 3 Rollback
- Revert payment env vars to Sepolia values
- Switch CoinGecko oracle to Sepolia ETH price
- Keep USDT on Sepolia (if testing on Sepolia USDT contract)

---

## Monitoring After Migration

| Metric | Tool | Frequency |
|--------|------|-----------|
| Backend errors (RPC, contract) | `docker compose logs -f backend` | Real-time |
| Frontend errors (Sentry) | Sentry dashboard | Real-time |
| DID minting success rate | Database query: `SELECT count(*) FROM Did WHERE chainId = 1` | Daily |
| Payment verification success | `SELECT * FROM Payment ORDER BY createdAt DESC` | Daily |
| CoinGecko API health | Backend logs for oracle errors | Daily |
| Gas costs per DID mint | Etherscan + database | Weekly |

---

## Estimated Costs (Mainnet)

| Item | Estimated Cost |
|------|----------------|
| DID Registry deploy | ~$200-500 |
| DID Ownership deploy | ~$100-200 |
| DID Metadata deploy | ~$100-200 |
| DID Service deploy | ~$100-200 |
| Governance Timelock deploy | ~$100-200 |
| Migration batch execution | ~$200-500 |
| Contract verification (x6) | ~$50-100 |
| **Total one-time deployment** | **~$750-1,700** |
| Per-DID-mint (gas) | ~$2-10 |
| Per-payment-verify (gas) | ~$0 (server-side, no tx needed) |

---

## Quick Reference: All Environment Variables

### Backend (`.env` — both servers)

| Variable | Value (Mainnet) |
|----------|-----------------|
| `RPC_URL` | `https://ethereum-rpc.publicnode.com` |
| `ETH_RPC_URL` | `https://ethereum-rpc.publicnode.com` |
| `DID_REGISTRY_ADDRESS` | *(new mainnet address)* |
| `DID_OWNERSHIP_ADDRESS` | *(new mainnet address)* |
| `DID_IDENTITY_TOKEN_ADDRESS` | *(new mainnet address)* |
| `PAYMENT_TREASURY_ADDRESS` | `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c` |
| `PAYMENT_CHAIN_ID` | `1` |
| `PAYMENT_RPC_URL` | `https://ethereum-rpc.publicnode.com` |
| `PAYMENT_TOKEN_ADDRESS` | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| `PAYMENT_FEE_PERCENT` | `1` |
| `PAYMENT_CONFIRMATIONS_REQUIRED` | `12` |
| `SIWE_DOMAIN` | `polinapsycho.com` or `app.polinapsycho.com` |

### Frontend (`apps/web/.env.example`)

| Variable | Value (Mainnet) |
|----------|-----------------|
| `VITE_RPC_URL` | `https://ethereum-rpc.publicnode.com` |
| `VITE_DID_IDENTITY_TOKEN_ADDRESS` | *(new mainnet address)* |
| `VITE_CHAIN_ID` | `1` |

---

*This guide was created as a comprehensive migration reference. All steps are ordered sequentially with verification gates before proceeding to the next wave.*