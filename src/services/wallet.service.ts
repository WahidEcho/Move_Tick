import { createClient } from '@/lib/supabase-server';
import { generateApplePass } from '@/lib/wallet/apple';
import { getGoogleWalletSaveUrl } from '@/lib/wallet/google';
import type { WalletTicketData } from '@/lib/wallet/types';

/**
 * Loads the data needed to build a wallet pass for a ticket, using the
 * REQUEST-SCOPED authenticated client so RLS enforces that the caller may see
 * the ticket (owner or org member). Returns null if not found / not permitted.
 */
async function loadWalletTicket(ticketId: string): Promise<WalletTicketData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tickets')
    .select(
      'id, qr_token, profile:profiles(full_name), event:events(title, start_date, end_date, venue, city), ticket_type:ticket_types(name)'
    )
    .eq('id', ticketId)
    .single();

  if (error || !data || !data.qr_token) return null;

  const profile = data.profile as { full_name?: string } | null;
  const event = data.event as { title?: string; start_date?: string; end_date?: string; venue?: string; city?: string } | null;
  const ticketType = data.ticket_type as { name?: string } | null;

  return {
    ticketId: data.id as string,
    qrToken: data.qr_token as string,
    eventTitle: event?.title ?? 'Event',
    eventDateISO: event?.start_date ?? null,
    eventEndISO: event?.end_date ?? null,
    venue: event?.venue ?? null,
    city: event?.city ?? null,
    ticketTypeName: ticketType?.name ?? 'Ticket',
    attendeeName: profile?.full_name ?? 'Guest',
  };
}

/** Returns the signed .pkpass buffer, or null if unavailable/unauthorized. */
export async function buildApplePassForTicket(ticketId: string): Promise<Buffer | null> {
  const ticket = await loadWalletTicket(ticketId);
  if (!ticket) return null;
  return generateApplePass(ticket);
}

/** Returns the Google Wallet save URL, or null if unavailable/unauthorized. */
export async function buildGoogleSaveUrlForTicket(ticketId: string): Promise<string | null> {
  const ticket = await loadWalletTicket(ticketId);
  if (!ticket) return null;
  return getGoogleWalletSaveUrl(ticket);
}
