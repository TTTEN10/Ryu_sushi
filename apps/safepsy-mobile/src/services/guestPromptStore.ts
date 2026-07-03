import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Mirror of apps/web/src/utils/guestPromptStore.ts for the mobile client.
 * Persists the guest prompt counter across app relaunches, scoped to the
 * current UTC day so it matches the server-side quota window.
 * UX layer only; enforcement lives in the API (guest-quota.service.ts).
 */

const STORAGE_KEY = 'sp.guest.promptCount.v1';

interface StoredEntry {
  count: number;
  day: string;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function readGuestPromptCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<StoredEntry> | null;
    if (!parsed || typeof parsed.count !== 'number' || typeof parsed.day !== 'string') {
      return 0;
    }
    if (parsed.day !== utcDay()) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return 0;
    }
    return Math.max(0, Math.floor(parsed.count));
  } catch {
    return 0;
  }
}

export async function writeGuestPromptCount(count: number): Promise<void> {
  try {
    const entry: StoredEntry = { count: Math.max(0, Math.floor(count)), day: utcDay() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage may be unavailable; silently ignore.
  }
}

export async function clearGuestPromptCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
