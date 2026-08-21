import { useEffect, useState } from 'react'
import CookieBanner from './components/CookieBanner'
import CookieManager from './components/CookieManager'
import {
  ThemeProvider,
} from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider } from './contexts/AuthContext'
import { SubscriptionTerminalProvider } from './contexts/SubscriptionTerminalContext'
import { RouterProvider } from 'react-router-dom'
import { initializeAnalytics, hasConsentForCookieType } from './utils/cookieUtils'
import { flushProductMetricsToServer, recordLandingSession } from './utils/conversionMetrics'
import { analytics } from './lib/analytics'
import { ga4InitIfConsented, ga4Disable } from './lib/ga4'
import { initSentry } from './lib/sentry'

initSentry()

export default function App({ router }: { router: unknown }) {
  const [isCookieManagerOpen, setIsCookieManagerOpen] = useState(false)

  useEffect(() => {
    // Listen for open-cookie-manager events dispatched from subpages (e.g. /cookies).
    const handler = () => setIsCookieManagerOpen(true)
    window.addEventListener('open-cookie-manager', handler)
    return () => window.removeEventListener('open-cookie-manager', handler)
  }, [])

  useEffect(() => {
    // Only initialize analytics and fire tracking events after consent is given.
    // GA4 is properly gated in lib/ga4.ts (scripts injected only after consent).
    if (hasConsentForCookieType('analytics')) {
      initializeAnalytics()
      void recordLandingSession()
      void flushProductMetricsToServer()
      void ga4InitIfConsented()
      void analytics.trackLandingVisit()
    }
  }, [])

  const handleConsentChange = (preferences: {
    essential?: boolean
    functional?: boolean
    analytics?: boolean
  }) => {
    if (preferences.analytics) {
      initializeAnalytics()
      // recordLandingSession + flushProductMetricsToServer run inside updateConsent()

      // Enable analytics SDK
      analytics.enable()
      // Load GA4 scripts (idempotent)
      void ga4InitIfConsented()
    } else if (preferences.analytics === false) {
      // Disable analytics SDK
      analytics.disable()
      // Remove GA4 scripts to stop tracking
      ga4Disable()
    }
  }

  return (
    <ThemeProvider>
      <WalletProvider>
        <AuthProvider>
          <SubscriptionTerminalProvider>
            <RouterProvider router={router as any} />
          </SubscriptionTerminalProvider>
          {typeof window !== 'undefined' ? (
            <CookieBanner onConsentChange={handleConsentChange} />
          ) : null}

          <CookieManager isOpen={isCookieManagerOpen} onClose={() => setIsCookieManagerOpen(false)} />
        </AuthProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
