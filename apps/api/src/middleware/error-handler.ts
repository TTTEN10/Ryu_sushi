import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

/**
 * Global error handler middleware
 * Sanitizes error messages to prevent information leakage in production
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.id || 'unknown';
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log detailed error server-side only
  logger.error('Error occurred', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // Don't expose internal errors in production
  const errorMessage = isDevelopment
    ? err.message
    : 'An error occurred. Please try again.';

  // Determine status code
  let statusCode = 500;
  if ('status' in err && typeof err.status === 'number') {
    statusCode = err.status;
  } else if ('statusCode' in err && typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  }

  // Send sanitized error response
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: isDevelopment ? err.name : 'INTERNAL_ERROR',
    requestId, // Include request ID for support/debugging
  });
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

