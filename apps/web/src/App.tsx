import { useEffect } from 'react'
import CookieBanner from './components/CookieBanner'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider } from './contexts/AuthContext'
import { RouterProvider } from 'react-router-dom'
import { initializeAnalytics } from './utils/cookieUtils'
import { flushProductMetricsToServer, recordLandingSession } from './utils/conversionMetrics'
import { analytics } from './lib/analytics'

export default function App({ router }: { router: unknown }) {
  useEffect(() => {
    initializeAnalytics()
    recordLandingSession()
    void flushProductMetricsToServer()

    // Track landing visit in new analytics system
    void analytics.trackLandingVisit()
  }, [])

  const handleConsentChange = (preferences: {
    essential?: boolean
    functional?: boolean
    analytics?: boolean
  }) => {
    console.log('Cookie consent updated:', preferences)

    if (preferences.analytics) {
      initializeAnalytics()
      // recordLandingSession + flushProductMetricsToServer run inside updateConsent()

      // Enable analytics SDK
      analytics.enable()
    } else if (preferences.analytics === false) {
      // Disable analytics SDK
      analytics.disable()
    }
  }

  return (
    <ThemeProvider>
      <WalletProvider>
        <AuthProvider>
          <RouterProvider router={router as any} />

          {typeof window !== 'undefined' ? (
            <CookieBanner onConsentChange={handleConsentChange} />
          ) : null}
        </AuthProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
