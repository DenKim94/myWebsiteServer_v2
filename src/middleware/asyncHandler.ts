import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so that rejected promises are forwarded to the
 * central error handler instead of crashing the process.
 * @param handler Async Express request handler.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
