import type { Request, Response } from 'express';
import { verifyCaptcha } from '../services/captchaService';
import { sendContactMail } from '../services/emailService';
import { toLanguage, type Language } from '../types/portfolio';
import type { ContactRequest } from '../types/email';

/** Simple RFC-5322-ish e-mail validation (good enough for a contact form). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

/** Keys for the user-facing contact responses. */
type MessageKey =
  | 'invalidBody'
  | 'nameRequired'
  | 'emailRequired'
  | 'messageRequired'
  | 'messageTooLong'
  | 'captchaMissing'
  | 'captchaFailed'
  | 'successDryRun'
  | 'success';

/** Localized contact-endpoint response messages. */
const MESSAGES: Record<Language, Record<MessageKey, string>> = {
  de: {
    invalidBody: 'Ungültiger Anfrage-Text.',
    nameRequired: 'Das Feld "Name" ist erforderlich.',
    emailRequired: 'Eine gültige "E-Mail" ist erforderlich.',
    messageRequired: 'Das Feld "Nachricht" ist erforderlich.',
    messageTooLong: 'Die Nachricht ist zu lang.',
    captchaMissing: 'Captcha-Token fehlt.',
    captchaFailed: 'Captcha-Prüfung fehlgeschlagen.',
    successDryRun: 'Nachricht angenommen (Dry-Run: kein SMTP konfiguriert).',
    success: 'Nachricht wurde erfolgreich versendet.',
  },
  en: {
    invalidBody: 'Invalid request body.',
    nameRequired: 'Field "name" is required.',
    emailRequired: 'A valid "email" is required.',
    messageRequired: 'Field "message" is required.',
    messageTooLong: 'Message is too long.',
    captchaMissing: 'Captcha token is missing.',
    captchaFailed: 'Captcha verification failed.',
    successDryRun: 'Message accepted (dry run: no SMTP configured).',
    success: 'Your message was sent successfully.',
  },
};

/**
 * Validates and coerces the raw request body into a {@link ContactRequest}.
 * @returns The validated request, or an error message key describing what is wrong.
 */
function validateBody(body: unknown): { data?: ContactRequest; errorKey?: MessageKey } {
  if (typeof body !== 'object' || body === null) {
    return { errorKey: 'invalidBody' };
  }
  const { name, email, message, captchaToken } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return { errorKey: 'nameRequired' };
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return { errorKey: 'emailRequired' };
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { errorKey: 'messageRequired' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { errorKey: 'messageTooLong' };
  }
  if (typeof captchaToken !== 'string') {
    return { errorKey: 'captchaMissing' };
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
 * triggers the e-mail service. Response messages are localized via the `lang`
 * field of the request body (`de` | `en`).
 *
 * @route POST /api/contact
 */
export async function postContact(req: Request, res: Response): Promise<void> {
  const lang = toLanguage((req.body as { lang?: unknown })?.lang);
  const messages = MESSAGES[lang];

  const { data, errorKey } = validateBody(req.body);
  if (errorKey || !data) {
    res.status(400).json({ error: messages[errorKey ?? 'invalidBody'] });
    return;
  }

  const captchaOk = await verifyCaptcha(data.captchaToken);
  if (!captchaOk) {
    res.status(403).json({ error: messages.captchaFailed });
    return;
  }

  const result = await sendContactMail(data);
  res.status(202).json({
    success: true,
    dryRun: result.dryRun,
    message: result.dryRun ? messages.successDryRun : messages.success,
  });
}
