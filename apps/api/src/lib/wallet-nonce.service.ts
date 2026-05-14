/**
 * Single-use SIWE nonces for replay protection (EIP-4361 login flow).
 * In-memory store — swap for Redis in multi-instance production if needed.
 */
const TTL_MS = 5 * 60 * 1000; // 5 minutes

type NonceEntry = {
  address: string;
  chainId: number;
  expiresAt: number;
};

const pending = new Map<string, NonceEntry>();

function normalizeNonce(nonce: string): string {
  return nonce.trim().toLowerCase();
}

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of pending.entries()) {
    if (now > entry.expiresAt) {
      pending.delete(key);
    }
  }
}

/**
 * Register nonce issued in SIWE message for `address` / `chainId`.
 */
export function registerWalletNonce(nonce: string, address: string, chainId: number): void {
  sweepExpired();
  pending.set(normalizeNonce(nonce), {
    address: address.toLowerCase(),
    chainId,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Consume nonce once if valid for the signing address. Returns false if replay, unknown, or expired.
 */
/** Parse EIP-4361 prepared message text for `Nonce:` line. */
export function extractNonceFromSiweMessage(message: string): string | null {
  const m = message.match(/^Nonce:\s*(.+)$/m);
  return m?.[1]?.trim() ?? null;
}

export function consumeWalletNonce(nonce: string, signerAddress: string): boolean {
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
  return entry.address === signerAddress.toLowerCase();
}
