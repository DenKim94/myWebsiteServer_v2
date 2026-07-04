import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Request, Response } from 'express';
import { IMAGE_DIRS } from '../data/paths';

/** Cache lifetime for images sent to the client (6 hours, immutable). */
const IMAGE_MAX_AGE_SECONDS = 60 * 60 * 6;

/**
 * Serves an image/icon from the data directory by file name. Includes
 * protection against path traversal and sets long-lived cache headers so the
 * client can cache the binary (see architecture requirement: image caching).
 *
 * @route GET /api/images/:name
 */
export function getImage(req: Request, res: Response): void {
  const requested = req.params.name;

  // Reject any attempt at path traversal or nested paths.
  if (!requested || requested.includes('/') || requested.includes('\\') || requested.includes('..')) {
    res.status(400).json({ error: 'Invalid image name.' });
    return;
  }

  for (const dir of IMAGE_DIRS) {
    const candidate = path.join(dir, requested);
    // Ensure the resolved path stays inside the allowed directory.
    if (!candidate.startsWith(path.resolve(dir))) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      res.setHeader('Cache-Control', `public, max-age=${IMAGE_MAX_AGE_SECONDS}, immutable`);
      res.sendFile(candidate);
      return;
    }
  }

  res.status(404).json({ error: `Image "${requested}" not found.` });
}
