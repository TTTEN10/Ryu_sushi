import React, { useState, useEffect } from 'react'
import { Cookie, Settings, CheckCircle, Shield, HeartPulse, ExternalLink } from 'lucide-react'
import { useCookieConsent, CookiePreferences } from '../hooks/useCookieConsent'

interface CookieBannerProps {
  onConsentChange?: (preferences: CookiePreferences) => void
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onConsentChange }) => {
  const [isVisible, setIsVisible] = useState(() => {
    const savedConsent = localStorage.getItem('cookieConsent')
    return !savedConsent
  })

  const [showCustomize, setShowCustomize] = useState(false)
  const [consentCookies, setConsentCookies] = useState(false)
  const [consentHealthData, setConsentHealthData] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
    healthData: false
  })

  const { consentData, updateConsent } = useCookieConsent()

  // Sync with existing consent data
  useEffect(() => {
    if (consentData.hasConsented) {
      setIsVisible(false)
      setPreferences(consentData.preferences)
    } else {
      setIsVisible(true)
    }
  }, [consentData])

  const canProceed = consentHealthData // Health data consent is mandatory

  const saveConsent = (extraPrefs: Partial<CookiePreferences> = {}) => {
    const finalConsent: CookiePreferences = {
      essential: true,
      functional: extraPrefs.functional ?? preferences.functional,
      analytics: extraPrefs.analytics ?? preferences.analytics,
      healthData: consentHealthData
    }
    updateConsent(finalConsent)
    setIsVisible(false)
    setShowCustomize(false)
    if (onConsentChange) {
      onConsentChange(finalConsent)
    }
  }

  const handleAgree = () => {
    if (!canProceed) return
    saveConsent({
      functional: consentCookies,
      analytics: consentCookies
    })
  }

  const handleSaveCustomize = () => {
    if (!canProceed) return
    saveConsent(preferences)
  }

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'essential') return
    setPreferences(prev => ({ ...prev, [type]: value }))
  }

  if (!isVisible) return null

  // ─── Main banner view ───
  if (!showCustomize) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white border-t border-neutral-200 dark:bg-neutral-950 dark:border-white/10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center border border-primary-200 dark:bg-primary-900/30 dark:border-primary-700 flex-shrink-0">
                <Cookie className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-heading mb-2">
                  We respect your privacy
                </h3>
                <p className="text-sm sm:text-base text-body leading-relaxed">
                  We use essential cookies to make our site work. By agreeing, you also consent to optional cookies and to the processing of your health data for AI-powered reflection responses.
                </p>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              {/* Cookie consent checkbox */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={consentCookies}
                  onChange={(e) => setConsentCookies(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-heading">Cookies</span>
                  <span className="block text-xs text-body mt-0.5">
                    Optional cookies to improve your experience (functional &amp; analytics).
                  </span>
                </div>
              </label>

              {/* Health data consent checkbox (mandatory) */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <input
                  type="checkbox"
                  checked={consentHealthData}
                  onChange={(e) => setConsentHealthData(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-neutral-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-heading flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-red-500" />
                    Health Data Processing (GDPR Art. 9)
                  </span>
                  <span className="block text-xs text-body mt-0.5">
                    I expressly consent to the processing of health-related information I voluntarily provide, solely for generating AI-powered reflection responses.{' '}
                    <a
                      href="/sap-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300 font-medium inline-flex items-center gap-0.5"
                    >
                      Read the full policy
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                  {!canProceed && (
                    <span className="block text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                      Required to use this platform
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
              <button
                onClick={() => setShowCustomize(true)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200 min-h-[44px] text-sm sm:text-base"
              >
                <div className="flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Customize</span>
                </div>
              </button>
              <button
                onClick={handleAgree}
                disabled={!canProceed}
                className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 min-h-[44px] text-sm sm:text-base ${
                  canProceed
                    ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-neutral-300 dark:bg-gray-700 text-neutral-500 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                Agree
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Customize view ───
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white border-t border-neutral-200 dark:bg-neutral-950 dark:border-white/10 max-h-[85vh] overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header with back */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl sm:text-2xl font-semibold text-heading">
              Cookie Preferences
            </h3>
            <button
              onClick={() => setShowCustomize(false)}
              className="px-3 py-1.5 text-sm text-neutral-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors min-h-[44px] flex items-center"
            >
              ← Back
            </button>
          </div>

          <div className="space-y-4">

            {/* Essential Cookies */}
            <div className="border border-green-200 rounded-xl p-4 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-heading">Essential Cookies</h4>
                    <p className="text-sm text-body">Required for the website to function properly. Cannot be disabled.</p>
                  </div>
                </div>
                <div className="w-12 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-green-600 dark:bg-green-400 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-heading">Functional Cookies</h4>
                    <p className="text-sm text-body">Remember your preferences and improve your experience.</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreferenceChange('functional', !preferences.functional)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ${
                    preferences.functional ? 'bg-primary-600 justify-end' : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300"></div>
                </button>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-heading">Analytics Cookies</h4>
                    <p className="text-sm text-body">Lets us store anonymous milestone timestamps (landing, wallet funnel, first chat message and reply, return within 24h) in a first-party cookie — never message content or wallet addresses.</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePreferenceChange('analytics', !preferences.analytics)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ${
                    preferences.analytics ? 'bg-primary-600 justify-end' : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300"></div>
                </button>
              </div>
            </div>

            {/* Health Data Consent (GDPR Art. 9) — MANDATORY in customize */}
            <div className="border-2 border-red-300 dark:border-red-800 rounded-xl p-4 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <HeartPulse className="w-5 h-5 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-heading flex items-center gap-1.5">
                      Health Data Processing (GDPR Art. 9)
                    </h4>
                    <p className="text-sm text-body mt-0.5">
                      Explicit consent to process health-related information you voluntarily provide for AI-powered reflection responses only.{' '}
                      <a
                        href="/sap-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 underline hover:text-primary-700 dark:hover:text-primary-300 font-medium inline-flex items-center gap-0.5"
                      >
                        Read the full policy
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                    {!canProceed && (
                      <span className="block text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                        Required to use this platform
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setConsentHealthData(!consentHealthData)}
                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ${
                    consentHealthData ? 'bg-red-600 justify-end' : 'bg-neutral-300 dark:bg-gray-600 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 transition-transform duration-300"></div>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-neutral-200 dark:border-gray-600">
            <button
              onClick={() => {
                if (!canProceed) return
                saveConsent({ functional: false, analytics: false })
              }}
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all duration-200 min-h-[44px] text-sm sm:text-base"
            >
              Essential only
            </button>
            <button
              onClick={handleSaveCustomize}
              disabled={!canProceed}
              className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 min-h-[44px] text-sm sm:text-base ${
                canProceed
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-neutral-300 dark:bg-gray-700 text-neutral-500 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              Save preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner