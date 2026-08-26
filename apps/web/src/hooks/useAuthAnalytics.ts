/**
 * Auth Flow Analytics Hook
 *
 * Tracks wallet connection, session establishment, and DID authentication.
 * Fires events in the correct order through the auth pipeline.
 */

import { useCallback } from 'react'
import { trackEvent } from '../lib/analytics'

// ============================================================================
// Types
// ============================================================================

export interface AuthAnalyticsEvents {
  walletClick: (provider?: string) => Promise<void>
  walletSuccess: (provider?: string) => Promise<void>
  walletFailure: (error?: string) => Promise<void>
  sessionSuccess: (method?: string) => Promise<void>
  didSuccess: (method?: string, walletLinked?: boolean) => Promise<void>
  didFailure: (error?: string) => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useAuthAnalytics(): AuthAnalyticsEvents {
  const walletClick = useCallback(async (provider?: string) => {
    await trackEvent('wallet_click', {
      wallet_provider: provider,
      attempt_count: 1,
    })
  }, [])

  const walletSuccess = useCallback(async (provider?: string) => {
    await trackEvent('wallet_success', {
      wallet_provider: provider,
    })
  }, [])

  const walletFailure = useCallback(async (error?: string) => {
    await trackEvent('wallet_click', {
      error_code: error || 'wallet_connection_failed',
      attempt_count: -1, // Sentinel value indicating failure
    })
  }, [])

  const sessionSuccess = useCallback(async (method?: string) => {
    await trackEvent('session_success', {
      auth_method: method ?? 'wallet_signature',
    })
  }, [])

  const didSuccess = useCallback(async (method?: string, walletLinked?: boolean) => {
    await trackEvent('did_success', {
      did_method: method,
      wallet_linked: walletLinked,
    })
  }, [])

  const didFailure = useCallback(async (error?: string) => {
    await trackEvent('did_success', {
      error_code: error || 'did_authentication_failed',
    })
  }, [])

  return {
    walletClick,
    walletSuccess,
    walletFailure,
    sessionSuccess,
    didSuccess,
    didFailure,
  }
}

export default useAuthAnalytics