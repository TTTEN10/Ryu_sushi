import { Request, Response, NextFunction } from 'express';

/**
 * Protects GET /metrics (Prometheus scrape endpoint).
 *
 * - Production: METRICS_SECRET must be set; requests must send
 *   `x-metrics-secret: <secret>` or `Authorization: Bearer <secret>`.
 * - Non-production: open when METRICS_SECRET is unset (local dev).
 */
export function requireMetricsAuth(req: Request, res: Response, next: NextFunction): void {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.METRICS_SECRET?.trim();

  if (!secret) {
    if (isProd) {
      res.status(503).send('Metrics endpoint not configured');
      return;
    }
    next();
    return;
  }

  const fromHeader =
    typeof req.headers['x-metrics-secret'] === 'string' ? req.headers['x-metrics-secret'] : undefined;
  const bearer =
    req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;

  if ((fromHeader || bearer) === secret) {
    next();
    return;
  }

  res.status(401).send('Unauthorized');
}
