import type { Request, Response } from 'express';

/**
 * Liveness/health endpoint.
 * @route GET /api/health
 */
export function getHealth(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}
