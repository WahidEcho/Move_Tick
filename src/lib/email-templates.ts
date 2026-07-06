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

export interface StaffAssignmentEmailData {
  assigneeName?: string | null;
  eventTitle: string;
  organizationName?: string | null;
  roleLabel: string;
  eventDateLabel?: string | null;
  /** Direct link into the organizer portal for this event. */
  manageUrl: string;
  /** True when the account was just created for them (setupUrl present). */
  needsSignup: boolean;
  inviteeEmail: string;
  /** One-click set-your-password link for freshly created accounts. */
  setupUrl?: string | null;
}

/**
 * Team onboarding email: role + event, then a numbered getting-started guide.
 * New accounts get a one-click "Set your password" button (their account is
 * already created); existing accounts go straight to the event dashboard.
 */
export function staffAssignmentEmail(data: StaffAssignmentEmailData): RenderedEmail {
  const greeting = data.assigneeName ? `Hi ${escapeHtml(data.assigneeName)},` : 'Hi,';
  const orgLine = data.organizationName
    ? ` by <strong>${escapeHtml(data.organizationName)}</strong>`
    : '';

  const step = (n: number, text: string) => `
    <tr><td style="padding:8px 0;vertical-align:top;width:32px;">
      <div style="width:24px;height:24px;border-radius:12px;background:${BRAND_PURPLE};color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:24px;">${n}</div>
    </td><td style="padding:8px 0 8px 10px;color:#374151;font-size:14px;line-height:1.6;">${text}</td></tr>`;

  const newAccountSteps = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;">
      ${step(1, `We already created your Move-Tick account for <strong>${escapeHtml(data.inviteeEmail)}</strong> — tap the button below to set your password.`)}
      ${step(2, `On event day, open the Move-Tick app on your phone and sign in with this email (the web dashboard works too).`)}
      ${step(3, `Go to <strong>Ops → ${escapeHtml(data.eventTitle)}</strong> — your ${escapeHtml(data.roleLabel)} tools will be ready.`)}
    </table>
    <div style="text-align:center;margin:0 0 12px 0;">
      ${button(data.setupUrl ?? data.manageUrl, 'Set your password')}
    </div>
    <p style="margin:0 0 8px 0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
      Prefer the web? After setting your password you can manage the event at any time from the button in this email.
    </p>`;

  const existingAccountSteps = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;">
      ${step(1, `Sign in with <strong>${escapeHtml(data.inviteeEmail)}</strong> — on the web or in the Move-Tick app.`)}
      ${step(2, `Go to <strong>Ops → ${escapeHtml(data.eventTitle)}</strong> — your ${escapeHtml(data.roleLabel)} tools are already unlocked.`)}
    </table>
    <div style="text-align:center;margin:0 0 8px 0;">
      ${button(data.manageUrl, 'Open event dashboard')}
    </div>`;

  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You've joined the team</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">${escapeHtml(data.eventTitle)}</h1>
      <p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.6;">
        ${greeting} you've been added as <strong>${escapeHtml(data.roleLabel)}</strong> for
        <strong>${escapeHtml(data.eventTitle)}</strong>${orgLine}.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;">
        ${data.eventDateLabel ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📅 ${escapeHtml(data.eventDateLabel)}</td></tr>` : ''}
      </table>
      <p style="margin:0 0 8px 0;color:${NEAR_BLACK};font-size:14px;font-weight:700;">Getting started</p>
      ${data.needsSignup && data.setupUrl ? newAccountSteps : existingAccountSteps}
    </td></tr>`;
  return {
    subject: `You're on the team for ${data.eventTitle} — ${data.roleLabel}`,
    html: shell(inner),
  };
}

export interface InvitationTicketEmailData {
  inviteeName: string;
  eventTitle: string;
  organizationName?: string | null;
  eventDateLabel?: string | null;
  venue?: string | null;
  city?: string | null;
  ticketTypeName: string;
  /** Public RSVP page — works with no account. */
  rsvpUrl: string;
  appleWalletUrl?: string | null;
  googleWalletUrl?: string | null;
  /** One-click account-setup link (only for invitees with no account yet). */
  accountSetupUrl?: string | null;
}

/**
 * "You're invited" email for admin/organizer invitations: personal invite copy,
 * RSVP button (public token page — no login), wallet buttons that work for
 * guests, the QR PDF attached by the sender, and an optional one-click
 * account-setup link.
 */
export function invitationTicketEmail(data: InvitationTicketEmailData): RenderedEmail {
  const locationLine = [data.venue, data.city]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml)
    .join(', ');
  const hostLine = data.organizationName
    ? `<strong>${escapeHtml(data.organizationName)}</strong> has invited you to`
    : `You're invited to`;
  const accountBlock = data.accountSetupUrl
    ? `
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;text-align:center;margin:0 0 24px 0;">
        <p style="margin:0 0 10px 0;color:#374151;font-size:13px;line-height:1.6;">
          Want your ticket saved in one place, plus updates about this event?
          Activate your free Move-Tick account — one click, no forms.
        </p>
        <a href="${data.accountSetupUrl}" style="display:inline-block;background:transparent;border:1.5px solid ${BRAND_PURPLE};color:${BRAND_PURPLE};text-decoration:none;font-size:13px;font-weight:600;padding:9px 18px;border-radius:8px;">Activate my account</a>
      </div>`
    : '';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">You're invited ✨</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">${escapeHtml(data.eventTitle)}</h1>
      <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">
        Hi ${escapeHtml(data.inviteeName)} — ${hostLine} <strong>${escapeHtml(data.eventTitle)}</strong>.
        Your complimentary <strong>${escapeHtml(data.ticketTypeName)}</strong> ticket is ready and attached
        to this email as a PDF. No signup needed — just tell us you're coming. 💜
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
        ${data.eventDateLabel ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📅 ${escapeHtml(data.eventDateLabel)}</td></tr>` : ''}
        ${locationLine ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">📍 ${locationLine}</td></tr>` : ''}
      </table>
      <div style="text-align:center;margin:0 0 24px 0;">
        ${button(data.rsvpUrl, "RSVP & view my ticket")}
      </div>
      ${data.appleWalletUrl || data.googleWalletUrl ? `
      <div style="background:#f9fafb;border:1px solid #eee;border-radius:12px;padding:16px;text-align:center;margin:0 0 24px 0;">
        <p style="margin:0 0 8px 0;color:#9ca3af;font-size:13px;">Add your ticket to your phone:</p>
        <div>
          ${data.appleWalletUrl ? `<a href="${data.appleWalletUrl}" style="display:inline-block;background:${NEAR_BLACK};color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;margin:4px;"> Apple Wallet</a>` : ''}
          ${data.googleWalletUrl ? `<a href="${data.googleWalletUrl}" style="display:inline-block;background:#ffffff;border:1px solid #dadce0;color:#3c4043;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:8px;margin:4px;">Google Wallet</a>` : ''}
        </div>
      </div>` : ''}
      ${accountBlock}
      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;border-left:3px solid ${BRAND_GREEN};padding-left:12px;">
        At the entrance, just show the QR from the attached PDF or your wallet — it works offline. Can't make it? Use the RSVP link to let the host know.
      </p>
    </td></tr>`;
  return {
    subject: `You're invited: ${data.eventTitle} 🎟️`,
    html: shell(inner),
  };
}

export interface OrgApprovedEmailData {
  applicantName?: string | null;
  organizationName: string;
  dashboardUrl: string;
}

/** Sent to an applicant when their organizer application is approved. */
export function orgApprovedEmail(data: OrgApprovedEmailData): RenderedEmail {
  const greeting = data.applicantName ? `Hi ${escapeHtml(data.applicantName)},` : 'Hi,';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_GREEN};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Application approved</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">Welcome to Move-Tick, ${escapeHtml(data.organizationName)}</h1>
      <p style="margin:0 0 24px 0;color:#374151;font-size:15px;line-height:1.6;">
        ${greeting} great news — your organizer application for <strong>${escapeHtml(data.organizationName)}</strong> has been approved. You can now create and publish events on Move-Tick.
      </p>
      <div style="text-align:center;margin:0 0 8px 0;">
        ${button(data.dashboardUrl, 'Go to your dashboard')}
      </div>
    </td></tr>`;
  return { subject: `You're approved: ${data.organizationName} is live on Move-Tick`, html: shell(inner) };
}

export interface OrgRejectedEmailData {
  applicantName?: string | null;
  organizationName: string;
  reason?: string | null;
  contactEmail: string;
}

/** Sent to an applicant when their organizer application is rejected. */
export function orgRejectedEmail(data: OrgRejectedEmailData): RenderedEmail {
  const greeting = data.applicantName ? `Hi ${escapeHtml(data.applicantName)},` : 'Hi,';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:#9ca3af;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Application update</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">About your Move-Tick application</h1>
      <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">
        ${greeting} thanks for applying to organize events on Move-Tick as <strong>${escapeHtml(data.organizationName)}</strong>. After review, we're not able to approve this application right now.
      </p>
      ${data.reason ? `<div style="background:#f9fafb;border-left:3px solid #9ca3af;border-radius:8px;padding:14px 16px;margin:0 0 20px 0;"><p style="margin:0;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${escapeHtml(data.reason)}</p></div>` : ''}
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Questions? Reply to this email or reach us at <a href="mailto:${data.contactEmail}" style="color:${BRAND_PURPLE};">${data.contactEmail}</a>.
      </p>
    </td></tr>`;
  return { subject: `Update on your Move-Tick application`, html: shell(inner) };
}

export interface OrgMoreInfoEmailData {
  applicantName?: string | null;
  organizationName: string;
  requested: string;
  applyUrl: string;
}

/** Sent to an applicant when the admin needs more information before deciding. */
export function orgMoreInfoEmail(data: OrgMoreInfoEmailData): RenderedEmail {
  const greeting = data.applicantName ? `Hi ${escapeHtml(data.applicantName)},` : 'Hi,';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">A bit more info needed</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:24px;line-height:1.25;">Your Move-Tick application for ${escapeHtml(data.organizationName)}</h1>
      <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.6;">
        ${greeting} we're reviewing your organizer application and need a bit more information before we can proceed.
      </p>
      <div style="background:#f5f3ff;border-left:3px solid ${BRAND_PURPLE};border-radius:8px;padding:14px 16px;margin:0 0 24px 0;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(data.requested)}</p>
      </div>
      <div style="text-align:center;margin:0 0 8px 0;">
        ${button(data.applyUrl, 'Update your application')}
      </div>
    </td></tr>`;
  return { subject: `Action needed: your Move-Tick application`, html: shell(inner) };
}

export interface AdminOrgAlertEmailData {
  organizationName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Short human label, e.g. "New application submitted", "Organization suspended". */
  action: string;
  status?: string | null;
  eventTitle?: string | null;
  contractStatus?: string | null;
  dashboardUrl: string;
}

/** Internal alert sent to the Move Beyond admin inbox for org lifecycle events. */
export function adminOrgAlertEmail(data: AdminOrgAlertEmailData): RenderedEmail {
  const row = (label: string, value?: string | null) =>
    value
      ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top;">${label}</td><td style="padding:4px 0;color:#374151;font-size:13px;font-weight:600;">${escapeHtml(value)}</td></tr>`
      : '';
  const whenLabel = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo' }) + ' (Cairo)';
  const inner = `
    <tr><td style="padding:32px 32px 8px 32px;">
      <p style="margin:0 0 4px 0;color:${BRAND_PURPLE};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Platform alert</p>
      <h1 style="margin:0 0 16px 0;color:${NEAR_BLACK};font-size:22px;line-height:1.25;">${escapeHtml(data.action)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px 0;">
        ${row('Organization', data.organizationName)}
        ${row('Contact email', data.contactEmail)}
        ${row('Contact phone', data.contactPhone)}
        ${row('Status', data.status)}
        ${row('Event', data.eventTitle)}
        ${row('Contract', data.contractStatus)}
        ${row('When', whenLabel)}
      </table>
      <div style="text-align:center;margin:0 0 8px 0;">
        ${button(data.dashboardUrl, 'Open admin dashboard')}
      </div>
    </td></tr>`;
  return { subject: `[Move-Tick Admin] ${data.action}: ${data.organizationName}`, html: shell(inner) };
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
