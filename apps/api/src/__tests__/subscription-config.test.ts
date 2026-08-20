import { describe, it, expect } from "vitest";
import {
  getMonthlyPrice,
  getYearlyPrice,
  getAnnualDiscountPercent,
  getQuotas,
  getSubscriptionDurationMonths,
  getExpectedPriceCents,
  getAllPlans,
  getAllPrices,
  getPlanDefinitions,
  isValidPlanPlanId,
  isValidBillingPeriod,
  getSubsidyRate,
} from "../lib/subscription-config";

describe("Subscription Config — Pricing", () => {
  it("Pro monthly price is $19.00 (1900 cents)", () => {
    expect(getMonthlyPrice("pro")).toBe(1900);
  });

  it("Unlimited monthly price is $79.00 (7900 cents)", () => {
    expect(getMonthlyPrice("unlimited")).toBe(7900);
  });

  it("Pro yearly price is $205.20 (20520 cents)", () => {
    expect(getYearlyPrice("pro")).toBe(20520);
  });

  it("Unlimited yearly price is $711.00 (71100 cents)", () => {
    expect(getYearlyPrice("unlimited")).toBe(71100);
  });

  it("Pro yearly discount is 10%", () => {
    expect(getAnnualDiscountPercent("pro")).toBe(10);
  });

  it("Unlimited yearly discount is 25%", () => {
    expect(getAnnualDiscountPercent("unlimited")).toBe(25);
  });

  it("getExpectedPriceCents returns correct monthly price", () => {
    expect(getExpectedPriceCents("pro", "monthly")).toBe(1900);
    expect(getExpectedPriceCents("unlimited", "monthly")).toBe(7900);
  });

  it("getExpectedPriceCents returns correct yearly price with discount", () => {
    expect(getExpectedPriceCents("pro", "yearly")).toBe(20520);
    expect(getExpectedPriceCents("unlimited", "yearly")).toBe(71100);
  });

  it("getExpectedPriceCents returns undefined for free plan at runtime", () => {
    const result = getExpectedPriceCents("free" as any, "monthly");
    expect(result).toBeUndefined();
  });
});

describe("Subscription Config — Quotas", () => {
  it("Free plan quotas", () => {
    const q = getQuotas("free");
    expect(q.daily).toBe(10);
    expect(q.weekly).toBe(50);
    expect(q.monthly).toBe(100);
  });

  it("Pro plan quotas", () => {
    const q = getQuotas("pro");
    expect(q.daily).toBe(50);
    expect(q.weekly).toBe(250);
    expect(q.monthly).toBe(800);
  });

  it("Unlimited plan quotas (hard limits, not actually unlimited)", () => {
    const q = getQuotas("unlimited");
    expect(q.daily).toBe(350);
    expect(q.weekly).toBe(2000);
    expect(q.monthly).toBe(8000);
  });
});

describe("Subscription Config — Duration", () => {
  it("Monthly subscription lasts 1 month", () => {
    expect(getSubscriptionDurationMonths("monthly")).toBe(1);
  });

  it("Yearly subscription lasts 12 months", () => {
    expect(getSubscriptionDurationMonths("yearly")).toBe(12);
  });
});

describe("Subscription Config — Plan Definitions", () => {
  it("getAllPlans returns 3 plans and 4 price definitions", () => {
    const plans = getAllPlans();
    expect(plans.plans).toHaveLength(3);
    expect(plans.prices).toHaveLength(4);
  });

  it("getAllPlans contains free, pro, and unlimited", () => {
    const plans = getAllPlans();
    const ids = plans.plans.map((p) => p.id);
    expect(ids).toContain("free");
    expect(ids).toContain("pro");
    expect(ids).toContain("unlimited");
  });

  it("getAllPrices returns 4 price definitions", () => {
    const prices = getAllPrices();
    expect(prices).toHaveLength(4);
  });

  it("getPlanDefinitions returns 3 plan definitions", () => {
    const defs = getPlanDefinitions();
    expect(defs).toHaveLength(3);
  });
});

describe("Subscription Config — Validation", () => {
  it("isValidPlanPlanId accepts valid plan IDs", () => {
    expect(isValidPlanPlanId("free")).toBe(true);
    expect(isValidPlanPlanId("pro")).toBe(true);
    expect(isValidPlanPlanId("unlimited")).toBe(true);
  });

  it("isValidPlanPlanId rejects invalid plan IDs", () => {
    expect(isValidPlanPlanId("premium")).toBe(false);
    expect(isValidPlanPlanId("")).toBe(false);
    expect(isValidPlanPlanId("PRO")).toBe(false);
  });

  it("isValidBillingPeriod accepts valid periods", () => {
    expect(isValidBillingPeriod("monthly")).toBe(true);
    expect(isValidBillingPeriod("yearly")).toBe(true);
  });

  it("isValidBillingPeriod rejects invalid periods", () => {
    expect(isValidBillingPeriod("weekly")).toBe(false);
    expect(isValidBillingPeriod("")).toBe(false);
  });
});

describe("Subscription Config — Subsidy", () => {
  it("getSubsidyRate returns expected subsidy for each plan", () => {
    expect(getSubsidyRate("free")).toBeTypeOf("number");
    expect(getSubsidyRate("pro")).toBeTypeOf("number");
    expect(getSubsidyRate("unlimited")).toBeTypeOf("number");
  });
});