/**
 * Utility functions for cookie management and consent validation
 */

import { CookiePreferences } from '../hooks/useCookieConsent'

/**
 * Check if user has consented to a specific cookie type
 */
export const hasConsentForCookieType = (cookieType: keyof CookiePreferences): boolean => {
  const consent = localStorage.getItem('cookieConsent')
  if (!consent) return false
  
  try {
    const preferences = JSON.parse(consent)
    return preferences[cookieType] === true
  } catch (error) {
    console.error('Error parsing cookie consent:', error)
    return false
  }
}

/**
 * Initialize analytics only if user has given consent
 */
export const initializeAnalytics = () => {
  if (!hasConsentForCookieType('analytics')) {
    return false
  }

  // GA4 is initialised in lib/ga4.ts via ga4InitIfConsented()
  return true
}

/**
 * Initialize functional features based on consent
 */
export const initializeFunctionalFeatures = () => {
  if (!hasConsentForCookieType('functional')) {
    return false
  }

  // Example: Load user preferences, themes, etc.
  // const savedTheme = localStorage.getItem('theme')
  // if (savedTheme) {
  //   applyTheme(savedTheme)
  // }

  return true
}

/**
 * Clear all non-essential cookies when consent is withdrawn
 */
export const clearNonEssentialCookies = () => {
  const cookiesToRemove = [
    'functional_cookies',
    'analytics_cookies',
    'sp_product_metrics',
    'theme_preference',
    'language_preference',
    // Add other non-essential cookies here
  ]

  cookiesToRemove.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  })
}

/**
 * Get cookie consent summary for debugging
 */
export const getCookieConsentSummary = () => {
  const consent = localStorage.getItem('cookieConsent')
  const consentDate = localStorage.getItem('cookieConsentDate')
  
  if (!consent) {
    return {
      hasConsented: false,
      preferences: null,
      consentDate: null
    }
  }

  try {
    const preferences = JSON.parse(consent)
    return {
      hasConsented: true,
      preferences,
      consentDate: consentDate ? new Date(consentDate) : null
    }
  } catch (error) {
    console.error('Error parsing cookie consent:', error)
    return {
      hasConsented: false,
      preferences: null,
      consentDate: null
    }
  }
}

/**
 * Check if consent is still valid (not expired)
 */
export const isConsentValid = (maxAgeInDays: number = 365): boolean => {
  const consentDate = localStorage.getItem('cookieConsentDate')
  if (!consentDate) return false

  try {
    const date = new Date(consentDate)
    const now = new Date()
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    
    return (now.getTime() - date.getTime()) < maxAge
  } catch (error) {
    console.error('Error validating consent date:', error)
    return false
  }
}

/**
 * Conditional feature loading based on consent
 */
export const withConsentCheck = <T>(
  cookieType: keyof CookiePreferences,
  _featureName: string,
  initializeFunction: () => T
): T | null => {
  if (hasConsentForCookieType(cookieType)) {
    return initializeFunction()
  }
  return null
}
