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
  const response = await fetch(walletAuthFetchUrl('/auth/wallet/connect', options), {
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
  return json.data.message;
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

/** Uses session cookie only — no Bearer token in JS (XSS-safe). */
export async function fetchWalletSession(): Promise<SessionMeResponse['data'] | null> {
  const response = await fetch(walletAuthFetchUrl('/auth/me'), {
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
}

export async function logoutWalletSession(): Promise<void> {
  // Call backend logout (may return 401 if already logged out or token expired)
  const logoutUrl = walletAuthFetchUrl('/auth/logout');
  console.log('[auth.service] Calling logout:', logoutUrl);
  const response = await fetch(logoutUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: API_SESSION_CREDENTIALS,
  }).catch((err) => {
    // Ignore errors - backend might be unreachable or return 401
    // We'll clear cookies locally anyway
    console.warn('[auth.service] Logout fetch error (ignored):', err.message);
  });
  console.log('[auth.service] Logout response status:', response?.status);
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
