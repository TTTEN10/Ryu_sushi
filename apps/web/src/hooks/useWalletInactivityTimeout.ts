import { useEffect, useRef } from 'react';
import {
  WALLET_INACTIVITY_MS,
  getWalletLastActivity,
  isWalletIdleExpired,
  touchWalletActivity,
} from '../lib/wallet-inactivity';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const CHECK_INTERVAL_MS = 60_000;

/**
 * Ends verified wallet sessions after {@link WALLET_INACTIVITY_MS} without user activity.
 * Calls `onTimeout` (typically `logout` + wallet disconnect) once per idle period.
 */
export function useWalletInactivityTimeout(
  enabled: boolean,
  onTimeout: () => void | Promise<void>,
): void {
  const onTimeoutRef = useRef(onTimeout);
  const firedRef = useRef(false);

  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled) {
      firedRef.current = false;
      return;
    }

    firedRef.current = false;
    touchWalletActivity();

    const runTimeout = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      void Promise.resolve(onTimeoutRef.current());
    };

    const onActivity = () => {
      touchWalletActivity();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (isWalletIdleExpired(getWalletLastActivity())) {
        runTimeout();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (isWalletIdleExpired(getWalletLastActivity())) {
        runTimeout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [enabled]);
}
