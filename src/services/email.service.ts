import { createServiceClient } from '@/lib/supabase-server';
import { sendEmail, dataUrlToBase64, type SendEmailResult } from '@/lib/email';
import { ticketIssuedEmail, invitationEmail } from '@/lib/email-templates';
import { walletAvailability } from '@/lib/wallet/config';
import { getAppUrl as appUrl } from '@/lib/app-url';
import { generateTicketPdf } from '@/lib/ticket-pdf';
import type { EmailAttachment } from '@/lib/email';
import { format } from 'date-fns';

/**
 * Orchestrates transactional emails. Best-effort: callers should not fail the
 * core flow (registration, issuance) if an email send fails — these return a
 * result rather than throwing.
 */

/**
 * Send the "your ticket is confirmed" email for an issued ticket, with the QR
 * image attached. Looks up the attendee, event, and ticket type by ticket id.
 */
export async function sendTicketEmail(ticketId: string): Promise<SendEmailResult> {
  const supabase = createServiceClient();

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(
      '*, profile:profiles(email, full_name), event:events(title, start_date, venue, city), ticket_type:ticket_types(name)'
    )
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    return { ok: false, error: `ticket_lookup_failed: ${error?.message ?? 'not found'}` };
  }

  const profile = ticket.profile as { email?: string; full_name?: string } | null;
  const event = ticket.event as { title?: string; start_date?: string; venue?: string; city?: string } | null;
  const ticketType = ticket.ticket_type as { name?: string } | null;

  const to = profile?.email;
  if (!to) {
    return { ok: false, error: 'attendee_has_no_email' };
  }

  const dateLabel = event?.start_date
    ? format(new Date(event.start_date), "EEE, MMM d, yyyy · h:mm a")
    : null;

  const wallet = walletAvailability();
  const { subject, html } = ticketIssuedEmail({
    attendeeName: profile?.full_name || 'there',
    eventTitle: event?.title || 'your event',
    eventDateLabel: dateLabel,
    venue: event?.venue,
    city: event?.city,
    ticketTypeName: ticketType?.name || 'Ticket',
    ticketUrl: `${appUrl()}/tickets/${ticketId}`,
    appleWalletUrl: wallet.apple ? `${appUrl()}/api/tickets/${ticketId}/apple-pass` : null,
    googleWalletUrl: wallet.google ? `${appUrl()}/api/tickets/${ticketId}/google-pass` : null,
  });

  const qrDataUrl = ticket.qr_code as string | null;
  let attachments: EmailAttachment[] | undefined;
  if (qrDataUrl) {
    try {
      const pdfBytes = await generateTicketPdf({
        eventTitle: event?.title || 'Your event',
        dateLabel,
        venue: event?.venue,
        city: event?.city,
        ticketTypeName: ticketType?.name || 'Ticket',
        attendeeName: profile?.full_name || 'Guest',
        qrPngDataUrl: qrDataUrl,
      });
      attachments = [
        { filename: 'ticket.pdf', content: Buffer.from(pdfBytes).toString('base64') },
      ];
    } catch (e) {
      // Fall back to the raw QR PNG if PDF generation fails.
      console.warn('[email] ticket PDF generation failed, attaching QR PNG instead:', e);
      attachments = [{ filename: 'ticket-qr.png', content: dataUrlToBase64(qrDataUrl) }];
    }
  }

  return sendEmail({ to, subject, html, attachments });
}

/**
 * Send an invitation email for an event_invitations row: event summary + a link
 * to the public event page to RSVP. Best-effort; returns a result.
 */
export async function sendInvitationEmail(invitationId: string): Promise<SendEmailResult> {
  const supabase = createServiceClient();

  const { data: invite, error } = await supabase
    .from('event_invitations')
    .select('invitee_name, invitee_email, event:events(title, slug, start_date, venue, city)')
    .eq('id', invitationId)
    .single();

  if (error || !invite) {
    return { ok: false, error: `invitation_lookup_failed: ${error?.message ?? 'not found'}` };
  }

  const event = invite.event as { title?: string; slug?: string; start_date?: string; venue?: string; city?: string } | null;
  const to = invite.invitee_email as string | null;
  if (!to) return { ok: false, error: 'invitation_has_no_email' };

  const dateLabel = event?.start_date
    ? format(new Date(event.start_date), "EEE, MMM d, yyyy · h:mm a")
    : null;

  const { subject, html } = invitationEmail({
    inviteeName: (invite.invitee_name as string) ?? null,
    eventTitle: event?.title || 'an event',
    eventDateLabel: dateLabel,
    venue: event?.venue,
    city: event?.city,
    eventUrl: `${appUrl()}/events/${event?.slug ?? ''}`,
  });

  return sendEmail({ to, subject, html });
}
