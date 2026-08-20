/**
 * Subscription Service (rewritten)
 *
 * Manages the subscription domain:
 * - Get/create subscription for a wallet
 * - Activate/extend subscriptions after payment verification
 * - Check expiration (dynamic, not cron-dependent)
 * - Resolve plan + quotas for a wallet
 *
 * All pricing, quotas, and durations come from subscription-config.ts.
 * The backend is the authoritative source; frontend values are never trusted.
 */

import { SubscriptionPlan, SubscriptionStatus, SubscriptionBillingPeriod } from '@prisma/client';
import logger from './logger';
import { prisma } from './prisma';
import * as config from './subscription-config';

// ─── Constants ───────────────────────────────────────────────────────────────

/** How often to sweep expired subscriptions in the DB (for index cleanliness; NOT authoritative). */
const EXPIRATION_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Normalise a wallet address to a consistent lowercase format for DB lookups.
 */
function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Compute the expiresAt date given a billing period.
 */
function computeExpiresAt(billingPeriod: config.BillingPeriod): Date {
  const now = new Date();
  const months = config.getSubscriptionDurationMonths(billingPeriod);
  return new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
}

/**
 * Determine whether a subscription is currently active (includes dynamic expiration check).
 */
function isSubscriptionActive(status: SubscriptionStatus, expiresAt: Date | null): boolean {
  if (status !== SubscriptionStatus.ACTIVE) return false;
  if (expiresAt && expiresAt <= new Date()) return false;
  return true;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve the current effective plan for a wallet address.
 * Returns FREE if no paid subscription is active.
 */
export async function resolvePlan(walletAddress: string): Promise<SubscriptionPlan> {
  const normalized = normalizeAddress(walletAddress);

  const subscription = await prisma.subscription.findUnique({
    where: { walletAddress: normalized },
  });

  if (!subscription) {
    return SubscriptionPlan.FREE;
  }

  if (isSubscriptionActive(subscription.status, subscription.expiresAt)) {
    return subscription.plan;
  }

  // Expired — fall back to FREE
  // Mark as expired in DB
  if (subscription.status === SubscriptionStatus.ACTIVE) {
    try {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    } catch {
      // Best effort; dynamic check below will catch it
    }
  }

  return SubscriptionPlan.FREE;
}

/**
 * Get the full subscription record for a wallet (or null if not found).
 * Returns null for non-existent subscriptions (caller creates if needed).
 */
export async function getSubscription(walletAddress: string) {
  return prisma.subscription.findUnique({
    where: { walletAddress: normalizeAddress(walletAddress) },
  });
}

/**
 * Get or create a FREE subscription for a wallet.
 */
export async function getOrCreateSubscription(walletAddress: string): Promise<{
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  startedAt: Date | null;
  cryptoPaymentTxHash: string | null;
}> {
  const normalized = normalizeAddress(walletAddress);

  let subscription = await prisma.subscription.findUnique({
    where: { walletAddress: normalized },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        walletAddress: normalized,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    logger.info(`Created FREE subscription for wallet ${normalized}`);
  }

  // Check if expired
  if (subscription.status === SubscriptionStatus.ACTIVE && subscription.expiresAt && subscription.expiresAt <= new Date()) {
    try {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
      subscription = { ...subscription, status: SubscriptionStatus.EXPIRED };
    } catch {
      // fall through
    }
  }

  return {
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    startedAt: subscription.startedAt,
    cryptoPaymentTxHash: subscription.cryptoPaymentTxHash,
  };
}

/**
 * Activate a subscription after payment verification.
 *
 * If an active subscription exists, it is extended.
 * Otherwise a new one is created.
 */
export async function activateSubscription(
  walletAddress: string,
  plan: SubscriptionPlan,
  billingPeriod: config.BillingPeriod,
  txHash: string,
  blockNumber?: number,
): Promise<{
  subscriptionId: string;
  isNew: boolean;
  expiresAt: Date;
}> {
  const normalized = normalizeAddress(walletAddress);
  const expiresAt = computeExpiresAt(billingPeriod);
  const prismaBillingPeriod = billingPeriod.toUpperCase() as SubscriptionBillingPeriod;

  let subscription = await prisma.subscription.findUnique({
    where: { walletAddress: normalized },
  });

  const isNew = !subscription;

  if (subscription) {
    // Extend existing subscription
    const currentExpires = subscription.expiresAt || new Date();
    const newExpires = currentExpires > new Date() ? currentExpires : new Date();

    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan,
        billingPeriod: prismaBillingPeriod,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt: newExpires,
        cryptoPaymentTxHash: txHash,
        cryptoBlockNumber: blockNumber ?? null,
      },
    });

    logger.info(`Extended subscription for ${normalized}: ${plan} (${billingPeriod}) until ${newExpires.toISOString()}`);
  } else {
    subscription = await prisma.subscription.create({
      data: {
        walletAddress: normalized,
        plan,
        billingPeriod: prismaBillingPeriod,
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date(),
        expiresAt,
        cryptoPaymentTxHash: txHash,
        cryptoBlockNumber: blockNumber ?? null,
      },
    });

    logger.info(`Activated new subscription for ${normalized}: ${plan} (${billingPeriod}) until ${expiresAt.toISOString()}`);
  }

  return {
    subscriptionId: subscription.id,
    isNew,
    expiresAt: subscription.expiresAt || expiresAt,
  };
}

/**
 * Get the current usage counts for a wallet.
 */
export async function getUsageCounts(walletAddress: string, now = new Date()) {
  const normalized = normalizeAddress(walletAddress);

  // Daily: today 00:00 UTC
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Weekly: Monday of current ISO week in UTC
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(todayStart.getUTCDate() + mondayOffset);
  // Monthly: first of current month in UTC
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [daily, weekly, monthly] = await Promise.all([
    prisma.promptUsage.count({
      where: {
        walletAddress: normalized,
        timestamp: { gte: todayStart },
      },
    }),
    prisma.promptUsage.count({
      where: {
        walletAddress: normalized,
        timestamp: { gte: weekStart },
      },
    }),
    prisma.promptUsage.count({
      where: {
        walletAddress: normalized,
        timestamp: { gte: monthStart },
      },
    }),
  ]);

  return { daily, weekly, monthly };
}

/**
 * Record a prompt usage atomically.
 * Idempotent: if the same requestId is recorded twice, it returns the existing row.
 */
export async function recordUsage(
  walletAddress: string,
  requestId: string,
  subscriptionId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ recorded: boolean; daily?: number; weekly?: number; monthly?: number }> {
  const normalized = normalizeAddress(walletAddress);

  try {
    await prisma.promptUsage.create({
      data: {
        walletAddress: normalized,
        requestId,
        subscriptionId: subscriptionId || undefined,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error: any) {
    // Duplicate requestId — idempotent, already recorded
    if (error.code === 'P2002') {
      return { recorded: false };
    }
    throw error;
  }

  // Return current usage counts
  const now = new Date();
  const counts = await getUsageCounts(walletAddress, now);
  return { recorded: true, daily: counts.daily, weekly: counts.weekly, monthly: counts.monthly };
}

/**
 * Check if a wallet has remaining quota for today, this week, and this month.
 */
export async function checkQuota(walletAddress: string): Promise<{
  allowed: boolean;
  daily: { used: number; limit: number };
  weekly: { used: number; limit: number };
  monthly: { used: number; limit: number };
  plan: SubscriptionPlan;
}> {
  const prismaPlan = await resolvePlan(walletAddress);
  const planId = prismaPlan.toLowerCase() as config.PlanId;
  const quotas = config.getQuotas(planId);
  const counts = await getUsageCounts(walletAddress);

  const dailyUsed = Math.min(counts.daily, quotas.daily);
  const weeklyUsed = Math.min(counts.weekly, quotas.weekly);
  const monthlyUsed = Math.min(counts.monthly, quotas.monthly);

  const allowed = counts.daily < quotas.daily && counts.weekly < quotas.weekly && counts.monthly < quotas.monthly;

  return {
    allowed,
    daily: { used: dailyUsed, limit: quotas.daily },
    weekly: { used: weeklyUsed, limit: quotas.weekly },
    monthly: { used: monthlyUsed, limit: quotas.monthly },
    plan: prismaPlan,
  };
}

/**
 * Sweep expired subscriptions (runs on a cron job or on-demand).
 * Not authoritative — dynamic expiration is checked in resolvePlan/getSubscription.
 */
export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const result = await prisma.subscription.updateMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { lt: now },
    },
    data: { status: SubscriptionStatus.EXPIRED },
  });
  if (result.count > 0) {
    logger.info(`Swept ${result.count} expired subscriptions`);
  }
  return result.count;
}

// ─── Backwards-compatible exports ────────────────────────────────────────────

/**
 * Alias for backwards compatibility with existing code that imports SubscriptionService.
 */
export class SubscriptionService {
  async getOrCreateSubscription(walletAddress: string) {
    return getOrCreateSubscription(walletAddress);
  }

  async getSubscription(walletAddress: string) {
    return getSubscription(walletAddress);
  }

  async isSubscriptionActive(walletAddress: string): Promise<boolean> {
    const sub = await getSubscription(walletAddress);
    if (!sub) return false;
    return isSubscriptionActive(sub.status, sub.expiresAt);
  }

  async resolvePlan(walletAddress: string) {
    return resolvePlan(walletAddress);
  }

  async updateSubscriptionTier(
    walletAddress: string,
    plan: SubscriptionPlan,
    billingPeriod: config.BillingPeriod,
    txHash: string,
    blockNumber?: number,
  ) {
    return activateSubscription(walletAddress, plan, billingPeriod, txHash, blockNumber);
  }

  async activateSubscription(
    walletAddress: string,
    plan: SubscriptionPlan,
    billingPeriod: config.BillingPeriod,
    txHash: string,
    blockNumber?: number,
  ) {
    return activateSubscription(walletAddress, plan, billingPeriod, txHash, blockNumber);
  }

  async cancelSubscription(walletAddress: string) {
    const sub = await getSubscription(walletAddress);
    if (!sub) throw new Error('Subscription not found');
    return prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  async getSubscriptionLimits(walletAddress: string) {
    const prismaPlan = await resolvePlan(walletAddress);
    const planId = prismaPlan.toLowerCase() as config.PlanId;
    const quotas = config.getQuotas(planId);
    return {
      dailyLimit: quotas.daily,
      weeklyLimit: quotas.weekly,
      monthlyLimit: quotas.monthly,
    };
  }

  async recordUsage(walletAddress: string, requestId: string, subscriptionId?: string, metadata?: Record<string, unknown>) {
    return recordUsage(walletAddress, requestId, subscriptionId, metadata);
  }

  async checkQuota(walletAddress: string) {
    return checkQuota(walletAddress);
  }

  async getUsageCounts(walletAddress: string) {
    return getUsageCounts(walletAddress);
  }
}

export const subscriptionService = new SubscriptionService();