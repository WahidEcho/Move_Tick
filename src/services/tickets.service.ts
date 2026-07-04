import { createServiceClient } from '@/lib/supabase-server';
import QRCode from 'qrcode';
import { generateToken } from '@/lib/helpers';
import type {
  Ticket,
  TicketType,
  Event,
  Profile,
} from '@/types/database.types';

export interface CreateTicketTypeData {
  name: string;
  description?: string | null;
  price?: number;
  capacity?: number | null;
  sales_start?: string | null;
  sales_end?: string | null;
  max_per_user?: number;
  visibility?: 'public' | 'hidden' | 'invite_only';
  sort_order?: number;
}

export type TicketWithJoins = Ticket & {
  ticket_type?: TicketType | null;
  event?: Event | null;
  profile?: Profile | null;
};

export async function createTicketType(
  eventId: string,
  data: CreateTicketTypeData
): Promise<TicketType> {
  const supabase = createServiceClient();

  const { data: maxSort } = await supabase
    .from('ticket_types')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = data.sort_order ?? (maxSort?.sort_order ?? 0) + 1;

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .insert({
      event_id: eventId,
      name: data.name,
      description: data.description ?? null,
      price: data.price ?? 0,
      capacity: data.capacity ?? null,
      sold_count: 0,
      sales_start: data.sales_start ?? null,
      sales_end: data.sales_end ?? null,
      max_per_user: data.max_per_user ?? 1,
      visibility: data.visibility ?? 'public',
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create ticket type: ${error.message}`);

  await recomputeEventCapacity(eventId);
  return ticketType as TicketType;
}

/**
 * events.capacity is DERIVED from the ticket types (organizers no longer type
 * an attendee count): the sum of active ticket-type capacities, or NULL
 * (unlimited) when there are no active types or any type is uncapped. Called
 * after every ticket-type mutation so isFull / "spots left" stay consistent.
 */
export async function recomputeEventCapacity(eventId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: types } = await supabase
    .from('ticket_types')
    .select('capacity')
    .eq('event_id', eventId)
    .eq('is_active', true);

  const list = types ?? [];
  const hasUncapped = list.length === 0 || list.some((t) => t.capacity === null);
  const total = hasUncapped
    ? null
    : list.reduce((sum, t) => sum + (t.capacity as number), 0);

  await supabase
    .from('events')
    .update({ capacity: total, updated_at: new Date().toISOString() })
    .eq('id', eventId);
}

export async function getTicketTypes(eventId: string): Promise<TicketType[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch ticket types: ${error.message}`);
  return (data ?? []) as TicketType[];
}

export async function updateTicketType(
  id: string,
  data: Partial<CreateTicketTypeData>
): Promise<TicketType> {
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order;

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update ticket type: ${error.message}`);

  await recomputeEventCapacity((ticketType as TicketType).event_id);
  return ticketType as TicketType;
}

export async function deleteTicketType(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: deleted, error } = await supabase
    .from('ticket_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('event_id')
    .single();

  if (error) throw new Error(`Failed to delete ticket type: ${error.message}`);

  if (deleted?.event_id) {
    await recomputeEventCapacity(deleted.event_id as string);
  }
}

export async function issueTicket(
  eventId: string,
  ticketTypeId: string,
  userId: string
): Promise<Ticket> {
  const supabase = createServiceClient();

  // Generate the QR token + image in Node (the qrcode lib isn't available in
  // Postgres), then hand off to the atomic issue_ticket() function which locks
  // the ticket_type row, re-checks capacity, inserts the ticket, and bumps
  // sold_count in a single transaction -- eliminating the oversell race.
  const token = generateToken(24);
  const qrCode = await QRCode.toDataURL(token);

  const { data: ticket, error } = await supabase.rpc('issue_ticket', {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_user_id: userId,
    p_qr_token: token,
    p_qr_code: qrCode,
  });

  if (error) {
    if (error.message.includes('TICKET_TYPE_SOLD_OUT')) {
      throw new Error('Ticket type is sold out');
    }
    if (error.message.includes('TICKET_TYPE_NOT_FOUND')) {
      throw new Error('Ticket type not found');
    }
    throw new Error(`Failed to issue ticket: ${error.message}`);
  }

  return ticket as Ticket;
}

export interface GuestTicketInfo {
  email: string;
  name?: string | null;
  invitationId?: string | null;
}

/**
 * Issue a ticket to a guest who has NOT signed up (admin invitation flow).
 * Mirrors issueTicket() but stores guest identity instead of a profile id, via
 * the atomic issue_guest_ticket() RPC. The QR still scans normally at the gate.
 */
export async function issueGuestTicket(
  eventId: string,
  ticketTypeId: string,
  guest: GuestTicketInfo
): Promise<Ticket> {
  const supabase = createServiceClient();

  const token = generateToken(24);
  const qrCode = await QRCode.toDataURL(token);

  const { data: ticket, error } = await supabase.rpc('issue_guest_ticket', {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_guest_email: guest.email,
    p_guest_name: guest.name ?? null,
    p_invitation_id: guest.invitationId ?? null,
    p_qr_token: token,
    p_qr_code: qrCode,
  });

  if (error) {
    if (error.message.includes('TICKET_TYPE_SOLD_OUT')) {
      throw new Error('Ticket type is sold out');
    }
    if (error.message.includes('TICKET_TYPE_NOT_FOUND')) {
      throw new Error('Ticket type not found');
    }
    throw new Error(`Failed to issue guest ticket: ${error.message}`);
  }

  return ticket as Ticket;
}

export async function getTicket(id: string): Promise<TicketWithJoins | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tickets')
    .select('*, ticket_type:ticket_types(*), event:events(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }
  return data as TicketWithJoins;
}

export async function getTicketByToken(
  token: string
): Promise<TicketWithJoins | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tickets')
    .select('*, ticket_type:ticket_types(*), event:events(*)')
    .eq('qr_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }
  return data as TicketWithJoins;
}

export async function getUserTickets(
  userId: string
): Promise<TicketWithJoins[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tickets')
    .select('*, ticket_type:ticket_types(*), event:events(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user tickets: ${error.message}`);
  return (data ?? []) as TicketWithJoins[];
}

export async function deactivateTicket(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('ticket_type_id')
    .eq('id', id)
    .single();

  if (fetchError || !ticket) {
    throw new Error('Ticket not found');
  }

  const { error: deactError } = await supabase
    .from('tickets')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (deactError) throw new Error(`Failed to deactivate ticket: ${deactError.message}`);

  const { data: tt } = await supabase
    .from('ticket_types')
    .select('sold_count')
    .eq('id', ticket.ticket_type_id)
    .single();

  const soldCount = (tt?.sold_count as number) ?? 0;
  if (soldCount > 0) {
    await supabase
      .from('ticket_types')
      .update({
        sold_count: soldCount - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.ticket_type_id);
  }
}

export async function getTicketTypeAvailability(
  ticketTypeId: string
): Promise<number> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('ticket_types')
    .select('capacity, sold_count')
    .eq('id', ticketTypeId)
    .single();

  if (error) throw new Error(`Failed to fetch ticket type: ${error.message}`);
  if (!data) throw new Error('Ticket type not found');

  const capacity = data.capacity as number | null;
  const soldCount = (data.sold_count as number) ?? 0;
  return capacity != null ? Math.max(0, capacity - soldCount) : Infinity;
}
