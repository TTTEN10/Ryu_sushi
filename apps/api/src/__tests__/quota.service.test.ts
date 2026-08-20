import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Shared mock state (hoisted scope) ──────────────────────────────────────
// `vi.hoisted()` ensures these are initialized before hoisted `vi.mock`
// factories execute.

let _redisAvailable = true;

const S = vi.hoisted(() => {
  const redisGet = vi.fn();
  const redisIncr = vi.fn();
  const redisExpire = vi.fn();
  const redisDel = vi.fn();
  const redisSet = vi.fn();
  const redisStatus = "ready" as string;
  const isUnrestrictedWallet = vi.fn();
  const resolvePlan = vi.fn();
  const getUsageCounts = vi.fn();

  return {
    redisGet,
    redisIncr,
    redisExpire,
    redisDel,
    redisSet,
    redisStatus,
    isUnrestrictedWallet,
    resolvePlan,
    getUsageCounts,
  };
});

// ─── Mock modules ───────────────────────────────────────────────────────────

vi.mock("../lib/redis-shared", () => ({
  getSharedRedis: () => {
    if (!_redisAvailable) return null;
    return {
      get: S.redisGet,
      incr: S.redisIncr,
      expire: S.redisExpire,
      del: S.redisDel,
      set: S.redisSet,
      status: S.redisStatus,
    };
  },
}));

vi.mock("../lib/subscription.service", () => ({
  resolvePlan: S.resolvePlan,
  getUsageCounts: S.getUsageCounts,
}));

vi.mock("../lib/unrestricted-wallets", () => ({
  isUnrestrictedWallet: S.isUnrestrictedWallet,
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    promptUsage: {
      count: vi.fn(),
    },
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { QuotaService } from "../lib/quota.service";
import * as subService from "../lib/subscription.service";
import * as unrestricted from "../lib/unrestricted-wallets";

// ─── Constants ───────────────────────────────────────────────────────────────

const TEST_WALLET = "0xabcdef1234567890abcdef1234567890abcdef12";
const UNRESTRICTED_WALLET = "0xdead000000000000000000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Set up Redis to be unavailable, triggering DB fallback. */
function setRedisUnavailable() {
  _redisAvailable = false;
  S.redisGet.mockReset();
}

/** Set up Redis to be available with default values. */
function setRedisAvailable() {
  _redisAvailable = true;
  S.redisGet.mockReset();
  S.redisIncr.mockReset().mockResolvedValue(1);
  S.redisExpire.mockReset().mockResolvedValue(true);
  S.redisDel.mockReset().mockResolvedValue(1);
  S.redisSet.mockReset().mockResolvedValue("OK");
  S.redisStatus = "ready";
}

function resetMocks() {
  setRedisAvailable();
  S.isUnrestrictedWallet.mockReset().mockReturnValue(false);
  S.resolvePlan.mockReset().mockResolvedValue("pro" as any);
  S.getUsageCounts.mockReset().mockResolvedValue({ daily: 0, weekly: 0, monthly: 0 });
  vi.clearAllMocks();
  // Force QuotaService singleton reset
  (QuotaService as any).instance = null;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("QuotaService — Basic Operations", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns unlimited quotas for unrestricted wallets", async () => {
    S.isUnrestrictedWallet.mockReturnValue(true);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(UNRESTRICTED_WALLET);

    expect(status.plan).toBe("unrestricted");
    expect(status.dailyLimit).toBe(Number.MAX_SAFE_INTEGER);
    expect(status.weeklyLimit).toBe(Number.MAX_SAFE_INTEGER);
    expect(status.monthlyLimit).toBe(Number.MAX_SAFE_INTEGER);
    expect(status.canUse).toBe(true);
  });

  it("returns correct plan and quotas for pro plan with no Redis", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("pro" as any);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.plan).toBe("pro");
    expect(status.dailyLimit).toBe(50);
    expect(status.weeklyLimit).toBe(250);
    expect(status.monthlyLimit).toBe(800);
    expect(status.dailyUsed).toBe(0);
    expect(status.canUse).toBe(true);
  });

  it("reports canUseChat === true when under quota", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("pro" as any);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    expect(await svc.canUseChat(TEST_WALLET)).toBe(true);
  });

  it("reports canUseChat === false when daily quota exceeded", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("pro" as any);
    S.getUsageCounts.mockResolvedValue({ daily: 50, weekly: 10, monthly: 20 });

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);
    expect(status.canUse).toBe(false);
    expect(status.dailyRemaining).toBe(0);
  });

  it("reports canUseChat === false when weekly quota exceeded", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("pro" as any);
    S.getUsageCounts.mockResolvedValue({ daily: 10, weekly: 250, monthly: 100 });

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);
    expect(status.canUse).toBe(false);
  });

  it("reports canUseChat === false when monthly quota exceeded", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("pro" as any);
    S.getUsageCounts.mockResolvedValue({ daily: 5, weekly: 50, monthly: 800 });

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);
    expect(status.canUse).toBe(false);
  });
});

describe("QuotaService — Redis Increment Path", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("uses Redis counters when available", async () => {
    S.redisGet.mockResolvedValue("42");
    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.dailyUsed).toBe(42);
    expect(S.redisGet).toHaveBeenCalledWith(expect.stringContaining("quota:chat"));
  });

  it("falls back to DB when Redis get throws", async () => {
    S.redisGet.mockRejectedValue(new Error("Redis connection refused"));
    S.resolvePlan.mockResolvedValue("pro" as any);
    S.getUsageCounts.mockResolvedValue({ daily: 7, weekly: 30, monthly: 60 });

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.dailyUsed).toBe(7);
    expect(S.getUsageCounts).toHaveBeenCalled();
  });

  it("increments counters correctly via canUseChatWithLock", async () => {
    S.redisGet.mockResolvedValue("10");
    S.redisIncr.mockResolvedValue(11);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const result = await svc.canUseChatWithLock(TEST_WALLET);

    expect(result).toBe(true);
    expect(S.redisIncr).toHaveBeenCalledTimes(3);
    expect(S.redisExpire).toHaveBeenCalledTimes(3);
  });

  it("returns false when quota is exhausted under Redis path", async () => {
    S.redisGet.mockResolvedValue("50");

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const result = await svc.canUseChatWithLock(TEST_WALLET);

    expect(result).toBe(false);
  });

  it("releases lock after increment completes", async () => {
    S.redisGet.mockResolvedValue("10");
    S.redisIncr.mockResolvedValue(11);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    await svc.canUseChatWithLock(TEST_WALLET);

    expect(S.redisDel).toHaveBeenCalled();
  });
});

describe("QuotaService — Redis Status", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("reports not_configured when Redis is not configured", () => {
    _redisAvailable = false;
    const svc = new QuotaService();
    expect(svc.isRedisConfigured()).toBe(false);
    expect(svc.getRedisStatus()).toBe("not_configured");
    _redisAvailable = true;
  });

  it("reports configured when Redis host is set", () => {
    const svc = QuotaService.getInstance({ redisHost: "localhost" });
    expect(svc.isRedisConfigured()).toBe(true);
  });

  it("reports ready when Redis client reports ready", () => {
    S.redisStatus = "ready";
    const svc = QuotaService.getInstance({ redisHost: "localhost" });
    expect(svc.getRedisStatus()).toBe("ready");
  });

  it("reports disconnected when Redis client is disconnected", () => {
    S.redisStatus = "disconnected";
    const svc = QuotaService.getInstance({ redisHost: "localhost" });
    expect(svc.getRedisStatus()).toBe("disconnected");
  });
});

describe("QuotaService — Reset Timestamps", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns ISO dates for all reset timestamps", () => {
    const svc = QuotaService.getInstance({ redisHost: "localhost" });
    const nextDay = (svc as any)["getNextDayReset"]();
    const nextWeek = (svc as any)["getNextWeekReset"]();
    const nextMonth = (svc as any)["getNextMonthReset"]();

    expect(nextDay).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(nextWeek).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(nextMonth).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(new Date(nextDay).getTime()).toBeLessThan(new Date(nextWeek).getTime());
    expect(new Date(nextWeek).getTime()).toBeLessThanOrEqual(new Date(nextMonth).getTime());
  });
});

describe("QuotaService — Free Plan", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns correct quotas for free plan", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("free" as any);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.plan).toBe("free");
    expect(status.dailyLimit).toBe(10);
    expect(status.weeklyLimit).toBe(50);
    expect(status.monthlyLimit).toBe(100);
  });

  it("returns false when free plan daily quota is reached", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("free" as any);
    S.getUsageCounts.mockResolvedValue({ daily: 10, weekly: 5, monthly: 10 });

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.canUse).toBe(false);
    expect(status.dailyRemaining).toBe(0);
  });
});

describe("QuotaService — Unlimited Plan", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns correct quotas for unlimited plan", async () => {
    setRedisUnavailable();
    S.resolvePlan.mockResolvedValue("unlimited" as any);

    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const status = await svc.getQuotaStatus(TEST_WALLET);

    expect(status.plan).toBe("unlimited");
    expect(status.dailyLimit).toBe(350);
    expect(status.weeklyLimit).toBe(2000);
    expect(status.monthlyLimit).toBe(8000);
  });
});

describe("QuotaService — DID Conversion", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns lowercased wallet address as DID", async () => {
    const svc = QuotaService.getInstance({ redisHost: "localhost", redisPort: 6379 });
    const did = await svc.getDIDFromWallet(TEST_WALLET);
    expect(did).toBe(TEST_WALLET.toLowerCase());
  });
});