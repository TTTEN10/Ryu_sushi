/**
 * Single-use SIWE nonces for replay protection (EIP-4361 login flow).
 * Uses shared Redis (REDIS_URL) when available; falls back to in-memory for local dev.
 */
import { getSharedRedis } from './redis-shared';
import logger from './logger';

const TTL_SECONDS = 5 * 60; // 5 minutes
const TTL_MS = TTL_SECONDS * 1000;
const KEY_PREFIX = 'wallet:nonce:';

/** Atomic get-and-delete for single-use nonce consumption across replicas. */
const CONSUME_NONCE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
redis.call('DEL', KEYS[1])
return raw
`;

type NonceEntry = {
  address: string;
  chainId: number;
  expiresAt: number;
};

const pending = new Map<string, NonceEntry>();

function normalizeNonce(nonce: string): string {
  return nonce.trim().toLowerCase();
}

function redisKey(nonce: string): string {
  return KEY_PREFIX + normalizeNonce(nonce);
}

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of pending.entries()) {
    if (now > entry.expiresAt) {
      pending.delete(key);
    }
  }
}

function parseStoredEntry(raw: string): { address: string; chainId: number } | null {
  try {
    const parsed = JSON.parse(raw) as { address?: string; chainId?: number };
    if (typeof parsed.address !== 'string' || typeof parsed.chainId !== 'number') {
      return null;
    }
    return { address: parsed.address.toLowerCase(), chainId: parsed.chainId };
  } catch {
    return null;
  }
}

/**
 * Register nonce issued in SIWE message for `address` / `chainId`.
 */
export async function registerWalletNonce(
  nonce: string,
  address: string,
  chainId: number
): Promise<void> {
  const normalized = normalizeNonce(nonce);
  const entry = {
    address: address.toLowerCase(),
    chainId,
    expiresAt: Date.now() + TTL_MS,
  };

  const redis = getSharedRedis();
  if (redis) {
    try {
      await redis.setex(
        redisKey(nonce),
        TTL_SECONDS,
        JSON.stringify({ address: entry.address, chainId: entry.chainId })
      );
      return;
    } catch (error) {
      logger.warn('Wallet nonce Redis register failed; using in-memory fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  sweepExpired();
  pending.set(normalized, entry);
}

/**
 * Consume nonce once if valid for the signing address. Returns false if replay, unknown, or expired.
 */
export async function consumeWalletNonce(nonce: string, signerAddress: string): Promise<boolean> {
  const signer = signerAddress.toLowerCase();
  const redis = getSharedRedis();

  if (redis) {
    try {
      const raw = await redis.eval(CONSUME_NONCE_SCRIPT, 1, redisKey(nonce));
      if (typeof raw !== 'string') {
        return false;
      }
      const entry = parseStoredEntry(raw);
      if (!entry) {
        return false;
      }
      return entry.address === signer;
    } catch (error) {
      logger.warn('Wallet nonce Redis consume failed; using in-memory fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  sweepExpired();
  const key = normalizeNonce(nonce);
  const entry = pending.get(key);
  if (!entry) {
    return false;
  }
  pending.delete(key);
  if (Date.now() > entry.expiresAt) {
    return false;
  }
  return entry.address === signer;
}

/** Parse EIP-4361 prepared message text for `Nonce:` line. */
export function extractNonceFromSiweMessage(message: string): string | null {
  const m = message.match(/^Nonce:\s*(.+)$/m);
  return m?.[1]?.trim() ?? null;
}
