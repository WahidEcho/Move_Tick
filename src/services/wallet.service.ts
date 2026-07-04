import { createClient, createServiceClient } from '@/lib/supabase-server';
import { generateApplePass } from '@/lib/wallet/apple';
import { getGoogleWalletSaveUrl } from '@/lib/wallet/google';
import type { WalletTicketData } from '@/lib/wallet/types';

const TICKET_SELECT =
  'id, qr_token, is_active, guest_name, profile:profiles(full_name), event:events(title, start_date, end_date, venue, city), ticket_type:ticket_types(name)';

type TicketRow = {
  id: string;
  qr_token: string | null;
  is_active: boolean;
  guest_name: string | null;
  profile: { full_name?: string } | null;
  event: { title?: string; start_date?: string; end_date?: string; venue?: string; city?: string } | null;
  ticket_type: { name?: string } | null;
};

function toWalletData(data: TicketRow): WalletTicketData {
  return {
    ticketId: data.id,
    qrToken: data.qr_token as string,
    eventTitle: data.event?.title ?? 'Event',
    eventDateISO: data.event?.start_date ?? null,
    eventEndISO: data.event?.end_date ?? null,
    venue: data.event?.venue ?? null,
    city: data.event?.city ?? null,
    ticketTypeName: data.ticket_type?.name ?? 'Ticket',
    attendeeName: data.profile?.full_name ?? data.guest_name ?? 'Guest',
  };
}

/**
 * Loads the data needed to build a wallet pass for a ticket.
 *
 * Two auth modes:
 *  - Cookie session (default): request-scoped client, RLS enforces the caller
 *    may see the ticket (owner or org member).
 *  - Capability token (`token`): for guests adding to wallet straight from the
 *    invitation email — the token is the ticket's own secret qr_token (already
 *    in the emailed QR/PDF, so this grants nothing the email doesn't). Verified
 *    against id + active with the service client.
 */
async function loadWalletTicket(
  ticketId: string,
  token?: string | null
): Promise<WalletTicketData | null> {
  if (token) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tickets')
      .select(TICKET_SELECT)
      .eq('id', ticketId)
      .eq('qr_token', token)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data || !data.qr_token) return null;
    return toWalletData(data as unknown as TicketRow);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_SELECT)
    .eq('id', ticketId)
    .single();

  if (error || !data || !data.qr_token) return null;
  return toWalletData(data as unknown as TicketRow);
}

/** Returns the signed .pkpass buffer, or null if unavailable/unauthorized. */
export async function buildApplePassForTicket(
  ticketId: string,
  token?: string | null
): Promise<Buffer | null> {
  const ticket = await loadWalletTicket(ticketId, token);
  if (!ticket) return null;
  return generateApplePass(ticket);
}

/** Returns the Google Wallet save URL, or null if unavailable/unauthorized. */
export async function buildGoogleSaveUrlForTicket(
  ticketId: string,
  token?: string | null
): Promise<string | null> {
  const ticket = await loadWalletTicket(ticketId, token);
  if (!ticket) return null;
  return getGoogleWalletSaveUrl(ticket);
}
