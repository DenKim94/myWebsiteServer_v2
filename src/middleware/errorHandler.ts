import type { NextFunction, Request, Response } from 'express';
import { isDev } from '../config/env';
import { logger } from '../config/logger';

/**
 * Central Express error handler. Logs the error and returns a JSON response.
 * The `next` parameter is required so Express recognises this as an error
 * handler (4-arg signature).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled request error.', err);
  res.status(500).json({
    error: 'Internal Server Error',
    ...(isDev ? { detail: message } : {}),
  });
}
