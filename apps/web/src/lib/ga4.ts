/**
 * Google Analytics 4 (GA4) — consent-gated wrapper
 *
 * Loads the gtag.js script only after the user grants analytics consent.
 * Fires pageviews and conversion events in parallel with the self-hosted
 * analytics SDK so product dashboards receive the same signals.
 *
 * Environment:
 *   VITE_PUBLIC_GA4_MEASUREMENT_ID  — GA4 measurement ID (e.g. G-XXXXXXXXXX)
 *
 * GDPR posture:
 *   - IP anonymisation is built into the config payload
 *   - No scripts injected until consent is affirmative
 *   - Script is removed on consent withdrawal
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GA4_MEASUREMENT_ID =
  (import.meta as any).env?.VITE_PUBLIC_GA4_MEASUREMENT_ID?.trim() || '';

const GA4_SCRIPT_ID = 'ga4-script';
const GA4_HEAD_ID = 'ga4-head';

// ---------------------------------------------------------------------------
// gtag helper (type-safe subset)
// ---------------------------------------------------------------------------

type GtagEvent = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: unknown;
};

function gtag(
  command: 'config' | 'event' | 'js' | string,
  target?: string,
  params?: GtagEvent,
): void {
  if (typeof window === 'undefined' || !(window as any).gtag) return;
  (window as any).gtag(command, target, params);
}

// ---------------------------------------------------------------------------
// Script loading / unloading
// ---------------------------------------------------------------------------

let ga4Ready = false;
let ga4Initializing = false;

/**
 * Inject the gtag.js script into the document head and resolve once it is
 * operational.  Idempotent — safe to call multiple times.
 */
export function ga4Init(): Promise<boolean> {
  if (GA4_MEASUREMENT_ID) return Promise.resolve(true);

  if (ga4Ready) return Promise.resolve(true);
  if (ga4Initializing) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (ga4Ready || ga4Initializing === false) {
          clearInterval(check);
          resolve(ga4Ready);
        }
      }, 50);
      // Fallback timeout
      setTimeout(() => {
        clearInterval(check);
        if (!ga4Ready) resolve(false);
      }, 15000);
    });
  }

  ga4Initializing = true;

  // gtag.js is a small script — inject it once.
  const script = document.createElement('script');
  script.id = GA4_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  script.onload = () => {
    // Initialize gtag global
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtagFn(
      ...args: [string, string?, Record<string, unknown>?]
    ) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtagFn;
    gtagFn('js', new Date().toISOString());
    gtagFn('config', GA4_MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=Strict;Secure',
    });
    ga4Ready = true;
    ga4Initializing = false;
  };
  script.onerror = () => {
    ga4Initializing = false;
  };

  // Insert at top of <head> so it loads before other trackers.
  const head = document.head;
  if (head) {
    head.insertBefore(script, head.firstChild);
  } else {
    document.body.appendChild(script);
  }

  // Also add the inline initialization snippet for older browsers.
  const initScript = document.createElement('script');
  initScript.id = GA4_HEAD_ID;
  initScript.textContent = `
    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_MEASUREMENT_ID}',{anonymize_ip:true,cookie_flags:'SameSite=Strict;Secure'});
  `;
  if (head) {
    head.insertBefore(initScript, head.firstChild);
  } else {
    document.body.appendChild(initScript);
  }

  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (ga4Ready || ga4Initializing === false) {
        clearInterval(check);
        resolve(ga4Ready);
      }
    }, 50);
    setTimeout(() => {
      clearInterval(check);
      if (!ga4Ready) resolve(false);
    }, 15000);
  });
}

/**
 * Remove the GA4 script when consent is withdrawn.
 * Note: GA4 does not have a true "disable" API, but removing the script
 * and clearing the dataLayer prevents further hits.
 */
export function ga4Disable(): void {
  ga4Ready = false;

  // Remove inline init snippet (the gtag.js CDN script may still be cached
  // but without the init it will not fire config/events).
  const headScript = document.getElementById(GA4_HEAD_ID);
  if (headScript) headScript.remove();

  const bodyScript = document.getElementById(GA4_SCRIPT_ID);
  if (bodyScript) bodyScript.remove();

  // Clear the dataLayer to prevent replay on subsequent loads.
  (window as any).dataLayer = [];
}

// ---------------------------------------------------------------------------
// Public tracking API
// ---------------------------------------------------------------------------

/**
 * Track an event in GA4.  Returns silently if GA4 is not loaded.
 */
export function ga4Track(
  eventName: string,
  params?: GtagEvent,
): void {
  if (!ga4Ready || !GA4_MEASUREMENT_ID) return;
  gtag('event', eventName, {
    ...params,
    send_to: GA4_MEASUREMENT_ID,
  });
}

/**
 * Track a pageview in GA4.
 */
export function ga4PageView(path: string): void {
  if (!ga4Ready || !GA4_MEASUREMENT_ID) return;
  gtag('config', GA4_MEASUREMENT_ID, {
    page_path: path,
    anonymize_ip: true,
  });
}

// ---------------------------------------------------------------------------
// Consent-aware convenience
// ---------------------------------------------------------------------------

/**
 * Initialise GA4 if measurement ID is configured and consent is active.
 * Called from App.tsx on mount and on consent acceptance.
 */
export async function ga4InitIfConsented(): Promise<void> {
  if (!GA4_MEASUREMENT_ID) return;

  // Check consent from localStorage (same key the cookie banner uses).
  try {
    const consentRaw = localStorage.getItem('cookieConsent');
    if (!consentRaw) return;
    const parsed = JSON.parse(consentRaw) as { analytics?: boolean };
    if (parsed.analytics !== true) return;
  } catch {
    return;
  }

  await ga4Init();
}