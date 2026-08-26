# Payment System — Error Log & Fixes

## Table of Contents

- [ERR-001: payment_intents table missing](#err-001-payment_intents-table-missing)
- [ERR-002: Unsafe enum casts](#err-002-unsafe-enum-casts)
- [ERR-003: Dead code bloating the bundle](#err-003-dead-code-bloating-the-bundle)

---

## ERR-001: `payment_intents` table missing

### Symptoms

```
Payment Failed

Invalid `prisma.paymentIntent.findFirst()` invocation:
The table `public.payment_intents` does not exist in the current database.
```

HTTP 500 on any API route that queries payment data (`/api/payment`, `/api/subscribe`).

### Root Cause

The production deploy script (`deployment/deploy-app.sh`) had been **overwritten** so that it used:

```bash
prisma migrate reset --force
```

instead of:

```bash
prisma db push --schema=schema.prisma --skip-generate --accept-data-loss
```

This was destructive and wrong for three reasons:

1. **No migration history** — the project intentionally uses `prisma db push` (schema push), not `migrate`. There is no `migrations/` directory in Docker, so `migrate reset` fails or silently skips creating the payment tables.
2. **No `--accept-data-loss` flag** — even if `migrate reset` worked, it would refuse on production data.
3. **No retry, no error output, no verification** — the overwritten script swallowed errors with `2>/dev/null`, had no retry loop, and never checked whether `payment_intents`, `payments`, or `prompt_usage` tables were actually created.

### Fix Applied

**`deployment/deploy-app.sh`** (lines 811–872) — restored robust db push logic:

- **PostgreSQL readiness check** — waits up to 60s for the `postgres` container to report `healthy` before attempting schema sync.
- **`prisma db push` with retry** — loops up to 30 times, sleeping 2s between attempts, with per-attempt logging (`Attempt N/30...`).
- **Captures full error output** — removed `2>/dev/null`; errors are logged on failure.
- **Table verification** — after a successful push, checks that `payment_intents`, `payments`, and `prompt_usage` all exist in `information_schema.tables`.
- **Enum verification** — confirms `SubscriptionPlan` enum has `FREE`, `PRO`, `UNLIMITED`.
- **`exit 1` on any failure** — aborts the deployment rather than continuing with a broken database state.

**`deployment/deploy-local-app.sh`** (line 302) — added `--accept-data-loss` flag to the existing `prisma db push` command.

### Verification

After deploying, confirm tables exist:

```bash
ssh root@151.115.151.231 "docker exec postgres psql -U safepsy_user -d safepsy -c '\dt *payment*'"
ssh root@151.115.151.231 "docker exec postgres psql -U safepsy_user -d safepsy -c '\dt *prompt_usage*'"
```

Expected output: tables `payment_intents`, `payments`, `prompt_usage` listed.

### Prevention

- **Never use `prisma migrate reset`** in this project. The project intentionally has no migration history. Always use `prisma db push`.
- The deploy script now **verifies** tables exist before completing. If they don't, deployment aborts.
- **No `2>/dev/null` on prisma commands** — errors must be visible.

---

## ERR-002: Unsafe enum casts

### Symptoms

TypeScript errors or runtime mismatches when mapping between:
- Frontend config (lowercase: `free`, `pro`, `unlimited`)
- Prisma schema (uppercase enum: `FREE`, `PRO`, `UNLIMITED`)
- Database storage (uppercase enum: `FREE`, `PRO`, `UNLIMITED`)

### Root Cause

Code used **unsafe casts** to bridge the naming gap:

```typescript
// UNSAFE — TypeScript allows this but the values don't match at runtime
planId: planId as any  // 'free' | 'pro' | 'unlimited' → 'FREE' | 'PRO' | 'UNLIMITED'
```

TypeScript's `as any` / `as 'FREE'` casts bypass type safety. If the mapping is wrong, the enum value in the database is garbage and subsequent lookups fail.

### Fix Applied

**6 locations fixed across 5 files:**

| File | Line | Fix |
|------|------|-----|
| `apps/api/src/lib/subscription.service.ts` | 416 | Added `planIdFromPrisma()` helper; replaced `as any` cast |
| `apps/api/src/lib/quota.service.ts` | 241 | Replaced `as any` cast with `planIdFromPrisma()` |
| `apps/api/src/routes/subscription.ts` | 73, 134 | Replaced `as 'PRO'` / `as 'UNLIMITED'` with `planIdFromPrisma()` |
| `apps/api/src/routes/chat.ts` | 550 | Replaced `as any` cast with `planIdFromPrisma()` |
| `apps/web/src/hooks/useSubscription.ts` | 96 | Fixed `selectedCurrency` type from `'ETH'` → `'USDC'` |

**`planIdFromPrisma()`** function (subscription.service.ts):

```typescript
function planIdFromPrisma(planId: string): 'FREE' | 'PRO' | 'UNLIMITED' {
  const map: Record<string, 'FREE' | 'PRO' | 'UNLIMITED'> = {
    free: 'FREE',
    pro: 'PRO',
    unlimited: 'UNLIMITED',
    FREE: 'FREE',
    PRO: 'PRO',
    UNLIMITED: 'UNLIMITED',
  };
  return map[planId] ?? 'FREE';
}
```

### Prevention

- **Never cast enum values with `as any` or `as 'UPPERCASE'`** — always use an explicit mapping function.
- **`apps/api/src/lib/crypto-payment.service.ts`** already had `PLAN_MAP` and `BILLING_PERIOD_MAP` bidirectional maps from a prior session.

---

## ERR-003: Dead code bloating the bundle

### Symptoms

Unnecessary code shipped to production: dead files that increase bundle size, confuse new developers, and create maintenance burden.

### Dead Code Found

| File | Lines | Description | Status |
|------|-------|-------------|--------|
| `apps/web/src/components/Payment.tsx` | ~450 | Old PREMIUM/ETH payment UI component | Never imported anywhere |
| `apps/api/src/lib/price-oracle.service.ts` | ~200 | ETH native token pricing service | Never imported anywhere |

### Fix Applied

Both files **deleted**. The payment system uses USDC + USDT only — ETH native payments were removed in a prior redesign.

### Prevention

- Run `grep -r "Payment" apps/web/src/` before adding new payment components to check for naming collisions.
- Use bundler analysis (`npm run build:web` + `vite analyze`) periodically to detect dead code.

---

## Summary of All Fixes

| Error | Fix | File(s) | Status |
|-------|-----|---------|--------|
| ERR-001: `payment_intents` table missing | Restored `prisma db push` with retry, verification, error handling | `deploy-app.sh`, `deploy-local-app.sh` | Deployed |
| ERR-002: Unsafe enum casts | Added `planIdFromPrisma()` helper, replaced 7 unsafe casts | `subscription.service.ts`, `quota.service.ts`, `subscription.ts`, `chat.ts`, `useSubscription.ts` | Committed |
| ERR-003: Dead code | Deleted unused Payment.tsx and PriceOracleService | `Payment.tsx`, `price-oracle.service.ts` | Committed |