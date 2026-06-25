/**
 * IP-based daily quota for guest / unauthenticated chat completions.
 */
import { getSharedRedis } from './redis-shared';
import logger from './logger';

const KEY_PREFIX = 'guest:chat:';

type MemoryEntry = { count: number; day: string };

const memoryCounts = new Map<string, MemoryEntry>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getGuestDailyLimit(): number {
  const raw = parseInt(process.env.GUEST_CHAT_DAILY_LIMIT || '10', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

function redisKey(ip: string, day: string): string {
  return `${KEY_PREFIX}${ip}:${day}`;
}

function consumeInMemory(ip: string, limit: number): { allowed: boolean; used: number; limit: number } {
  const day = utcDayKey();
  const existing = memoryCounts.get(ip);
  const entry =
    existing && existing.day === day ? existing : { count: 0, day };

  if (entry.count >= limit) {
    memoryCounts.set(ip, entry);
    return { allowed: false, used: entry.count, limit };
  }

  entry.count += 1;
  memoryCounts.set(ip, entry);
  return { allowed: true, used: entry.count, limit };
}

/**
 * Consume one guest chat slot for `clientIp`. Returns false when daily limit exceeded.
 */
export async function consumeGuestChatQuota(
  clientIp: string
): Promise<{ allowed: boolean; used: number; limit: number; unavailable?: boolean }> {
  const limit = getGuestDailyLimit();
  const ip = clientIp.trim() || 'unknown';
  const day = utcDayKey();
  const redis = getSharedRedis();

  if (redis) {
    try {
      const key = redisKey(ip, day);
      const used = await redis.incr(key);
      if (used === 1) {
        await redis.expire(key, 25 * 60 * 60);
      }
      return { allowed: used <= limit, used, limit };
    } catch (error) {
      logger.warn('Guest quota Redis error', {
        error: error instanceof Error ? error.message : String(error),
      });
      if (process.env.NODE_ENV === 'production') {
        return { allowed: false, used: 0, limit, unavailable: true };
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    return { allowed: false, used: 0, limit, unavailable: true };
  }

  const result = consumeInMemory(ip, limit);
  return result;
}
