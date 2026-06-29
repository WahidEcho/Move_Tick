/**
 * Server-side HTML email templates. Inline styles only (email clients strip
 * <style>/external CSS). Move Beyond brand: deep purple #5B3BE8, neon green
 * #4ADE00, near-black #07070F.
 *
 * Note on QR: most clients (Gmail) strip inline base64 <img>, so the QR is sent
 * as an attachment and the email leads with a "View ticket" button to the
 * always-rendering wallet page.
 */

const BRAND_PURPLE = '#5B3BE8';
const BRAND_GREEN = '#4ADE00';
const NEAR_BLACK = '#07070F';

export interface TicketEmailData {
  attendeeName: string;
  eventTitle: string;
  eventDateLabel?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketTypeName: string;
  ticketUrl: string;
  appleWalletUrl?: string | null;
  googleWalletUrl?: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

function shell(innerHtml: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:${NEAR_BLACK};padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Move-Tick</span>
        </td></tr>
        ${innerHtml}
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
            You received this because you registered for an event on Move-Tick.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_PURPLE};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">${label}</a>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface InvitationEmailData {
  inviteeName?: string | null;
  eventTitle: string;
  eventDateLabel?: string | null;
  venue?: string | null;
  city?: string | null;
  eventUrl: string;
}

/** Invitation email: event summary + a button to view the event and RSVP. */
export function invitationEmail(data: InvitationEmailData): RenderedEmail {
  const locationLine = [data.venue, data.city]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml)
    .join(', ');
  const greeting = data.inviteeName ? `Hi ${escapeHtml(data.inviteeName)},` : 'Hi,';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You're invited</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">${escapeHtml(data.eventTitle)}</h1>
      <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
        ${greeting} you've been invited to <strong>${escapeHtml(data.eventTitle)}</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
        ${data.eventDateLabel ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📅 ${escapeHtml(data.eventDateLabel)}</td></tr>` : ''}
        ${locationLine ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📍 ${locationLine}</td></tr>` : ''}
      </table>
      <div style="text-align:center;margin:0 0 8px 0;">
        ${button(data.eventUrl, 'View event & RSVP')}
      </div>
    </td></tr>`;
  return { subject: `You're invited: ${data.eventTitle}`, html: shell(inner) };
}

/** Email confirming an issued ticket, with a link to the wallet + QR attached. */
export function ticketIssuedEmail(data: TicketEmailData): RenderedEmail {
  const locationLine = [data.venue, data.city]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml)
    .join(', ');
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You're in 🎉</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">${escapeHtml(data.eventTitle)}</h1>
      <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">
        Hi ${escapeHtml(data.attendeeName)} — you're all set! Your <strong>${escapeHtml(data.ticketTypeName)}</strong> ticket is confirmed, and we've attached it to this email as a PDF so you can keep it handy. We can't wait to see you there. 💜
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
        ${data.eventDateLabel ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📅 ${escapeHtml(data.eventDateLabel)}</td></tr>` : ''}
        ${locationLine ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📍 ${locationLine}</td></tr>` : ''}
      </table>
      <div style="background:#f9fafb;border:1px solid #eee;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px 0;">
        <p style="margin:0 0 12px 0;color:#374151;font-size:14px;">Your ticket PDF is attached. You can also open it any time here:</p>
        ${button(data.ticketUrl, 'View your ticket & QR')}
        ${data.appleWalletUrl || data.googleWalletUrl ? `
        <p style="margin:16px 0 8px 0;color:#9ca3af;font-size:13px;">Or add it to your phone:</p>
        <div>
          ${data.appleWalletUrl ? `<a href="${data.appleWalletUrl}" style="display:inline-block;background:${NEAR_BLACK};color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;margin:4px;"> Apple Wallet</a>` : ''}
          ${data.googleWalletUrl ? `<a href="${data.googleWalletUrl}" style="display:inline-block;background:#ffffff;border:1px solid #dadce0;color:#3c4043;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;margin:4px;">Google Wallet</a>` : ''}
        </div>` : ''}
      </div>
      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;border-left:3px solid ${BRAND_GREEN};padding-left:12px;">
        Just show the QR (from the attached PDF or your wallet) at the entrance — it works offline, so you're covered even with no signal. See you soon!
      </p>
    </td></tr>`;
  return {
    subject: `Your ticket for ${data.eventTitle}`,
    html: shell(inner),
  };
}
