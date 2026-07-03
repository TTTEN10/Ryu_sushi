import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  consumeGuestChatQuota,
  getGuestDailyLimit,
  getGuestIpHardCap,
} from '../lib/guest-quota.service';

describe('guest-quota.service', () => {
  beforeEach(() => {
    delete process.env.GUEST_CHAT_DAILY_LIMIT;
    delete process.env.GUEST_CHAT_IP_HARD_CAP;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    delete process.env.GUEST_CHAT_DAILY_LIMIT;
    delete process.env.GUEST_CHAT_IP_HARD_CAP;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
  });

  it('uses default daily limit of 5', () => {
    expect(getGuestDailyLimit()).toBe(5);
  });

  it('respects GUEST_CHAT_DAILY_LIMIT', () => {
    process.env.GUEST_CHAT_DAILY_LIMIT = '3';
    expect(getGuestDailyLimit()).toBe(3);
  });

  it('defaults IP hard cap to 5x the device limit', () => {
    process.env.GUEST_CHAT_DAILY_LIMIT = '5';
    expect(getGuestIpHardCap()).toBe(25);
  });

  it('respects GUEST_CHAT_IP_HARD_CAP when it is >= device limit', () => {
    process.env.GUEST_CHAT_DAILY_LIMIT = '5';
    process.env.GUEST_CHAT_IP_HARD_CAP = '40';
    expect(getGuestIpHardCap()).toBe(40);
  });

  it('ignores an IP hard cap below the device limit', () => {
    process.env.GUEST_CHAT_DAILY_LIMIT = '5';
    process.env.GUEST_CHAT_IP_HARD_CAP = '2';
    expect(getGuestIpHardCap()).toBe(25);
  });

  it('tracks in-memory usage per IP in non-production (no device cookie)', async () => {
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
    expect(third.used).toBe(limit + 1);
    expect(third.reason).toBe('ip');
  });

  it('keys on deviceId when present, ignoring shared-IP false positives', async () => {
    process.env.NODE_ENV = 'development';
    const limit = 2;
    process.env.GUEST_CHAT_DAILY_LIMIT = String(limit);
    process.env.GUEST_CHAT_IP_HARD_CAP = '100'; // effectively disable the IP cap here

    const sharedIp = '198.51.100.7';
    const alice = 'dev-alice-000000000000';
    const bob = 'dev-bob-0000000000000000';

    const a1 = await consumeGuestChatQuota({ clientIp: sharedIp, deviceId: alice });
    const a2 = await consumeGuestChatQuota({ clientIp: sharedIp, deviceId: alice });
    const a3 = await consumeGuestChatQuota({ clientIp: sharedIp, deviceId: alice });
    const b1 = await consumeGuestChatQuota({ clientIp: sharedIp, deviceId: bob });

    expect(a1.allowed).toBe(true);
    expect(a2.allowed).toBe(true);
    expect(a3.allowed).toBe(false);
    expect(a3.reason).toBe('device');
    // Bob shares Alice's IP but has his own device — still allowed within his own device budget.
    expect(b1.allowed).toBe(true);
  });

  it('enforces the IP hard cap to catch cookie-clearing abuse', async () => {
    process.env.NODE_ENV = 'development';
    const limit = 2;
    process.env.GUEST_CHAT_DAILY_LIMIT = String(limit);
    process.env.GUEST_CHAT_IP_HARD_CAP = '3';

    const attackerIp = '203.0.113.99';

    // Simulate a fresh device cookie on each request (as if the user cleared cookies)
    const r1 = await consumeGuestChatQuota({ clientIp: attackerIp, deviceId: 'dev-fresh-1000000000' });
    const r2 = await consumeGuestChatQuota({ clientIp: attackerIp, deviceId: 'dev-fresh-2000000000' });
    const r3 = await consumeGuestChatQuota({ clientIp: attackerIp, deviceId: 'dev-fresh-3000000000' });
    const r4 = await consumeGuestChatQuota({ clientIp: attackerIp, deviceId: 'dev-fresh-4000000000' });

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toBe('ip');
  });

  it('fails closed in production without Redis', async () => {
    process.env.NODE_ENV = 'production';

    const result = await consumeGuestChatQuota('203.0.113.11');
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
  });
});
