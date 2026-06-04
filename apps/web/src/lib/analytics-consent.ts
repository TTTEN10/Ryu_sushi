/**
 * GDPR-Compliant Analytics Consent Management
 *
 * Handles user consent for analytics tracking:
 * - Explicit opt-in required
 * - Easy opt-out support
 * - Consent persistence
 * - Analytics disabled mode
 *
 * Cookie consent categories:
 * - essential: Always enabled (auth, security)
 * - analytics: Optional (funnel tracking, metrics)
 * - marketing: Optional (ads, promotions)
 */

// ============================================================================
// Types
// ============================================================================

export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export type ConsentCategory = 'essential' | 'analytics' | 'marketing';

// ============================================================================
// Constants
// ============================================================================

const CONSENT_KEY = 'cookieConsent';

// ============================================================================
// Default Consent
// ============================================================================

const DEFAULT_CONSENT: CookieConsent = {
  essential: true, // Always enabled
  analytics: false, // Opt-in required
  marketing: false, // Opt-in required
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Storage
// ============================================================================

function getConsentFromStorage(): CookieConsent | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CookieConsent;

    // Validate structure
    if (
      typeof parsed !== 'object' ||
      typeof parsed.essential !== 'boolean' ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.marketing !== 'boolean'
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveConsentToStorage(consent: CookieConsent): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Storage unavailable
  }
}

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Get current consent preferences.
 */
export function getConsent(): CookieConsent {
  const stored = getConsentFromStorage();
  return stored ?? DEFAULT_CONSENT;
}

/**
 * Check if a specific consent category is enabled.
 */
export function hasConsent(category: ConsentCategory): boolean {
  const consent = getConsent();
  return consent[category];
}

/**
 * Check if analytics consent is given.
 */
export function hasAnalyticsConsent(): boolean {
  return hasConsent('analytics');
}

/**
 * Update consent preferences.
 */
export function updateConsent(updates: Partial<Pick<CookieConsent, 'analytics' | 'marketing'>>): CookieConsent {
  const current = getConsent();

  const updated: CookieConsent = {
    ...current,
    ...updates,
    essential: true, // Cannot disable essential
    updatedAt: new Date().toISOString(),
  };

  saveConsentToStorage(updated);

  // Dispatch custom event for components to react
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cookieConsentChange', { detail: updated }));
  }

  return updated;
}

/**
 * Opt-in to analytics.
 */
export function optInAnalytics(): void {
  updateConsent({ analytics: true });
}

/**
 * Opt-out of analytics.
 */
export function optOutAnalytics(): void {
  updateConsent({ analytics: false });
}

/**
 * Reset all consent preferences to defaults.
 */
export function resetConsent(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent('cookieConsentChange', { detail: DEFAULT_CONSENT }));
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(getConsent());
    setLoaded(true);
  }, []);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsent>;
      setConsent(customEvent.detail);
    };

    window.addEventListener('cookieConsentChange', handleChange);
    return () => window.removeEventListener('cookieConsentChange', handleChange);
  }, []);

  const update = useCallback(
    (updates: Partial<Pick<CookieConsent, 'analytics' | 'marketing'>>) => {
      return updateConsent(updates);
    },
    []
  );

  const optIn = useCallback((category: ConsentCategory) => {
    if (category === 'essential') return;
    updateConsent({ [category]: true });
  }, []);

  const optOut = useCallback((category: ConsentCategory) => {
    if (category === 'essential') return;
    updateConsent({ [category]: false });
  }, []);

  return {
    consent,
    loaded,
    update,
    optIn,
    optOut,
    hasConsent,
    hasAnalyticsConsent: hasAnalyticsConsent(),
  };
}

// ============================================================================
// Consent Banner Component Helper
// ============================================================================

export function shouldShowConsentBanner(): boolean {
  const consent = getConsentFromStorage();
  return consent === null; // Show if no consent recorded
}
