import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { ContactRequest, SendMailResult } from '../types/email';

/** Lazily created transporter (only when SMTP is configured). */
let transporter: Transporter | null = null;

/**
 * Returns a cached nodemailer transporter, or `null` when no SMTP host is
 * configured (the service then operates in dry-run mode).
 *
 * The connection settings follow a standard SMTP-with-STARTTLS setup (e.g. GMX:
 * `mail.gmx.net`, port 587, `secure=false`), using a small connection pool and
 * conservative timeouts so a slow mail server cannot block the request thread.
 */
function getTransporter(): Transporter | null {
  if (!env.smtp.host) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    // `secure=false` on port 587 means the connection is upgraded via STARTTLS.
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    tls: {
      // Some providers (incl. GMX) present certificate chains that Node cannot
      // always validate from a container; STARTTLS still encrypts the traffic.
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  // Verify connectivity once in the background; failures are logged but do not
  // crash the server (the request will surface a proper error if sending fails).
  transporter
    .verify()
    .then(() => logger.info(`SMTP transporter ready (${env.smtp.host}:${env.smtp.port}).`))
    .catch((error) => logger.error('SMTP transporter verification failed.', error));

  return transporter;
}

/**
 * Escapes HTML-significant characters to prevent injection in the mail body.
 * @param value Untrusted user input.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Removes CR/LF characters from a single-line value to prevent e-mail header
 * injection (the name is used in the subject and the "from"/"reply-to" fields).
 * @param value Untrusted single-line input.
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Sends a contact-form message by e-mail (Service-Layer E-Mail).
 *
 * To satisfy strict SMTP providers (e.g. GMX), the envelope/`from` address is
 * the authenticated account; the visitor's name is used as the display name and
 * their address as `replyTo`, so replies go straight back to the sender.
 *
 * When no SMTP host is configured the message is only logged (dry-run) so the
 * contact flow can be tested locally without a mail server.
 *
 * @param request Validated contact request.
 * @returns Result describing whether the mail was delivered or dry-run.
 */
export async function sendContactMail(request: ContactRequest): Promise<SendMailResult> {
  const safeName = sanitizeHeaderValue(request.name);
  const safeEmail = sanitizeHeaderValue(request.email);
  const subject = `Neue Kontaktanfrage von ${safeName}`;
  const text = `Name: ${safeName}\nE-Mail: ${safeEmail}\n\n${request.message}`;
  const html = `
    <h2>Neue Kontaktanfrage</h2>
    <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(safeEmail)}</p>
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(request.message).replace(/\n/g, '<br/>')}</p>
  `;

  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    logger.warn('[DRY-RUN] No SMTP configured — contact mail was not sent.', {
      to: env.mail.to,
      subject,
      from: safeEmail,
    });
    return { delivered: false, dryRun: true };
  }

  // The "from" address must be the authenticated mailbox for most providers.
  const fromAddress = env.smtp.user || env.mail.from;

  await activeTransporter.sendMail({
    from: { name: safeName || 'Kontaktformular', address: fromAddress },
    to: env.mail.to,
    replyTo: { name: safeName, address: safeEmail },
    subject,
    text,
    html,
    headers: { 'X-Original-Sender': safeEmail },
  });

  logger.info('Contact mail delivered.', { to: env.mail.to, subject });
  return { delivered: true, dryRun: false };
}
