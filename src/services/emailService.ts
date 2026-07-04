import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { ContactRequest, SendMailResult } from '../types/email';

/** Lazily created transporter (only when SMTP is configured). */
let transporter: Transporter | null = null;

/**
 * Returns a cached nodemailer transporter, or `null` when no SMTP host is
 * configured (the service then operates in dry-run mode).
 */
function getTransporter(): Transporter | null {
  if (!env.smtp.host) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });
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
 * Sends a contact-form message by e-mail (Service-Layer E-Mail).
 * When no SMTP host is configured the message is only logged (dry-run) so the
 * contact flow can be tested locally without a mail server.
 *
 * @param request Validated contact request.
 * @returns Result describing whether the mail was delivered or dry-run.
 */
export async function sendContactMail(request: ContactRequest): Promise<SendMailResult> {
  const subject = `Neue Kontaktanfrage von ${request.name}`;
  const text = `Name: ${request.name}\nE-Mail: ${request.email}\n\n${request.message}`;
  const html = `
    <h2>Neue Kontaktanfrage</h2>
    <p><strong>Name:</strong> ${escapeHtml(request.name)}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(request.email)}</p>
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(request.message).replace(/\n/g, '<br/>')}</p>
  `;

  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    logger.warn('[DRY-RUN] No SMTP configured — contact mail was not sent.', {
      to: env.mail.to,
      subject,
      from: request.email,
    });
    return { delivered: false, dryRun: true };
  }

  await activeTransporter.sendMail({
    from: env.mail.from,
    to: env.mail.to,
    replyTo: request.email,
    subject,
    text,
    html,
  });

  logger.info('Contact mail delivered.', { to: env.mail.to, subject });
  return { delivered: true, dryRun: false };
}
