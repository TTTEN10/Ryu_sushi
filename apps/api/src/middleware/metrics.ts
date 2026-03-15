import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '../lib/metrics';

/**
 * Middleware to track HTTP request metrics for Prometheus
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path || 'unknown';
  const method = req.method;

  // Override res.end to capture response status
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const status = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status }, duration);
    httpRequestsTotal.inc({ method, route, status });

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

