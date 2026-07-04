import { env, isDev } from '../config/env';
import { logger } from '../config/logger';

/** Verification endpoints of the supported captcha providers. */
const VERIFY_URLS: Record<string, string> = {
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
  hcaptcha: 'https://hcaptcha.com/siteverify',
};

/**
 * Verifies a captcha token sent by the client before an e-mail may be sent.
 *
 * - `CAPTCHA_PROVIDER=none` (development): the token only has to be present.
 * - `recaptcha` / `hcaptcha`: the token is validated against the provider using
 *   the configured `CAPTCHA_SECRET`.
 *
 * @param token Captcha token issued on the client.
 * @returns `true` when the token is considered valid.
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  const provider = env.captcha.provider;

  if (provider === 'none') {
    // Development mode: accept any non-empty token, reject empty ones so the
    // client-side flow is still exercised.
    if (!token && !isDev) return false;
    return true;
  }

  const verifyUrl = VERIFY_URLS[provider];
  if (!verifyUrl || !env.captcha.secret) {
    logger.error(`Captcha provider "${provider}" is not fully configured.`);
    return false;
  }

  try {
    const body = new URLSearchParams({ secret: env.captcha.secret, response: token });
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    logger.error('Captcha verification request failed.', error);
    return false;
  }
}
