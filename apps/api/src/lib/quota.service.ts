/**
 * Quota Service (rewritten)
 *
 * Manages prompt quotas per wallet using Redis.
 *
 * Three independent quota windows (UTC-based):
 * - Daily: 00:00 UTC to 23:59 UTC
 * - Weekly: Monday 00:00 UTC to Sunday 23:59 UTC (ISO calendar)
 * - Monthly: 1st of month 00:00 UTC to last day 23:59 UTC
 *
 * Concurrency-safe: uses Redis atomic INCR with per-window locks.
 * Falls back gracefully when Redis is unavailable.
 *
 * Quota limits come from subscription-config.ts (backend authoritative).
 */

import Redis from 'ioredis';
import logger from './logger';
import { prisma } from './prisma';
import { getSharedRedis } from './redis-shared';
import * as config from './subscription-config';
import { resolvePlan, getUsageCounts } from './subscription.service';
import { isUnrestrictedWallet } from './unrestricted-wallets';

// ─── Configuration ───────────────────────────────────────────────────────────

interface QuotaConfig {
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  redisDb?: number;
}

/** Concurrency lock TTL in seconds (5 minutes, longer than any request). */
const LOCK_TTL_SECONDS = 300;

// ─── Quota status ────────────────────────────────────────────────────────────

export interface QuotaStatus {
  walletAddress: string;
  plan: string;
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  monthlyRemaining: number;
  canUse: boolean;
  resetDailyAt: string;
  resetWeeklyAt: string;
  resetMonthlyAt: string;
}

// ─── Redis key helpers ───────────────────────────────────────────────────────

/** Get Redis key for daily quota. */
function getDailyKey(walletAddress: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `quota:chat:${walletAddress}:daily:${today}`;
}

/** Get Redis key for weekly quota (ISO calendar week in UTC). */
function getWeeklyKey(walletAddress: string): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset));
  const weekKey = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-W${String(monday.getUTCDate()).padStart(2, '0')}`;
  return `quota:chat:${walletAddress}:weekly:${weekKey}`;
}

/** Get Redis key for monthly quota. */
function getMonthlyKey(walletAddress: string): string {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `quota:chat:${walletAddress}:monthly:${month}`;
}

/** Get concurrency lock key for a wallet. */
function getLockKey(walletAddress: string): string {
  return `concurrency:chat:${walletAddress}:lock`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class QuotaService {
  private static instance: QuotaService;

  private config: QuotaConfig;

  private constructor(config: QuotaConfig = {}) {
    this.config = config;
  }

  static getInstance(config?: QuotaConfig): QuotaService {
    if (!QuotaService.instance) {
      QuotaService.instance = new QuotaService(config || {});
    }
    return QuotaService.instance;
  }

  /**
   * Check if Redis is configured.
   */
  isRedisConfigured(): boolean {
    return this.config.redisUrl !== undefined || this.config.redisHost !== undefined;
  }

  /**
   * Get Redis connection status.
   */
  getRedisStatus(): 'ready' | 'connecting' | 'reconnecting' | 'disconnected' | 'not_configured' {
    const redis = getSharedRedis();
    if (!redis) return 'not_configured';
    return redis.status as 'ready' | 'connecting' | 'reconnecting' | 'disconnected' || 'disconnected';
  }

  /**
   * Get the next daily reset timestamp.
   */
  private getNextDayReset(): string {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return next.toISOString();
  }

  /**
   * Get the next weekly reset timestamp (next Monday 00:00 UTC).
   */
  private getNextWeekReset(): string {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = dayOfWeek === 0 ? 7 : 7 - dayOfWeek + 1;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset));
    return next.toISOString();
  }

  /**
   * Get the next monthly reset timestamp.
   */
  private getNextMonthReset(): string {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toISOString();
  }

  /**
   * Acquire a concurrency lock for a wallet using Redis.
   * Returns a cleanup function to release the lock.
   */
  private async acquireLock(walletAddress: string): Promise<() => void> {
    const lockKey = getLockKey(walletAddress);
    const redis = getSharedRedis();

    if (redis) {
      try {
        const acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
        if (acquired === 'OK') {
          return () => redis.del(lockKey).catch(() => {});
        }
      } catch (error) {
        logger.warn('Redis lock acquisition failed; proceeding without lock', error);
      }
    }

    // Fallback: no lock (risk of slight over-counting under extreme concurrency)
    return () => {};
  }

  /**
   * Atomically increment a Redis counter for a specific quota window.
   * Returns the new count.
   */
  private async incrementQuotaKey(key: string): Promise<number> {
    const redis = getSharedRedis();
    if (redis) {
      try {
        const count = await redis.incr(key);
        // Set TTL to 2 days beyond the window to auto-cleanup
        await redis.expire(key, 3 * 24 * 60 * 60);
        return count;
      } catch (error) {
        logger.warn('Redis quota increment failed', error);
      }
    }
    // Fallback: don't count (safe for development)
    return -1;
  }

  /**
   * Read Redis counter for a quota key.
   * Returns -1 if Redis is unavailable.
   */
  private async readQuotaKey(key: string): Promise<number> {
    const redis = getSharedRedis();
    if (redis) {
      try {
        return (await redis.get(key)) ? parseInt(await redis.get(key) as string, 10) : 0;
      } catch {
        return -1;
      }
    }
    return -1;
  }

  /**
   * Get quota status for a wallet.
   * Uses Redis counters when available, falls back to DB.
   */
  async getQuotaStatus(walletAddress: string): Promise<QuotaStatus> {
    const normalized = walletAddress.toLowerCase();

    // Unrestricted wallets bypass quotas
    if (isUnrestrictedWallet(walletAddress)) {
      return {
        walletAddress: normalized,
        plan: 'unrestricted',
        dailyUsed: 0,
        dailyLimit: Number.MAX_SAFE_INTEGER,
        weeklyUsed: 0,
        weeklyLimit: Number.MAX_SAFE_INTEGER,
        monthlyUsed: 0,
        monthlyLimit: Number.MAX_SAFE_INTEGER,
        dailyRemaining: Number.MAX_SAFE_INTEGER,
        weeklyRemaining: Number.MAX_SAFE_INTEGER,
        monthlyRemaining: Number.MAX_SAFE_INTEGER,
        canUse: true,
        resetDailyAt: this.getNextDayReset(),
        resetWeeklyAt: this.getNextWeekReset(),
        resetMonthlyAt: this.getNextMonthReset(),
      };
    }

    // Resolve plan and limits
    const prismaPlan = await resolvePlan(walletAddress);
    // Convert Prisma enum (FREE/PRO/UNLIMITED) to config type (free/pro/unlimited)
    const plan = prismaPlan.toLowerCase() as config.PlanId;
    const quotas = config.getQuotas(plan);

    // Try Redis counters first
    const dailyRedis = await this.readQuotaKey(getDailyKey(normalized));
    const weeklyRedis = await this.readQuotaKey(getWeeklyKey(normalized));
    const monthlyRedis = await this.readQuotaKey(getMonthlyKey(normalized));

    let dailyUsed = dailyRedis >= 0 ? dailyRedis : 0;
    let weeklyUsed = weeklyRedis >= 0 ? weeklyRedis : 0;
    let monthlyUsed = monthlyRedis >= 0 ? monthlyRedis : 0;

    // If Redis wasn't available, fall back to DB
    if (dailyRedis < 0) {
      const dbCounts = await getUsageCounts(walletAddress);
      dailyUsed = dbCounts.daily;
      weeklyUsed = dbCounts.weekly;
      monthlyUsed = dbCounts.monthly;
    }

    return {
      walletAddress: normalized,
      plan,
      dailyUsed,
      dailyLimit: quotas.daily,
      weeklyUsed,
      weeklyLimit: quotas.weekly,
      monthlyUsed,
      monthlyLimit: quotas.monthly,
      dailyRemaining: Math.max(0, quotas.daily - dailyUsed),
      weeklyRemaining: Math.max(0, quotas.weekly - weeklyUsed),
      monthlyRemaining: Math.max(0, quotas.monthly - monthlyUsed),
      canUse: dailyUsed < quotas.daily && weeklyUsed < quotas.weekly && monthlyUsed < quotas.monthly,
      resetDailyAt: this.getNextDayReset(),
      resetWeeklyAt: this.getNextWeekReset(),
      resetMonthlyAt: this.getNextMonthReset(),
    };
  }

  /**
   * Check if a wallet can use chat (quota available).
   */
  async canUseChat(walletAddress: string): Promise<boolean> {
    const status = await this.getQuotaStatus(walletAddress);
    return status.canUse;
  }

  /**
   * Reserve one prompt slot for a wallet.
   * Returns true if reserved, false if quota exceeded.
   * Uses concurrency lock + atomic Redis increment.
   */
  async canUseChatWithLock(walletAddress: string): Promise<boolean> {
    const normalized = walletAddress.toLowerCase();
    const releaseLock = await this.acquireLock(normalized);

    try {
      const status = await this.getQuotaStatus(walletAddress);
      if (!status.canUse) {
        return false;
      }

      // Increment daily counter
      await this.incrementQuotaKey(getDailyKey(normalized));
      // Increment weekly counter
      await this.incrementQuotaKey(getWeeklyKey(normalized));
      // Increment monthly counter
      await this.incrementQuotaKey(getMonthlyKey(normalized));

      return true;
    } catch (error) {
      logger.error('Quota check error:', error);
      return true; // Fail open on error
    } finally {
      releaseLock();
    }
  }

  /**
   * Get DID from wallet address (for backwards compatibility).
   */
  async getDIDFromWallet(walletAddress: string): Promise<string> {
    // For backwards compatibility: return the wallet address itself
    // DID functionality is handled separately via DIDService
    return walletAddress.toLowerCase();
  }

  /**
   * Acquire a concurrency lock for a wallet (for tracking concurrent requests).
   * Returns true if lock was acquired, false if already locked.
   */
  async acquireConcurrencyLock(walletAddress: string, ttlSeconds: number = 300): Promise<boolean> {
    const lockKey = `concurrency:chat:${walletAddress}:active`;
    const redis = getSharedRedis();
    if (redis) {
      try {
        const result = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        return false;
      }
    }
    // Fallback: assume lock acquired (Redis optional for concurrency tracking)
    return true;
  }

  /**
   * Release a concurrency lock for a wallet.
   */
  async releaseConcurrencyLock(walletAddress: string): Promise<void> {
    const lockKey = `concurrency:chat:${walletAddress}:active`;
    const redis = getSharedRedis();
    if (redis) {
      try {
        await redis.del(lockKey);
      } catch {
        // Ignore errors on release
      }
    }
  }

  /**
   * Check if there's an active concurrency lock for a wallet.
   */
  async hasConcurrencyLock(walletAddress: string): Promise<boolean> {
    const lockKey = `concurrency:chat:${walletAddress}:active`;
    const redis = getSharedRedis();
    if (redis) {
      try {
        const exists = await redis.exists(lockKey);
        return exists === 1;
      } catch {
        return false;
      }
    }
    return false;
  }
}