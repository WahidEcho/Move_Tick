import { createServiceClient } from '@/lib/supabase-server';
import type {
  EventInvitation,
  InvitationStatus,
} from '@/types/database.types';
import type { PaginatedResult, InvitationFunnel } from '@/types/domain.types';

export type EventInvitationWithTicketType = EventInvitation & {
  ticket_type?: { id: string; name: string; price: number } | null;
  event?: { id: string; title: string; slug: string; start_date: string; end_date: string; venue: string | null; city: string | null } | null;
};

export interface CreateInvitationData {
  event_id: string;
  organization_id: string;
  invitee_name: string;
  invitee_email: string;
  invitee_phone?: string | null;
  invitee_company?: string | null;
  invitee_title?: string | null;
  ticket_type_id?: string | null;
  tag?: string | null;
  delivery_channel?: 'email' | 'whatsapp' | 'manual';
}

export interface BulkInvitationInput {
  invitee_name: string;
  invitee_email: string;
  invitee_phone?: string | null;
  invitee_company?: string | null;
  invitee_title?: string | null;
  ticket_type_id?: string | null;
  tag?: string | null;
}

export interface GetEventInvitationsFilters {
  status?: InvitationStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

function generateRsvpToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function createInvitation(
  data: CreateInvitationData
): Promise<EventInvitation> {
  const supabase = createServiceClient();

  const { data: invitation, error } = await supabase
    .from('event_invitations')
    .insert({
      event_id: data.event_id,
      organization_id: data.organization_id,
      invitee_name: data.invitee_name,
      invitee_email: data.invitee_email,
      invitee_phone: data.invitee_phone ?? null,
      invitee_company: data.invitee_company ?? null,
      invitee_title: data.invitee_title ?? null,
      ticket_type_id: data.ticket_type_id ?? null,
      tag: data.tag ?? null,
      status: 'pending',
      rsvp_token: generateRsvpToken(),
      delivery_channel: data.delivery_channel ?? 'email',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create invitation: ${error.message}`);
  return invitation as EventInvitation;
}

export async function createBulkInvitations(
  eventId: string,
  orgId: string,
  invitations: BulkInvitationInput[]
): Promise<{ created: number; skipped: number }> {
  const supabase = createServiceClient();

  const existing = await checkDuplicateInvitations(
    eventId,
    invitations.map((i) => i.invitee_email)
  );
  const existingSet = new Set(existing);

  const toInsert = invitations.filter((i) => !existingSet.has(i.invitee_email));

  if (toInsert.length === 0) {
    return { created: 0, skipped: invitations.length };
  }

  const rows = toInsert.map((inv) => ({
    event_id: eventId,
    organization_id: orgId,
    invitee_name: inv.invitee_name,
    invitee_email: inv.invitee_email,
    invitee_phone: inv.invitee_phone ?? null,
    invitee_company: inv.invitee_company ?? null,
    invitee_title: inv.invitee_title ?? null,
    ticket_type_id: inv.ticket_type_id ?? null,
    tag: inv.tag ?? null,
    status: 'pending' as const,
    rsvp_token: generateRsvpToken(),
    delivery_channel: 'email' as const,
  }));

  const { error } = await supabase.from('event_invitations').insert(rows);

  if (error) throw new Error(`Failed to create bulk invitations: ${error.message}`);

  return {
    created: toInsert.length,
    skipped: invitations.length - toInsert.length,
  };
}

export async function getEventInvitations(
  eventId: string,
  filters: GetEventInvitationsFilters = {}
): Promise<PaginatedResult<EventInvitationWithTicketType>> {
  const supabase = createServiceClient();
  const { status, search, page = 1, page_size = 20 } = filters;

  let query = supabase
    .from('event_invitations')
    .select('*, ticket_type:ticket_types(id, name, price)', { count: 'exact' })
    .eq('event_id', eventId);

  if (status) query = query.eq('status', status);
  if (search && search.trim()) {
    query = query.or(
      `invitee_name.ilike.%${search.trim()}%,invitee_email.ilike.%${search.trim()}%,invitee_company.ilike.%${search.trim()}%`
    );
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch event invitations: ${error.message}`);

  const total = count ?? 0;
  return {
    data: (data ?? []) as EventInvitationWithTicketType[],
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getInvitation(
  id: string
): Promise<EventInvitationWithTicketType | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_invitations')
    .select('*, ticket_type:ticket_types(id, name, price)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch invitation: ${error.message}`);
  return data as EventInvitationWithTicketType | null;
}

export async function getInvitationByToken(
  token: string
): Promise<EventInvitationWithTicketType | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_invitations')
    .select('*, ticket_type:ticket_types(id, name, price)')
    .eq('rsvp_token', token)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch invitation: ${error.message}`);
  return data as EventInvitationWithTicketType | null;
}

export async function updateInvitationStatus(
  id: string,
  status: InvitationStatus
): Promise<EventInvitation> {
  const supabase = createServiceClient();

  const now = new Date().toISOString();
  const updates: Record<string, string | null> = {
    status,
    updated_at: now,
  };

  if (status === 'sent' || status === 'delivered' || status === 'failed') {
    updates.sent_at = now;
  }
  if (status === 'opened') {
    updates.opened_at = now;
  }
  if (['accepted', 'declined', 'waitlisted'].includes(status)) {
    updates.responded_at = now;
  }

  const { data, error } = await supabase
    .from('event_invitations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update invitation status: ${error.message}`);
  return data as EventInvitation;
}

export async function resendInvitations(
  eventId: string,
  filter: 'failed' | 'pending'
): Promise<number> {
  const supabase = createServiceClient();

  let query = supabase
    .from('event_invitations')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('event_id', eventId);

  if (filter === 'failed') {
    query = query.eq('status', 'failed');
  } else {
    query = query.eq('status', 'pending');
  }

  const { data, error } = await query.select('id');

  if (error) throw new Error(`Failed to resend invitations: ${error.message}`);
  return data?.length ?? 0;
}

export async function getInvitationFunnel(
  eventId: string
): Promise<InvitationFunnel> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_invitations')
    .select('status')
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to fetch invitation funnel: ${error.message}`);

  const rows = data ?? [];
  const counts = rows.reduce(
    (acc, row) => {
      acc.total++;
      const s = row.status as InvitationStatus;
      if (s in acc) (acc as unknown as Record<string, number>)[s]++;
      return acc;
    },
    {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      accepted: 0,
      declined: 0,
      waitlisted: 0,
      checked_in: 0,
      failed: 0,
    } as InvitationFunnel
  );

  return counts;
}

export async function checkDuplicateInvitations(
  eventId: string,
  emails: string[]
): Promise<string[]> {
  if (emails.length === 0) return [];

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_invitations')
    .select('invitee_email')
    .eq('event_id', eventId)
    .in('invitee_email', emails);

  if (error) throw new Error(`Failed to check duplicates: ${error.message}`);

  return [...new Set((data ?? []).map((r) => r.invitee_email))];
}

export async function getUserInvitations(
  userId: string
): Promise<EventInvitationWithTicketType[]> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) return [];

  const { data, error } = await supabase
    .from('event_invitations')
    .select('*, ticket_type:ticket_types(id, name, price), event:events(id, title, slug, start_date, end_date, venue, city)')
    .eq('invitee_email', profile.email)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch user invitations: ${error.message}`);
  return (data ?? []) as EventInvitationWithTicketType[];
}
