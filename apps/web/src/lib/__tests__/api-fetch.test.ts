import { describe, it, expect, vi, afterEach } from 'vitest';

import { apiFetch, API_SESSION_CREDENTIALS } from '../../config/api';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults credentials to include for relative API paths', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/chat/load', { method: 'GET' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/chat/load');
    expect(init.credentials).toBe(API_SESSION_CREDENTIALS);
    expect(init.method).toBe('GET');
  });

  it('allows credentials override for public endpoints', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/payment/pricing', { credentials: 'same-origin' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('same-origin');
  });
});
