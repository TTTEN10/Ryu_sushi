/**
 * Response caching for Scaleway API calls (non-streaming completions).
 */

import { createHash } from 'crypto';
import logger from './logger';
import { getSharedRedis } from './redis-shared';

const CACHE_PREFIX = 'cache:scaleway:';

function getDefaultTtlSeconds(): number {
  const raw = process.env.AI_RESPONSE_CACHE_TTL?.trim();
  const n = raw ? parseInt(raw, 10) : 3600;
  return Number.isFinite(n) && n > 0 ? n : 3600;
}

export function isResponseCacheEnabled(): boolean {
  return process.env.AI_RESPONSE_CACHE !== '0';
}

function hashMessages(messages: Array<{ role: string; content: string }>): string {
  const normalized = messages.map((m) => `${m.role}:${m.content}`).join('|');
  return createHash('sha256').update(normalized).digest('hex');
}

export async function getCachedResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string | null> {
  if (!isResponseCacheEnabled()) {
    return null;
  }

  try {
    const redis = getSharedRedis();
    if (!redis) {
      return null;
    }

    const cacheKey = CACHE_PREFIX + hashMessages(messages);
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.debug('Scaleway response cache hit', { cacheKey: cacheKey.slice(0, 24) });
      return cached;
    }

    return null;
  } catch (error) {
    logger.warn('Cache get error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function cacheResponse(
  messages: Array<{ role: string; content: string }>,
  response: string,
  ttlSeconds: number = getDefaultTtlSeconds()
): Promise<void> {
  if (!isResponseCacheEnabled()) {
    return;
  }

  try {
    const redis = getSharedRedis();
    if (!redis) {
      return;
    }

    const cacheKey = CACHE_PREFIX + hashMessages(messages);
    await redis.setex(cacheKey, ttlSeconds, response);
    logger.debug('Scaleway response cache set', {
      cacheKey: cacheKey.slice(0, 24),
      ttlSeconds,
    });
  } catch (error) {
    logger.warn('Cache set error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
