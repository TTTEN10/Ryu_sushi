import { useState, useEffect, useCallback } from 'react'
import {
  clearProductMetricsCookie,
  flushProductMetricsToServer,
  recordLandingSession,
} from '../utils/conversionMetrics'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../config/api'

export interface CookiePreferences {
  essential: boolean
  functional: boolean
  analytics: boolean
  healthData: boolean
}

export interface CookieConsentData {
  preferences: CookiePreferences
  consentDate: string | null
  hasConsented: boolean
}

interface BackendConsentStatus {
  status: string
  version: string
  updatedAt: string | null
}

interface BackendConsentRecord {
  id: string
  consentType: string
  consentVersion: string
  status: string
  source: string
  createdAt: string
  withdrawnAt: string | null
}

interface BackendConsentResponse {
  success: boolean
  data: {
    currentVersion: string
    consentStatus: {
      healthDataProcessing: BackendConsentStatus
      analytics: BackendConsentStatus
      marketing: BackendConsentStatus
    }
    records: BackendConsentRecord[]
    reConsentNeeded: boolean
  }
}

type ConsentSyncState = 'idle' | 'loading' | 'synced' | 'error'

export const useCookieConsent = () => {
  const { authState, isAuthenticated } = useAuth()
  const [syncState, setSyncState] = useState<ConsentSyncState>('idle')
  const [consentData, setConsentData] = useState<CookieConsentData>({
    preferences: {
      essential: true,
      functional: false,
      analytics: false,
      healthData: false
    },
    consentDate: null,
    hasConsented: false
  })
  const [reConsentNeeded, setReConsentNeeded] = useState(false)

  // Load consent data from localStorage on mount
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookieConsent')
    const savedDate = localStorage.getItem('cookieConsentDate')
    
    if (savedConsent) {
      try {
        const preferences = JSON.parse(savedConsent)
        setConsentData({
          preferences,
          consentDate: savedDate,
          hasConsented: true
        })
      } catch (error) {
        console.error('Error parsing cookie consent data:', error)
        localStorage.removeItem('cookieConsent')
        localStorage.removeItem('cookieConsentDate')
      }
    }
  }, [])

  // Sync consent status from backend when authenticated
  const syncConsentFromBackend = useCallback(async () => {
    if (!isAuthenticated || !authState.walletAddress) {
      return
    }

    setSyncState('loading')
    try {
      const response = await apiFetch('/consent/status')
      
      if (!response.ok) {
        if (response.status === 401) {
          setSyncState('error')
          return
        }
        throw new Error('Failed to fetch consent status')
      }

      const data = (await response.json()) as BackendConsentResponse
      
      if (!data.success) {
        throw new Error('Failed to get consent status')
      }

      const status = data.data.consentStatus
      setReConsentNeeded(data.data.reConsentNeeded)

      // Update local preferences to match backend
      const preferences: CookiePreferences = {
        essential: true,
        functional: true, // Functional is always enabled when consent is recorded
        analytics: status.analytics?.status === 'GRANTED',
        healthData: status.healthDataProcessing?.status === 'GRANTED',
      }

      setConsentData({
        preferences,
        consentDate: status.healthDataProcessing?.updatedAt,
        hasConsented: true
      })
      setSyncState('synced')

      applyCookieSettings(preferences)
    } catch (error) {
      console.error('Failed to sync consent from backend:', error)
      setSyncState('error')
    }
  }, [isAuthenticated, authState.walletAddress])

  // Sync on mount if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncConsentFromBackend()
    }
  }, [isAuthenticated, syncConsentFromBackend])

  const updateConsent = async (preferences: CookiePreferences) => {
    const consentDate = new Date().toISOString()
    
    // Save to localStorage (fallback)
    localStorage.setItem('cookieConsent', JSON.stringify(preferences))
    localStorage.setItem('cookieConsentDate', consentDate)
    
    // Update state
    setConsentData({
      preferences,
      consentDate,
      hasConsented: true
    })

    // Apply cookie settings
    applyCookieSettings(preferences)

    if (preferences.analytics) {
      recordLandingSession()
      void flushProductMetricsToServer()
    }

    // Record in backend if authenticated
    if (isAuthenticated) {
      // Record health data processing consent
      if (preferences.healthData) {
        try {
          await apiFetch('/consent/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consentType: 'HEALTH_DATA_PROCESSING',
              source: 'WEB_COOKIE_BANNER',
            }),
          })
        } catch (err) {
          console.error('Failed to record health data consent:', err)
        }
      }

      // Record analytics consent
      if (preferences.analytics) {
        try {
          await apiFetch('/consent/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              consentType: 'ANALYTICS',
              source: 'WEB_COOKIE_BANNER',
            }),
          })
        } catch (err) {
          console.error('Failed to record analytics consent:', err)
        }
      }

      // Refresh backend status
      syncConsentFromBackend()
    }
  }

  const withdrawConsent = async () => {
    // Update local state
    const preferences: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      healthData: false
    }

    localStorage.removeItem('cookieConsent')
    localStorage.removeItem('cookieConsentDate')
    
    // Remove non-essential cookies
    document.cookie = "functional_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "analytics_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    clearProductMetricsCookie()
    
    setConsentData({
      preferences,
      consentDate: null,
      hasConsented: false
    })

    applyCookieSettings(preferences)

    // Withdraw in backend if authenticated
    if (isAuthenticated) {
      try {
        await apiFetch('/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType: 'HEALTH_DATA_PROCESSING' }),
        })
        await apiFetch('/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType: 'ANALYTICS' }),
        })
      } catch (err) {
        console.error('Failed to withdraw consent:', err)
      }
    }
  }

  const clearConsent = async () => {
    await withdrawConsent()
  }

  const hasConsentFor = (cookieType: keyof CookiePreferences): boolean => {
    return consentData.preferences[cookieType]
  }

  return {
    consentData,
    updateConsent,
    clearConsent,
    withdrawConsent,
    hasConsentFor,
    syncState,
    syncConsentFromBackend,
    reConsentNeeded,
    isAuthenticated,
  }
}

// Utility functions for cookie management
export const applyCookieSettings = (preferences: CookiePreferences) => {
  // Set functional cookies if consented
  if (preferences.functional) {
    document.cookie = "functional_cookies=true; path=/; max-age=31536000; SameSite=Strict; Secure"
  } else {
    document.cookie = "functional_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  }

  // Set analytics cookies if consented
  if (preferences.analytics) {
    document.cookie = "analytics_cookies=true; path=/; max-age=63072000; SameSite=Strict; Secure"
  } else {
    document.cookie = "analytics_cookies=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    clearProductMetricsCookie()
  }
}

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }
  return null
}

export const setCookie = (name: string, value: string, options: {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
} = {}): void => {
  let cookieString = `${name}=${value}`
  
  if (options.maxAge !== undefined) {
    cookieString += `; max-age=${options.maxAge}`
  }
  
  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`
  }
  
  if (options.path) {
    cookieString += `; path=${options.path}`
  }
  
  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }
  
  if (options.secure) {
    cookieString += `; secure`
  }
  
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }
  
  document.cookie = cookieString
}

export const deleteCookie = (name: string, path: string = '/'): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path};`
}