import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { consumeGuestChatQuota, getGuestDailyLimit } from '../lib/guest-quota.service';

describe('guest-quota.service', () => {
  beforeEach(() => {
    delete process.env.GUEST_CHAT_DAILY_LIMIT;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    delete process.env.GUEST_CHAT_DAILY_LIMIT;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
  });

  it('uses default daily limit of 10', () => {
    expect(getGuestDailyLimit()).toBe(10);
  });

  it('respects GUEST_CHAT_DAILY_LIMIT', () => {
    process.env.GUEST_CHAT_DAILY_LIMIT = '3';
    expect(getGuestDailyLimit()).toBe(3);
  });

  it('tracks in-memory usage per IP in non-production', async () => {
    process.env.NODE_ENV = 'development';

    const ip = '203.0.113.10';
    const limit = 2;
    process.env.GUEST_CHAT_DAILY_LIMIT = String(limit);

    const first = await consumeGuestChatQuota(ip);
    const second = await consumeGuestChatQuota(ip);
    const third = await consumeGuestChatQuota(ip);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.used).toBe(limit);
  });

  it('fails closed in production without Redis', async () => {
    process.env.NODE_ENV = 'production';

    const result = await consumeGuestChatQuota('203.0.113.11');
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
  });
});
