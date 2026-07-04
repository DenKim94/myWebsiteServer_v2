/**
 * Minimal structured logger. Kept dependency-free on purpose; can later be
 * swapped for pino/winston without touching call sites.
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Writes a single log line with an ISO timestamp and level prefix.
 * @param level Severity of the message.
 * @param message Human readable message.
 * @param meta Optional structured metadata.
 */
function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](prefix, message, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](prefix, message);
  }
}

export const logger = {
  info: (message: string, meta?: unknown): void => log('info', message, meta),
  warn: (message: string, meta?: unknown): void => log('warn', message, meta),
  error: (message: string, meta?: unknown): void => log('error', message, meta),
  debug: (message: string, meta?: unknown): void => log('debug', message, meta),
};
