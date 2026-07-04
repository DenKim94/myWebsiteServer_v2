import * as fs from 'node:fs';
import * as path from 'node:path';
import { env } from '../config/env';
import { logger } from '../config/logger';

/** Absolute path to the server project root (two levels above this file). */
const SERVER_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Resolves the data directory that holds `database.json` and image folders.
 *
 * Resolution order:
 *   1. `DATA_DIR` environment variable (if set)
 *   2. `../harness/assets` relative to the server root (local development)
 *   3. `./data` inside the server (ships with `database.example.json`)
 *
 * @returns Absolute path to the resolved data directory.
 */
export function resolveDataDir(): string {
  if (env.dataDir) {
    return path.isAbsolute(env.dataDir)
      ? env.dataDir
      : path.resolve(SERVER_ROOT, env.dataDir);
  }

  const candidates = [
    path.resolve(SERVER_ROOT, '..', 'harness', 'assets'),
    path.resolve(SERVER_ROOT, 'data'),
  ];

  for (const candidate of candidates) {
    const hasRealDb = fs.existsSync(path.join(candidate, 'database.json'));
    const hasExampleDb = fs.existsSync(path.join(candidate, 'database.example.json'));
    if (hasRealDb || hasExampleDb) {
      return candidate;
    }
  }

  // Fall back to the bundled data folder even if empty; the store will warn.
  return path.resolve(SERVER_ROOT, 'data');
}

/** Absolute path to the resolved data directory (evaluated once at startup). */
export const DATA_DIR = resolveDataDir();

/** Candidate sub-directories that may contain servable image/icon files. */
export const IMAGE_DIRS = [
  path.join(DATA_DIR, 'images'),
  path.join(DATA_DIR, 'icons'),
  DATA_DIR,
];

logger.info(`Data directory resolved to: ${DATA_DIR}`);
