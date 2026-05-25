import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

vi.mock('../redis-shared', () => ({
  getSharedRedis: vi.fn(),
}));

import { getSharedRedis } from '../redis-shared';
import { getCachedResponse, cacheResponse, isResponseCacheEnabled } from '../response-cache';

describe('response-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_RESPONSE_CACHE;
    delete process.env.AI_RESPONSE_CACHE_TTL;
  });

  it('is disabled when AI_RESPONSE_CACHE=0', () => {
    process.env.AI_RESPONSE_CACHE = '0';
    expect(isResponseCacheEnabled()).toBe(false);
  });

  it('returns null on cache miss', async () => {
    vi.mocked(getSharedRedis).mockReturnValue(null);
    const result = await getCachedResponse([{ role: 'user', content: 'hello' }]);
    expect(result).toBeNull();
  });

  it('returns cached value on hit', async () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const key =
      'cache:scaleway:' +
      createHash('sha256')
        .update(messages.map((m) => `${m.role}:${m.content}`).join('|'))
        .digest('hex');

    const redis = {
      get: vi.fn().mockResolvedValue('cached reply'),
      setex: vi.fn().mockResolvedValue('OK'),
    };
    vi.mocked(getSharedRedis).mockReturnValue(redis as never);

    await expect(getCachedResponse(messages)).resolves.toBe('cached reply');
    expect(redis.get).toHaveBeenCalledWith(key);

    await cacheResponse(messages, 'cached reply', 60);
    expect(redis.setex).toHaveBeenCalledWith(key, 60, 'cached reply');
  });
});
