/**
 * Shared Redis connection for optional features (response cache, etc.).
 */

import Redis from 'ioredis';
import logger from './logger';

let client: Redis | null = null;
let initAttempted = false;

export function getSharedRedis(): Redis | null {
  if (initAttempted) {
    return client;
  }
  initAttempted = true;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    client.on('error', (err) => {
      logger.warn('Shared Redis error', { message: err.message });
    });
    return client;
  } catch (error) {
    logger.warn('Shared Redis init failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    client = null;
    return null;
  }
}
