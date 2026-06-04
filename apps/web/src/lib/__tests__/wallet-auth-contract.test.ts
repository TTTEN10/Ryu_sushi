import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  requestWalletMessage,
  verifyWalletSignature,
} from '../../services/auth.service';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

/**
 * Regression guard: wallet payloads expected by apps/api (Joi + middleware).
 * `auth.service` must keep POST bodies aligned with the API contract.
 */
describe('wallet auth HTTP contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requestWalletMessage POST body includes address and chainId (mocked fetch)', async () => {
    const address = '0x1234567890123456789012345678901234567890';
    const chainId = 11155111;
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: {
          address,
          chainId,
          nonce: '0x' + 'ab'.repeat(32),
          message: 'mock siwe',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const message = await requestWalletMessage(address, chainId);
    expect(message).toBe('mock siwe');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/wallet/connect');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.address).toBe(address);
    expect(body.chainId).toBe(chainId);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-wallet-address']).toBe(address);
    expect(headers['x-chain-id']).toBe(String(chainId));
  });

  it('verifyWalletSignature POST body includes address, message, signature, chainId (mocked fetch)', async () => {
    const payload = {
      address: '0x1234567890123456789012345678901234567890',
      message: 'SafePsy Wallet Verification\n\nAddress: 0x...\nNonce: 0x...\n',
      signature: `0x${'a'.repeat(130)}`,
      chainId: 11155111,
    };
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: {
          address: payload.address,
          chainId: payload.chainId,
          verified: true,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await verifyWalletSignature(payload);
    expect(out.success).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/wallet/verify');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.address).toBe(payload.address);
    expect(body.message).toBe(payload.message);
    expect(body.signature).toBe(payload.signature);
    expect(body.chainId).toBe(payload.chainId);
  });

  it('verifyWalletSignature omits optional address and chainId when not provided', async () => {
    const message = 'SafePsy Wallet Verification\n\nAddress: 0x...\nNonce: 0x...\n';
    const signature = `0x${'b'.repeat(130)}`;
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        success: true,
        data: { address: '0x1234567890123456789012345678901234567890', chainId: 11155111, verified: true },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await verifyWalletSignature({ message, signature });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.message).toBe(message);
    expect(body.signature).toBe(signature);
    expect(body).not.toHaveProperty('address');
    expect(body).not.toHaveProperty('chainId');
    const headers = init.headers as Record<string, string>;
    // Message is sent in JSON body only (not in header) because SIWE messages contain newlines
    // which are invalid in HTTP headers. Signature header is still sent for backward compatibility.
    expect(headers['x-wallet-signature']).toBe(signature);
    expect(headers['x-wallet-message']).toBeUndefined();
    expect(headers['x-wallet-address']).toBeUndefined();
    expect(headers['x-chain-id']).toBeUndefined();
  });
});
