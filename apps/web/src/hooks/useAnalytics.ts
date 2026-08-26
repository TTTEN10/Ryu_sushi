/**
 * React Analytics Hook
 *
 * Provides analytics functions and state for components.
 * Tracks visitor/session IDs, consent state, and exposes
 * the core SDK methods.
 */

import { useCallback, useState, useEffect } from 'react'
import { analytics, trackEvent, AnalyticsEventName } from '../lib/analytics'
import { hasAnalyticsConsent, optInAnalytics, optOutAnalytics, getConsent, type CookieConsent } from '../lib/analytics-consent'

// ============================================================================
// Types
// ============================================================================

export interface UseAnalyticsReturn {
  /** Track an analytics event */
  trackEvent: (eventName: AnalyticsEventName, metadata?: Record<string, unknown>) => Promise<void>
  /** Track landing visit */
  trackLandingVisit: () => Promise<void>
  /** Set wallet hash after connection */
  setWalletHash: (address: string) => Promise<void>
  /** Clear wallet hash on disconnect */
  clearWallet: () => void
  /** Enable analytics */
  enable: () => Promise<void>
  /** Disable analytics */
  disable: () => void
  /** Flush pending events */
  flush: () => Promise<void>
  /** Current visitor ID */
  visitorId: string
  /** Current session ID */
  sessionId: string
  /** Whether analytics is currently enabled */
  enabled: boolean
  /** Current consent state */
  consent: CookieConsent
  /** Opt-in to analytics */
  optIn: () => void
  /** Opt-out of analytics */
  optOut: () => void
  /** Whether analytics consent has been given */
  hasConsent: boolean
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalytics(): UseAnalyticsReturn {
  const [visitorId, setVisitorId] = useState<string>('')
  const [sessionId, setSessionId] = useState<string>('')
  const [consent, setConsent] = useState<CookieConsent>(getConsent())
  const [enabled, setEnabledState] = useState(analytics.isEnabled)

  // Update IDs on mount
  useEffect(() => {
    setVisitorId(analytics.getVisitorId())
    setSessionId(analytics.getSessionId())
  }, [])

  // Listen for consent changes
  useEffect(() => {
    const handleChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsent>
      setConsent(customEvent.detail)
    }
    window.addEventListener('cookieConsentChange', handleChange)
    return () => window.removeEventListener('cookieConsentChange', handleChange)
  }, [])

  const track = useCallback(async (eventName: AnalyticsEventName, metadata?: Record<string, unknown>) => {
    await trackEvent(eventName, metadata)
  }, [])

  const landingVisit = useCallback(async () => {
    await analytics.trackLandingVisit()
  }, [])

  const walletHash = useCallback(async (address: string) => {
    await analytics.setWalletAddress(address)
  }, [])

  const clearW = useCallback(() => {
    analytics.clearWallet()
  }, [])

  const enable = useCallback(async () => {
    await analytics.enable()
    setEnabledState(true)
  }, [])

  const disable = useCallback(() => {
    analytics.disable()
    setEnabledState(false)
  }, [])

  const flush = useCallback(async () => {
    await analytics.flush()
  }, [])

  const optIn = useCallback(() => {
    optInAnalytics()
  }, [])

  const optOut = useCallback(() => {
    optOutAnalytics()
  }, [])

  return {
    trackEvent: track,
    trackLandingVisit: landingVisit,
    setWalletHash: walletHash,
    clearWallet: clearW,
    enable,
    disable,
    flush,
    visitorId,
    sessionId,
    enabled,
    consent,
    optIn,
    optOut,
    hasConsent: hasAnalyticsConsent(),
  }
}

export default useAnalytics