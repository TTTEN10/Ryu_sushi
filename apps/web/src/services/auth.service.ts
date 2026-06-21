/**
 * Sole HTTP layer for wallet **session establishment** (`/wallet/connect`, `/wallet/verify`)
 * and cookie-backed session calls used by the React app (`/me`, `/logout`). Signing stays in
 * `WalletContext` / callers; this module performs exactly **one** `POST .../wallet/verify` per
 * successful login flow (`useWalletLogin`). Uses **`API_SESSION_CREDENTIALS`** so httpOnly
 * `walletSession` is set and sent.
 *
 * Default base: `apps/web/src/config/api.ts` (`/api/...` when `VITE_API_URL` unset, Vite proxy).
 */
import { API_SESSION_CREDENTIALS, apiUrl } from '../config/api';
import { ethers } from 'ethers';

export type WalletAuthHttpOptions = {
  /** Server origin only, e.g. `http://localhost:3001` (used by `SafePsyWeb3Client`). Omit for same-origin `apiUrl`. */
  apiBaseUrl?: string;
};

/** Path under `/api`, e.g. `/auth/me`. */
function walletAuthFetchUrl(pathUnderApi: string, options?: WalletAuthHttpOptions): string {
  const p = pathUnderApi.startsWith('/') ? pathUnderApi : `/${pathUnderApi}`;
  const override = options?.apiBaseUrl?.trim();
  if (!override) {
    return apiUrl(p);
  }
  const origin = override.replace(/\/$/, '').replace(/\/api$/, '');
  return `${origin}/api${p}`;
}

/** Matches API `walletSignature` schema: message + signature required; address/chainId optional (SIWE recovery). */
export type WalletVerifyPayload = {
  message: string;
  signature: string;
  address?: string;
  chainId?: number;
};

function walletConnectJsonBody(address: string, chainId: number): string {
  return JSON.stringify({ address, chainId });
}

function walletVerifyJsonBody(data: WalletVerifyPayload): string {
  const body: WalletVerifyPayload = {
    message: data.message,
    signature: data.signature,
  };
  if (data.address !== undefined) body.address = data.address;
  if (data.chainId !== undefined) body.chainId = data.chainId;
  return JSON.stringify(body);
}

function walletAuthLegacyHeaders(fields: {
  address?: string;
  chainId?: number;
  message?: string;
  signature?: string;
}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (fields.address) headers['x-wallet-address'] = fields.address;
  if (fields.chainId !== undefined) headers['x-chain-id'] = String(fields.chainId);
  // Skip message in header - SIWE messages contain newlines which are invalid in HTTP headers
  // The message is sent in the JSON body, which handles newlines correctly
  if (fields.signature) headers['x-wallet-signature'] = fields.signature;
  return headers;
}

export type WalletConnectResponse = {
  success: boolean;
  message?: string;
  data: {
    address: string;
    chainId: number;
    nonce: string;
    message: string;
  };
};

export type WalletVerifyResponse = {
  success: boolean;
  message?: string;
  data: {
    address: string;
    chainId: number;
    verified: boolean;
    token?: string;
  };
};

export type SessionMeResponse = {
  success: boolean;
  message?: string;
  data: {
    walletAddress: string;
    chainId: number;
    isVerified: boolean;
  };
};

export async function requestWalletMessage(
  address: string,
  chainId: number,
  options?: WalletAuthHttpOptions,
): Promise<string> {
  // Checksum the address (EIP-55) - API validation requires checksummed addresses
  const checksummedAddress = ethers.getAddress(address);
  const cacheKey = `POST:/auth/wallet/connect:${checksummedAddress}:${chainId}`;

  // Return existing in-flight request if available (deduplication)
  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    const result = await existing;
    return result.message as string;
  }

  const promise = (async () => {
    try {
      const response = await fetchWithRetry(walletAuthFetchUrl('/auth/wallet/connect', options), {
        method: 'POST',
        headers: walletAuthLegacyHeaders({ address: checksummedAddress, chainId }),
        credentials: API_SESSION_CREDENTIALS,
        body: walletConnectJsonBody(checksummedAddress, chainId),
      });

      if (!response.ok) {
        let msg = `Failed to request verification message (${response.status})`;
        try {
          const err = (await response.json()) as { message?: string };
          if (err.message) msg = err.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const json = (await response.json()) as WalletConnectResponse;
      if (!json.success) {
        throw new Error(json.message || 'Failed to request verification message');
      }
      return { message: json.data.message };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  const result = await promise;
  return result.message;
}

export async function verifyWalletSignature(
  data: WalletVerifyPayload,
  options?: WalletAuthHttpOptions,
): Promise<WalletVerifyResponse> {
  const response = await fetch(walletAuthFetchUrl('/auth/wallet/verify', options), {
    method: 'POST',
    headers: walletAuthLegacyHeaders({
      address: data.address,
      chainId: data.chainId,
      message: data.message,
      signature: data.signature,
    }),
    credentials: API_SESSION_CREDENTIALS,
    body: walletVerifyJsonBody(data),
  });

  if (!response.ok) {
    let msg = 'Wallet verification failed';
    try {
      const err = (await response.json()) as { message?: string };
      if (err.message) msg = err.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const json = (await response.json()) as WalletVerifyResponse;
  if (!json.success) {
    throw new Error(json.message || 'Wallet verification failed');
  }
  return json;
}

/** In-flight request tracking for deduplication */
const inFlightRequests = new Map<string, Promise<any>>();

/** Sleep helper */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on 429 rate limit errors.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited (429), wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfterMs = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
        console.warn(`Rate limited (${response.status}), retrying in ${retryAfterMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(retryAfterMs);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err as Error;
      // Network error - retry with backoff
      if (attempt < maxRetries) {
        const retryAfterMs = 1000 * Math.pow(2, attempt);
        console.warn(`Network error, retrying in ${retryAfterMs}ms...`, err);
        await sleep(retryAfterMs);
      }
    }
  }

  // All retries exhausted - throw last error or create one
  if (lastError) throw lastError;
  throw new Error('Request failed after retries');
}

/** Uses session cookie only — no Bearer token in JS (XSS-safe). */
export async function fetchWalletSession(): Promise<SessionMeResponse['data'] | null> {
  const cacheKey = 'GET:/auth/me';

  // Return existing in-flight request if available (deduplication)
  const existing = inFlightRequests.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const response = await fetchWithRetry(walletAuthFetchUrl('/auth/me'), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: API_SESSION_CREDENTIALS,
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Session validation failed');
      }

      const json = (await response.json()) as SessionMeResponse;
      if (!json.success || !json.data) {
        return null;
      }
      return json.data;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export async function logoutWalletSession(): Promise<void> {
  // Call backend logout (may return 401 if already logged out or token expired)
  const logoutUrl = walletAuthFetchUrl('/auth/logout');
  console.log('[auth.service] Calling logout:', logoutUrl);

  // First, call backend to clear HttpOnly cookie
  const response = await fetch(logoutUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Always include cookies for logout
  }).catch((err) => {
    // Ignore errors - backend might be unreachable or return 401
    // We'll clear cookies locally anyway
    console.warn('[auth.service] Logout fetch error (ignored):', err.message);
  });
  console.log('[auth.service] Logout response status:', response?.status);

  // Clear session cookie explicitly with multiple variations to ensure it's cleared
  const cookieClearDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const hostname = window.location.hostname;

  // Clear for root path
  document.cookie = `walletSession=; expires=${cookieClearDate}; path=/; SameSite=Lax`;

  // Clear for specific domain (both with and without www)
  if (hostname) {
    document.cookie = `walletSession=; expires=${cookieClearDate}; path=/; domain=${hostname}; SameSite=Lax`;
    // Also try clearing for localhost during dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      document.cookie = `walletSession=; expires=${cookieClearDate}; path=/; domain=localhost; SameSite=Lax`;
    }
  }

  // Log what we cleared for debugging
  console.log('[auth.service] Cleared walletSession cookie for path=/ and domain=', hostname);
}

export type DidCheckResponse = {
  success: boolean;
  message?: string;
  data: {
    hasDid: boolean;
    tokenId?: string | number | null;
  };
};

export async function postDidCheck(): Promise<DidCheckResponse | 'unauthorized'> {
  const response = await fetch(walletAuthFetchUrl('/did/check'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: API_SESSION_CREDENTIALS,
  });

  if (response.status === 401) {
    return 'unauthorized';
  }

  if (!response.ok) {
    let msg = 'Failed to check DID status';
    let isBackendConfigError = false;
    try {
      const err = (await response.json()) as { message?: string; error?: string };
      if (err.message) msg = err.message;
      else if (response.status === 503) {
        msg = 'DID service unavailable on server — backend configuration missing (RPC_URL, DID_REGISTRY_ADDRESS)';
        isBackendConfigError = true;
      }
    } catch {
      if (response.status === 503) {
        msg = 'DID service unavailable on server — backend configuration missing (RPC_URL, DID_REGISTRY_ADDRESS)';
        isBackendConfigError = true;
      }
    }
    const error: Error & { isBackendConfigError?: boolean } = new Error(msg);
    error.isBackendConfigError = isBackendConfigError;
    throw error;
  }

  return (await response.json()) as DidCheckResponse;
}
