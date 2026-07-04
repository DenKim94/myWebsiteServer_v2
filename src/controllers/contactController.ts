import type { Request, Response } from 'express';
import { verifyCaptcha } from '../services/captchaService';
import { sendContactMail } from '../services/emailService';
import type { ContactRequest } from '../types/email';

/** Simple RFC-5322-ish e-mail validation (good enough for a contact form). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * Validates and coerces the raw request body into a {@link ContactRequest}.
 * @returns The validated request, or an error message describing what is wrong.
 */
function validateBody(body: unknown): { data?: ContactRequest; error?: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request body.' };
  }
  const { name, email, message, captchaToken } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return { error: 'Field "name" is required.' };
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return { error: 'A valid "email" is required.' };
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { error: 'Field "message" is required.' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { error: 'Message is too long.' };
  }
  if (typeof captchaToken !== 'string') {
    return { error: 'Captcha token is missing.' };
  }

  return {
    data: {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      captchaToken,
    },
  };
}

/**
 * Handles a contact-form submission: validates input, verifies the captcha and
 * triggers the e-mail service.
 *
 * @route POST /api/contact
 */
export async function postContact(req: Request, res: Response): Promise<void> {
  const { data, error } = validateBody(req.body);
  if (error || !data) {
    res.status(400).json({ error });
    return;
  }

  const captchaOk = await verifyCaptcha(data.captchaToken);
  if (!captchaOk) {
    res.status(403).json({ error: 'Captcha verification failed.' });
    return;
  }

  const result = await sendContactMail(data);
  res.status(202).json({
    success: true,
    dryRun: result.dryRun,
    message: result.dryRun
      ? 'Nachricht angenommen (Dry-Run: kein SMTP konfiguriert).'
      : 'Nachricht wurde erfolgreich versendet.',
  });
}
