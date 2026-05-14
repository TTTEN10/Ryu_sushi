/**
 * Sole HTTP layer for wallet **session establishment** (`/wallet/connect`, `/wallet/verify`)
 * and cookie-backed session calls used by the React app (`/me`, `/logout`). Signing stays in
 * `WalletContext` / callers; this module performs exactly **one** `POST .../wallet/verify` per
 * successful login flow (`useWalletLogin`). Always use **`credentials: 'include'`** so httpOnly
 * `walletSession` is set and sent.
 *
 * Default base: `apps/web/src/config/api.ts` (`/api/...` when `VITE_API_URL` unset, Vite proxy).
 */
import { apiUrl } from '../config/api';

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

export type WalletVerifyPayload = {
  address: string;
  message: string;
  signature: string;
  chainId: number;
};

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
  const response = await fetch(walletAuthFetchUrl('/auth/wallet/connect', options), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': address,
      'x-chain-id': String(chainId),
    },
    credentials: 'include',
    body: JSON.stringify({ address, chainId }),
  });

  if (!response.ok) {
    throw new Error('Failed to request verification message');
  }

  const json = (await response.json()) as WalletConnectResponse;
  if (!json.success) {
    throw new Error(json.message || 'Failed to request verification message');
  }
  return json.data.message;
}

export async function verifyWalletSignature(
  data: WalletVerifyPayload,
  options?: WalletAuthHttpOptions,
): Promise<WalletVerifyResponse> {
  const response = await fetch(walletAuthFetchUrl('/auth/wallet/verify', options), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': data.address,
      'x-chain-id': String(data.chainId),
      'x-wallet-message': data.message,
      'x-wallet-signature': data.signature,
    },
    credentials: 'include',
    body: JSON.stringify(data),
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

/** Uses session cookie only — no Bearer token in JS (XSS-safe). */
export async function fetchWalletSession(): Promise<SessionMeResponse['data'] | null> {
  const response = await fetch(walletAuthFetchUrl('/auth/me'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
}

export async function logoutWalletSession(): Promise<void> {
  await fetch(walletAuthFetchUrl('/auth/logout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
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
    credentials: 'include',
  });

  if (response.status === 401) {
    return 'unauthorized';
  }

  if (!response.ok) {
    throw new Error('Failed to check DID status');
  }

  return (await response.json()) as DidCheckResponse;
}
