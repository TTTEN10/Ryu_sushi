function trimTrailingSlash(s: string): string {
  return s.replace(/\/$/, '')
}

/**
 * Returns the base URL for API calls.
 *
 * Preferred setup:
 * - Use same-origin `/api` and rely on the dev proxy in Vite.
 *
 * Override options:
 * - `VITE_API_URL` can be either:
 *   - a full API base including `/api` (e.g. `https://polinapsycho.com/api`)
 *   - a server origin (e.g. `http://localhost:3001`) in which case `/api` is appended
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (!raw) return '/api'

  const normalized = trimTrailingSlash(raw)
  if (normalized.endsWith('/api')) return normalized
  return `${normalized}/api`
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
  if (!raw) return p

  const normalized = trimTrailingSlash(raw)
  const origin = normalized.endsWith('/api') ? trimTrailingSlash(normalized.slice(0, -4)) : normalized
  return `${origin}${p}`
}

