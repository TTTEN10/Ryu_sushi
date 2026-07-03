/**
 * Persists the guest prompt counter across hard refreshes and tab reopens.
 *
 * Storage is per browser (localStorage), scoped to the current UTC day so it
 * mirrors the server-side guest quota window (guest-quota.service.ts).
 * This is a UX layer only: it stops honest refreshers from confusingly
 * getting "more turns" after a refresh, and lets us open the paywall modal
 * immediately without a round-trip. Enforcement remains server-side via the
 * signed device cookie + IP hard cap.
 *
 * Trivially defeatable by clearing storage or opening a private window; that
 * is intentional. Do not rely on this for security.
 */

const STORAGE_KEY = 'sp.guest.promptCount.v1';

interface StoredEntry {
  count: number;
  day: string;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    // Access a property to confirm storage is usable (may throw in strict private modes).
    void s.length;
    return s;
  } catch {
    return null;
  }
}

export function readGuestPromptCount(): number {
  const s = safeLocalStorage();
  if (!s) return 0;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<StoredEntry> | null;
    if (!parsed || typeof parsed.count !== 'number' || typeof parsed.day !== 'string') {
      return 0;
    }
    if (parsed.day !== utcDay()) {
      s.removeItem(STORAGE_KEY);
      return 0;
    }
    return Math.max(0, Math.floor(parsed.count));
  } catch {
    return 0;
  }
}

export function writeGuestPromptCount(count: number): void {
  const s = safeLocalStorage();
  if (!s) return;
  try {
    const entry: StoredEntry = { count: Math.max(0, Math.floor(count)), day: utcDay() };
    s.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be full or blocked; silently ignore.
  }
}

export function clearGuestPromptCount(): void {
  const s = safeLocalStorage();
  if (!s) return;
  try {
    s.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
