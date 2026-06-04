import { describe, it, expect } from 'vitest';

import { resolveApiBaseUrlForOrigin } from '../../config/api';

describe('resolveApiBaseUrlForOrigin', () => {
  it('returns /api when VITE_API_URL is unset', () => {
    expect(resolveApiBaseUrlForOrigin(undefined, 'http://localhost:5173')).toBe('/api');
  });

  it('uses same-origin /api when configured host differs from the page (dev proxy)', () => {
    expect(
      resolveApiBaseUrlForOrigin('http://localhost:3001', 'http://localhost:5173'),
    ).toBe('/api');
  });

  it('uses same-origin /api for www vs apex mismatch', () => {
    expect(
      resolveApiBaseUrlForOrigin(
        'https://polinapsycho.com',
        'https://www.polinapsycho.com',
      ),
    ).toBe('/api');
  });

  it('keeps configured base when page origin matches', () => {
    expect(
      resolveApiBaseUrlForOrigin(
        'https://polinapsycho.com',
        'https://polinapsycho.com',
      ),
    ).toBe('https://polinapsycho.com/api');
  });

  it('appends /api when configured value is an origin only', () => {
    expect(
      resolveApiBaseUrlForOrigin('http://localhost:3001', 'http://localhost:3001'),
    ).toBe('http://localhost:3001/api');
  });
});
