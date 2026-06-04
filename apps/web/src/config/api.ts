function trimTrailingSlash(s: string): string {
  return s.replace(/\/$/, '')
}

function configuredApiOrigin(raw: string): string | null {
  try {
    const withScheme = raw.startsWith('http') ? raw : `https://${raw.replace(/^\/\//, '')}`
    return new URL(withScheme).origin
  } catch {
    return null
  }
}

function normalizeConfiguredApiBase(raw: string): string {
  const normalized = trimTrailingSlash(raw)
  if (normalized.endsWith('/api')) return normalized
  return `${normalized}/api`
}

/**
 * Resolve API base for a page origin. When the configured API host differs from the page
 * (e.g. build has apex URL but user is on www, or VITE_API_URL points at :3001 while Vite
 * serves :5173), use same-origin `/api` so Caddy/Vite proxy handles routing.
 */
export function resolveApiBaseUrlForOrigin(
  viteApiUrl: string | undefined,
  pageOrigin: string | undefined,
): string {
  const raw = viteApiUrl?.trim()
  if (!raw) return '/api'

  if (pageOrigin) {
    const configuredOrigin = configuredApiOrigin(raw)
    if (!configuredOrigin || configuredOrigin !== pageOrigin) {
      return '/api'
    }
  }

  return normalizeConfiguredApiBase(raw)
}

/**
 * Returns the base URL for API calls.
 *
 * Preferred setup:
 * - Use same-origin `/api` and rely on the dev proxy in Vite (or Caddy in production).
 *
 * Override options:
 * - `VITE_API_URL` can be either:
 *   - a full API base including `/api` (e.g. `https://polinapsycho.com/api`)
 *   - a server origin (e.g. `http://localhost:3001`) in which case `/api` is appended
 * - In the browser, if `VITE_API_URL` host does not match `window.location.origin`, `/api` is used instead.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : undefined
  return resolveApiBaseUrlForOrigin(raw, pageOrigin)
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Web session auth: httpOnly `walletSession` cookie (no Bearer in JS). */
export const API_SESSION_CREDENTIALS = 'include' as const

/**
 * Fetch against the API with session cookies. Use for all authenticated `/api/*` routes.
 * Mobile (`safepsy-mobile`) uses Bearer from SecureStore instead.
 */
export async function apiFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const url =
    pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : apiUrl(pathOrUrl)
  return fetch(url, {
    credentials: API_SESSION_CREDENTIALS,
    ...init,
  })
}

/**
 * URLs for routes mounted on the API app root (not under `/api`), e.g. `/healthz`, `/readyz`.
 * When `VITE_API_URL` is unset, returns a same-origin path; Vite must proxy these to the API.
 */
export function apiServerUrl(path: string): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  const p = path.startsWith('/') ? path : `/${path}`
  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : undefined

  if (!raw) return p

  if (pageOrigin) {
    const configuredOrigin = configuredApiOrigin(raw)
    if (!configuredOrigin || configuredOrigin !== pageOrigin) {
      return p
    }
  }

  const normalized = trimTrailingSlash(raw)
  const origin = normalized.endsWith('/api') ? trimTrailingSlash(normalized.slice(0, -4)) : normalized
  return `${origin}${p}`
}

