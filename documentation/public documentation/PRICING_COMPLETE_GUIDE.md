# Pricing Model & Implementation Guide

For the **$PSY token** (revised LLM-first tokenomics), tier roles, and **planned** token cashback, see [TOKENOMICS.md](TOKENOMICS.md).

## Pricing model overview

SafePsy uses a **three-tier** pricing structure:

| Tier | Model | Price (monthly) | Price (yearly) | Quotas |
|------|--------|-----------------|----------------|--------|
| **Free** | Freemium | $0 | — | 10/day, 50/week, 100/month |
| **Pro** | Paid | $19/mo | $168/yr ($14/mo) | 50/day, 250/week, 800/month |
| **Unlimited** | Paid | $69/mo | $588/yr ($49/mo) | 350/day, 2000/week, 8000/month |

All plans include a **30% annual discount** when billed yearly.

**Plan IDs** (internal): `free`, `pro`, `unlimited`. **DB enum** values: `FREE`, `PRO`, `UNLIMITED`.

---

## Current implementation

**Payment methods**: **USDC** and **USDT** (ERC-20) on Ethereum mainnet, plus **Stripe** (credit card) for fiat.

ETH native payments were removed (see [PAYMENT_ERRORS.md](../PAYMENT_ERRORS.md) in the repo root).

### Configuration

Central source of truth: `apps/api/src/lib/subscription-config.ts`

```typescript
// Plan IDs
type PlanId = 'free' | 'pro' | 'unlimited';

// Monthly prices (USD cents)
const PRICE_MONTHLY = { pro: 1900, unlimited: 6900 };

// Yearly prices (USD cents)
const PRICE_YEARLY = { pro: 16800, unlimited: 58800 };
```

### Payment flow

1. **Stripe** (primary): Standard checkout → webhook confirms subscription → activates plan.
2. **Crypto (USDC/USDT)**: User selects plan + currency → backend creates payment intent → user sends ERC-20 tokens to the recipient contract → backend verifies transaction → activates plan. A 1% platform fee is added to the crypto amount (configurable via `PAYMENT_FEE_PERCENT`).

Legacy crypto route (`/api/payment/crypto`) is **deprecated** and returns 410 Gone.

### Plan names

| Internal ID | Display name | DB enum |
|-------------|-------------|---------|
| `free` | Free | `FREE` |
| `pro` | Pro | `PRO` |
| `unlimited` | Unlimited | `UNLIMITED` |

### Payment recipient

USDC (ERC-20, 6 decimals): `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
USDT (ERC-20, 6 decimals): `0xdAC17F958D2ee523a2206206994597C13D831ec7`

---

## Quotas

| Plan | Daily | Weekly | Monthly |
|------|-------|--------|---------|
| Free | 10 | 50 | 100 |
| Pro | 50 | 250 | 800 |
| Unlimited | 350 | 2,000 | 8,000 |

Quotas are enforced in `apps/api/src/lib/subscription.service.ts`.

---

## API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscription/plans` | GET | Return all plans + prices + paywall threshold |
| `/api/subscription/create` | POST | Create a payment intent (Stripe or crypto) |
| `/api/subscription/verify` | POST | Verify payment completion |
| `/api/subscription/cancel` | POST | Cancel current subscription |

---

## Environment variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Crypto payment
CRYPTO_PAYMENT_CONTRACT_ADDRESS=0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c
PAYMENT_FEE_PERCENT=1  # 1% platform fee on crypto payments

# Wallet auth (Sepolia)
SUPPORTED_CHAIN_ID=11155111
```

---

## Dependencies and implementation status

### Implemented

| Area | Status |
|------|--------|
| **3-tier plans** (free/pro/unlimited) | ✅ Implemented in `subscription-config.ts` |
| **Monthly + yearly pricing** | ✅ Implemented with 30% annual discount |
| **Quotas** | ✅ Enforced per plan in `subscription.service.ts` |
| **Stripe payments** | ✅ Implemented (checkout + webhook) |
| **Crypto payments (USDC/USDT)** | ✅ Implemented with 1% fee |
| **Subscription duration** | ✅ 1 month (monthly) / 12 months (yearly) |

### Not implemented (planned)

| Area | Status |
|------|--------|
| **$PSY token payments** | Planned — 10% discount when paying with $PSY (see [TOKENOMICS.md](TOKENOMICS.md)) |
| **Gold tier cashback** | Planned — 10% $PSY cashback on Unlimited plan |
| **Staking rewards** | Planned — 3% of Treasury distributed to stakers |
| **Buyback + burn** | Planned — 5% of platform revenue used to buy and burn $PSY |
| **Airdrop program** | Planned — Proof-of-Mental-Health scoring |
| **ICO phases** | Planned — public sale after 20k users + $100k MRR |

---

## Files

| File | Description |
|------|-------------|
| `apps/api/src/lib/subscription-config.ts` | Central config: prices, quotas, discounts, plan metadata |
| `apps/api/src/lib/subscription.service.ts` | Subscription logic: limits, verification, DB enum mapping |
| `apps/api/src/routes/subscription.ts` | Subscription API routes |
| `apps/api/src/lib/crypto-payment.service.ts` | Crypto payment creation + verification (USDC/USDT) |
| `apps/web/src/components/SubscriptionTerminal.tsx` | Frontend subscription UI |
| `apps/web/src/components/PlanBadge.tsx` | Plan badge display in header |
| `apps/web/src/hooks/useSubscription.ts` | Frontend subscription hook |
| `apps/api/schema.prisma` | `SubscriptionPlan` enum: FREE, PRO, UNLIMITED |

---

## Related documentation

- [TOKENOMICS.md](TOKENOMICS.md) — $PSY token design, staking, cashback, planned features
- [PAYMENT_ERRORS.md](../PAYMENT_ERRORS.md) — ETH native payment removal history
- [DID_COMPLETE_GUIDE.md](DID_COMPLETE_GUIDE.md) — DID integration with subscription