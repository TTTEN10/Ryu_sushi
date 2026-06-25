/**
 * CORS / SIWE allowed origin list (must match app.ts CORS configuration).
 */
export function getAllowedOrigins(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const raw = (process.env.FRONTEND_URL || '').trim();
  const defaults = isProd
    ? ['https://polinapsycho.com', 'https://www.polinapsycho.com']
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ];

  return raw
    ? raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : defaults;
}

export function isAllowedOrigin(origin: string): boolean {
  return getAllowedOrigins().includes(origin);
}
