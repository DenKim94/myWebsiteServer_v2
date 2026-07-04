import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Reads an environment variable, returning a fallback when unset/empty.
 * @param key Name of the environment variable.
 * @param fallback Value used when the variable is missing or empty.
 */
function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

/** Parsed captcha provider identifier. */
export type CaptchaProvider = 'none' | 'recaptcha' | 'hcaptcha';

/**
 * Central, validated application configuration derived from environment
 * variables. Imported wherever configuration is needed so there is a single
 * source of truth.
 */
export const env = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: Number.parseInt(readEnv('PORT', '3001'), 10),
  /** Allowed CORS origins (comma separated in the env var). */
  corsOrigins: readEnv('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Explicit data directory; empty string means "auto-detect". */
  dataDir: readEnv('DATA_DIR', ''),
  captcha: {
    provider: readEnv('CAPTCHA_PROVIDER', 'none') as CaptchaProvider,
    secret: readEnv('CAPTCHA_SECRET', ''),
  },
  smtp: {
    host: readEnv('SMTP_HOST', ''),
    port: Number.parseInt(readEnv('SMTP_PORT', '587'), 10),
    secure: readEnv('SMTP_SECURE', 'false') === 'true',
    user: readEnv('SMTP_USER', ''),
    password: readEnv('SMTP_PASSWORD', ''),
  },
  mail: {
    to: readEnv('MAIL_TO', 'den.kim2207@gmail.com'),
    from: readEnv('MAIL_FROM', 'no-reply@denis-kim.dev'),
  },
} as const;

/** True when running in development mode. */
export const isDev = env.nodeEnv === 'development';
