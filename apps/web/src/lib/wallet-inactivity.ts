/** Disconnect verified wallet sessions after this period without user activity. */
export const WALLET_INACTIVITY_MS = 60 * 60 * 1000;

const WALLET_LAST_ACTIVITY_KEY = 'sp_wallet_last_activity';

/** Set by idle logout; ConnectWallet shows a reconnect prompt and clears it. */
export const WALLET_IDLE_LOGOUT_FLAG = 'sp_wallet_idle_logout';

export function touchWalletActivity(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(WALLET_LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getWalletLastActivity(): number | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(WALLET_LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function clearWalletActivityTracking(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(WALLET_LAST_ACTIVITY_KEY);
}

export function isWalletIdleExpired(lastActivity: number | null, now = Date.now()): boolean {
  if (lastActivity == null) return false;
  return now - lastActivity >= WALLET_INACTIVITY_MS;
}
