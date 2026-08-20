// @ts-nocheck
import * as Sentry from '@sentry/react'

const APP_VERSION = __APP_VERSION__ ?? '0.0.0'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return

  Sentry.init({
    dsn,
    release: `safepsy-web@${APP_VERSION}`,
    environment: import.meta.env.DEV ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.15,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
    ignoreErrors: [
      // Known non-errors from third-party SDKs / browser
      'ResizeObserver loop limit exceeded',
    ],
  })
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return

  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setTag(k, v)
      }
    }
    Sentry.captureException(error)
  })
}

/** Structured production signal without throwing. */
export function captureMessage(
  message: string,
  context?: Record<string, string>,
  level: 'info' | 'warning' | 'error' = 'warning',
): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return

  Sentry.withScope((scope) => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setTag(k, v)
      }
    }
    Sentry.captureMessage(message, { level })
  })
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return

  Sentry.addBreadcrumb({ category, message, data, level: 'info' })
}