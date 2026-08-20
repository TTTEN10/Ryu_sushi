/**
 * Centralized Subscription Plan Configuration
 *
 * Single source of truth for pricing, quotas, discounts, and plan metadata.
 * All frontend and backend code must consume this configuration rather than
 * hardcoding values.
 *
 * The backend is authoritative: prices and quotas can never be trusted from
 * the frontend.
 */

// ─── Plan identifiers ────────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro' | 'unlimited';
export type BillingPeriod = 'monthly' | 'yearly';

// ─── Raw pricing (USD cents) ─────────────────────────────────────────────────
// Integer representation to avoid floating-point issues.

const CENTS_PER_DOLLAR = 100;

const PRICE_MONTHLY: Record<Exclude<PlanId, 'free'>, number> = {
  pro: 19 * CENTS_PER_DOLLAR,        // $19.00
  unlimited: 79 * CENTS_PER_DOLLAR,  // $79.00
};

const DISCOUNT_PERCENTAGE: Record<Exclude<PlanId, 'free'>, number> = {
  pro: 10,
  unlimited: 25,
};

// ─── Quota definitions ───────────────────────────────────────────────────────

interface Quotas {
  daily: number;
  weekly: number;
  monthly: number;
}

const QUOTAS: Record<PlanId, Quotas> = {
  free: {
    daily: 10,
    weekly: 50,
    monthly: 100,
  },
  pro: {
    daily: 50,
    weekly: 250,
    monthly: 800,
  },
  unlimited: {
    daily: 350,
    weekly: 2_000,
    monthly: 8_000,
  },
};

// ─── Subsidy rates (USD cents per prompt, backend cost model) ────────────────
// Used internally for analytics/metrics; not exposed to users.

const SUBSIDY_RATE: Record<PlanId, number> = {
  free: 0,
  pro: 0.03 * CENTS_PER_DOLLAR,
  unlimited: 0.02 * CENTS_PER_DOLLAR,
};

// ─── Subscription duration ───────────────────────────────────────────────────

const SUBSCRIPTION_DURATION: Record<BillingPeriod, { months: number; days: number }> = {
  monthly: { months: 1, days: 0 },
  yearly: { months: 12, days: 0 },
};

// ─── Paywall defaults ────────────────────────────────────────────────────────

const DEFAULT_PAYWALL_PROMPT_THRESHOLD = 5; // prompts before paywall appears (UX only)

// ─── Computed helpers ────────────────────────────────────────────────────────

function computeYearlyPrice(planId: Exclude<PlanId, 'free'>): number {
  const monthly = PRICE_MONTHLY[planId];
  const annualRaw = monthly * 12;
  const discount = DISCOUNT_PERCENTAGE[planId];
  return Math.round(annualRaw * (1 - discount / 100));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: PlanId;
  name: string;
  marketingName: string;
  isFree: boolean;
  quotas: Quotas;
}

export interface PriceDefinition {
  planId: Exclude<PlanId, 'free'>;
  billingPeriod: BillingPeriod;
  amountCents: number;
  annualDiscountPercent: number;
  usdDisplay: string;
  monthlyEquivalentCents?: number;
}

export interface AllPlansResponse {
  plans: PlanDefinition[];
  prices: PriceDefinition[];
  paywallPromptThreshold: number;
}

/**
 * Get all plan definitions (metadata + quotas).
 */
export function getPlanDefinitions(): PlanDefinition[] {
  return (Object.keys(QUOTAS) as PlanId[]).map((id) => {
    const isFree = id === 'free';
    return {
      id,
      name: id === 'pro' ? 'SafeChat Pro' : id === 'unlimited' ? 'SafeChat Unlimited' : 'Free',
      marketingName: id === 'pro' ? 'SafeChat Pro' : id === 'unlimited' ? 'SafeChat Unlimited' : 'Free',
      isFree,
      quotas: QUOTAS[id],
    };
  });
}

/**
 * Get all price definitions for a specific plan and billing period.
 */
export function getAllPrices(): PriceDefinition[] {
  const prices: PriceDefinition[] = [];

  for (const planId of ['pro', 'unlimited'] as const) {
    // Monthly
    prices.push({
      planId,
      billingPeriod: 'monthly',
      amountCents: PRICE_MONTHLY[planId],
      annualDiscountPercent: DISCOUNT_PERCENTAGE[planId],
      usdDisplay: `$${(PRICE_MONTHLY[planId] / CENTS_PER_DOLLAR).toFixed(2)}`,
    });

    // Yearly
    const yearly = computeYearlyPrice(planId);
    prices.push({
      planId,
      billingPeriod: 'yearly',
      amountCents: yearly,
      annualDiscountPercent: DISCOUNT_PERCENTAGE[planId],
      usdDisplay: `$${(yearly / CENTS_PER_DOLLAR).toFixed(2)}`,
      monthlyEquivalentCents: Math.round(yearly / 12),
    });
  }

  return prices;
}

/**
 * Get the yearly price for a specific plan.
 */
export function getYearlyPrice(planId: Exclude<PlanId, 'free'>): number {
  return computeYearlyPrice(planId);
}

/**
 * Get the monthly price (USD cents) for a plan.
 */
export function getMonthlyPrice(planId: Exclude<PlanId, 'free'>): number {
  return PRICE_MONTHLY[planId];
}

/**
 * Get the quotas for a specific plan.
 */
export function getQuotas(planId: PlanId): Quotas {
  return QUOTAS[planId];
}

/**
 * Get the subscription duration in months for a billing period.
 */
export function getSubscriptionDurationMonths(billingPeriod: BillingPeriod): number {
  return SUBSCRIPTION_DURATION[billingPeriod].months;
}

/**
 * Get the annual discount percentage for a plan.
 */
export function getAnnualDiscountPercent(planId: Exclude<PlanId, 'free'>): number {
  return DISCOUNT_PERCENTAGE[planId];
}

/**
 * Get the full plans + prices response.
 */
export function getAllPlans(): AllPlansResponse {
  return {
    plans: getPlanDefinitions(),
    prices: getAllPrices(),
    paywallPromptThreshold: DEFAULT_PAYWALL_PROMPT_THRESHOLD,
  };
}

/**
 * Validate that a plan ID + billing period combination is valid.
 * Used by the backend before creating payment intents.
 */
export function isValidPlanPlanId(planId: string): planId is PlanId {
  return (['free', 'pro', 'unlimited'] as PlanId[]).includes(planId as PlanId);
}

/**
 * Validate that a billing period is valid.
 */
export function isValidBillingPeriod(billingPeriod: string): billingPeriod is BillingPeriod {
  return (['monthly', 'yearly'] as BillingPeriod[]).includes(billingPeriod as BillingPeriod);
}

/**
 * Get the expected price (in USD cents) for a plan + billing period.
 * The backend uses this — never the frontend — to determine the expected amount.
 */
export function getExpectedPriceCents(planId: Exclude<PlanId, 'free'>, billingPeriod: BillingPeriod): number {
  if (billingPeriod === 'monthly') {
    return PRICE_MONTHLY[planId];
  }
  return computeYearlyPrice(planId);
}

/**
 * Get the subsidy rate for a plan.
 */
export function getSubsidyRate(planId: PlanId): number {
  return SUBSIDY_RATE[planId];
}

/**
 * Get the paywall prompt threshold.
 */
export function getPaywallPromptThreshold(): number {
  return DEFAULT_PAYWALL_PROMPT_THRESHOLD;
}