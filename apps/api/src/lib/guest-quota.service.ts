/**
 * Anonymous chat quota for guest / unauthenticated completions.
 *
 * Keying strategy (defense in depth against the "hard refresh bypass"):
 *   - Primary counter: guest:chat:dev:{deviceId}:{day}  (limit = GUEST_CHAT_DAILY_LIMIT)
 *     Keyed on the signed device cookie issued by guestDeviceCookieMiddleware;
 *     survives refresh and can be shared across shared-IP environments without
 *     penalising honest users on the same office/carrier NAT.
 *   - Fallback / hard cap: guest:chat:ip:{ip}:{day}   (limit = GUEST_CHAT_IP_HARD_CAP)
 *     Prevents cookie-clearing / incognito hopping abuse. Set high enough to
 *     absorb reasonable shared-IP traffic (default: 5x device limit).
 *
 * A request is allowed only if BOTH counters are within their limits after
 * increment. When Redis is unavailable, non-production falls back to an
 * in-memory map; production returns { unavailable: true } and the middleware
 * fails closed.
 */
import { getSharedRedis } from './redis-shared';
import logger from './logger';
import { isUnrestrictedWallet } from './unrestricted-wallets';

const DEVICE_KEY_PREFIX = 'guest:chat:dev:';
const IP_KEY_PREFIX = 'guest:chat:ip:';
/** Legacy key prefix retained so a rolling deploy doesn't reset users mid-day. */
const LEGACY_IP_KEY_PREFIX = 'guest:chat:';

type MemoryEntry = { count: number; day: string };

const memoryDeviceCounts = new Map<string, MemoryEntry>();
const memoryIpCounts = new Map<string, MemoryEntry>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getGuestDailyLimit(): number {
  const raw = parseInt(process.env.GUEST_CHAT_DAILY_LIMIT || '5', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

/**
 * Per-IP hard cap that catches cookie-clearing / incognito abuse.
 * Defaults to 5x the per-device daily limit; override with GUEST_CHAT_IP_HARD_CAP.
 */
export function getGuestIpHardCap(): number {
  const deviceLimit = getGuestDailyLimit();
  const raw = process.env.GUEST_CHAT_IP_HARD_CAP;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= deviceLimit) return parsed;
  }
  return deviceLimit * 5;
}

function deviceRedisKey(deviceId: string, day: string): string {
  return `${DEVICE_KEY_PREFIX}${deviceId}:${day}`;
}

function ipRedisKey(ip: string, day: string): string {
  return `${IP_KEY_PREFIX}${ip}:${day}`;
}

function legacyIpRedisKey(ip: string, day: string): string {
  return `${LEGACY_IP_KEY_PREFIX}${ip}:${day}`;
}

function consumeMemory(
  bucket: Map<string, MemoryEntry>,
  id: string,
  limit: number,
  incrementIfExceeded: boolean,
): { used: number; allowed: boolean } {
  const day = utcDayKey();
  const existing = bucket.get(id);
  const entry = existing && existing.day === day ? existing : { count: 0, day };

  if (entry.count >= limit && !incrementIfExceeded) {
    bucket.set(id, entry);
    return { allowed: false, used: entry.count };
  }

  entry.count += 1;
  bucket.set(id, entry);
  return { allowed: entry.count <= limit, used: entry.count };
}

export interface ConsumeGuestQuotaOptions {
  /** Client IP (already resolved via `req.ip` upstream). */
  clientIp: string;
  /** Signed device id from guestDeviceCookieMiddleware, when present. */
  deviceId?: string | null;
  /** Wallet address - if unrestricted, bypasses quota checks */
  walletAddress?: string | null;
}

export interface ConsumeGuestQuotaResult {
  allowed: boolean;
  /** Reported "used" is the greater of device/ip counters, matching what the UI should surface. */
  used: number;
  limit: number;
  unavailable?: boolean;
  /** Which counter blocked the request when allowed=false. Undefined when allowed. */
  reason?: 'device' | 'ip';
}

/**
 * Consume one guest chat slot for this device+IP. Returns allowed=false when
 * either the per-device or per-IP daily counter is exceeded.
 */
export async function consumeGuestChatQuota(
  clientIpOrOptions: string | ConsumeGuestQuotaOptions,
): Promise<ConsumeGuestQuotaResult> {
  const opts: ConsumeGuestQuotaOptions =
    typeof clientIpOrOptions === 'string'
      ? { clientIp: clientIpOrOptions }
      : clientIpOrOptions;

  // Check if wallet is unrestricted (bypasses all quotas)
  if (opts.walletAddress && isUnrestrictedWallet(opts.walletAddress)) {
    logger.debug(`Unrestricted wallet detected: ${opts.walletAddress}, bypassing guest quotas`);
    return {
      allowed: true,
      used: 0,
      limit: Number.MAX_SAFE_INTEGER,
    };
  }

  const limit = getGuestDailyLimit();
  const ipHardCap = getGuestIpHardCap();
  const ip = (opts.clientIp || '').trim() || 'unknown';
  const deviceId = opts.deviceId?.trim() || null;
  const day = utcDayKey();
  const redis = getSharedRedis();

  if (redis) {
    try {
      const ipKey = ipRedisKey(ip, day);
      const legacyKey = legacyIpRedisKey(ip, day);

      // Absorb the pre-existing legacy IP counter once per day so rolling deploys
      // do not reset users mid-day. Best-effort: any error is non-fatal.
      let usedIp: number;
      try {
        const [ipCount, legacyCount] = await Promise.all([
          redis.incr(ipKey),
          redis.get(legacyKey).then((v) => (v ? parseInt(v, 10) : 0)),
        ]);
        usedIp = ipCount + (Number.isFinite(legacyCount) ? legacyCount : 0);
      } catch {
        usedIp = await redis.incr(ipKey);
      }
      if (usedIp === 1) {
        await redis.expire(ipKey, 25 * 60 * 60);
      }

      let usedDevice = 0;
      if (deviceId) {
        const key = deviceRedisKey(deviceId, day);
        usedDevice = await redis.incr(key);
        if (usedDevice === 1) {
          await redis.expire(key, 25 * 60 * 60);
        }
      }

      const deviceExceeded = deviceId ? usedDevice > limit : false;
      const ipExceeded = usedIp > (deviceId ? ipHardCap : limit);
      const allowed = !deviceExceeded && !ipExceeded;
      return {
        allowed,
        used: deviceId ? usedDevice : usedIp,
        limit,
        reason: allowed ? undefined : deviceExceeded ? 'device' : 'ip',
      };
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

  // Non-production fallback: in-memory counters.
  const ipResult = consumeMemory(memoryIpCounts, ip, deviceId ? ipHardCap : limit, true);
  let deviceResult: { used: number; allowed: boolean } | null = null;
  if (deviceId) {
    deviceResult = consumeMemory(memoryDeviceCounts, deviceId, limit, true);
  }

  const deviceExceeded = deviceResult ? deviceResult.used > limit : false;
  const ipExceeded = ipResult.used > (deviceId ? ipHardCap : limit);
  const allowed = !deviceExceeded && !ipExceeded;
  return {
    allowed,
    used: deviceResult ? deviceResult.used : ipResult.used,
    limit,
    reason: allowed ? undefined : deviceExceeded ? 'device' : 'ip',
  };
}
