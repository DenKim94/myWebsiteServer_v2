/** Payload of a contact-form request received by POST /api/contact. */
export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  /** Token issued by the captcha provider on the client. */
  captchaToken: string;
}

/** Result of sending (or dry-running) a contact e-mail. */
export interface SendMailResult {
  delivered: boolean;
  /** True when the message was only logged (no SMTP configured). */
  dryRun: boolean;
}
