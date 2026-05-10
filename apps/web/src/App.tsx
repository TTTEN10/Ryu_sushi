import { useEffect } from 'react'
import CookieBanner from './components/CookieBanner'
import { ThemeProvider } from './contexts/ThemeContext'
import { WalletProvider } from './contexts/WalletContext'
import { AuthProvider } from './contexts/AuthContext'
import { RouterProvider } from 'react-router-dom'
import { initializeAnalytics } from './utils/cookieUtils'
import { flushProductMetricsToServer, recordLandingSession } from './utils/conversionMetrics'

export default function App({ router }: { router: unknown }) {
  useEffect(() => {
    initializeAnalytics()
    recordLandingSession()
    void flushProductMetricsToServer()
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
