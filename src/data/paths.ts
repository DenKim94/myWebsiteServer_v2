import * as path from 'node:path';
import { env } from '../config/env';
import { logger } from '../config/logger';

/** Absolute path to the server project root (two levels above this file). */
const SERVER_ROOT = path.resolve(__dirname, '..', '..');

/** Default data directory bundled with the server (`server/data`). */
const DEFAULT_DATA_DIR = path.resolve(SERVER_ROOT, 'data');

/**
 * Resolves the data directory that holds the `database.json` files and the
 * `images/` (and `icons/`) sub-folders.
 *
 * Resolution order:
 *   1. `DATA_DIR` environment variable (absolute, or relative to the server root)
 *   2. `./data` inside the server (default — ships with the example databases)
 *
 * When the resolved directory has no `database.json`, the data layer falls back
 * to the bundled `database.example.json` (see {@link dataStore}).
 *
 * @returns Absolute path to the resolved data directory.
 */
export function resolveDataDir(): string {
  if (env.dataDir) {
    return path.isAbsolute(env.dataDir)
      ? env.dataDir
      : path.resolve(SERVER_ROOT, env.dataDir);
  }

  return DEFAULT_DATA_DIR;
}

/** Absolute path to the resolved data directory (evaluated once at startup). */
export const DATA_DIR = resolveDataDir();

/** Absolute path to the image sub-directory (`<DATA_DIR>/images`). */
export const IMAGES_DIR = path.join(DATA_DIR, 'images');

/** Absolute path to the icon/logo sub-directory (`<DATA_DIR>/icons`). */
export const ICONS_DIR = path.join(DATA_DIR, 'icons');

/** Candidate sub-directories that may contain servable image/icon files. */
export const IMAGE_DIRS = [IMAGES_DIR, ICONS_DIR, DATA_DIR];

logger.info(`Data directory resolved to: ${DATA_DIR}`);
