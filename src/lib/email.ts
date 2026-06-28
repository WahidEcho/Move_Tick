import { Resend } from 'resend';

/**
 * Thin, provider-agnostic email wrapper around Resend.
 *
 * - Reads RESEND_API_KEY + EMAIL_FROM from the server environment (never the
 *   client). If RESEND_API_KEY is unset it no-ops and logs, so local dev and
 *   the free-ticket flow never crash on a missing key.
 * - Swapping providers later only means changing this file.
 */

const apiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.EMAIL_FROM ?? 'Move Beyond <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content (no data: prefix). */
  content: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return resend !== null;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${params.to} ("${params.subject}")`);
    return { ok: false, error: 'email_not_configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    });

    if (error) {
      console.error(`[email] send failed to ${params.to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown email error';
    console.error(`[email] send threw for ${params.to}:`, msg);
    return { ok: false, error: msg };
  }
}

/** Strip a `data:image/png;base64,XXXX` URL down to just the base64 payload. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}
