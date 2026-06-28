import { createServiceClient, createClient } from '@/lib/supabase-server';
import type {
  Registration,
  RegistrationStatus,
  AttendeePresence,
} from '@/types/database.types';
import type { AttendeeDetails, PaginatedResult } from '@/types/domain.types';
import { derivePresence } from '@/lib/helpers';
import * as ticketsService from './tickets.service';

export interface AttendeeSearchResult {
  ticket_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type_name: string;
  is_checked_in: boolean;
  ticket_active: boolean;
  score: number;
}

/**
 * Typo-tolerant fuzzy attendee search for organizer/staff door lookup. Uses the
 * request-scoped AUTHENTICATED client so the search_event_attendees RPC's
 * event-role gate (can_operate_event) applies. Same RPC the mobile app uses.
 */
export async function fuzzySearchAttendees(
  eventId: string,
  query: string
): Promise<AttendeeSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_event_attendees', {
    p_event_id: eventId,
    p_query: query,
  });
  if (error) throw new Error(`Attendee search failed: ${error.message}`);
  return (data ?? []) as AttendeeSearchResult[];
}

export interface GetEventAttendeesFilters {
  status?: RegistrationStatus;
  presence?: AttendeePresence;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface RegistrationWithJoins extends Omit<Registration, 'profile' | 'ticket_type' | 'ticket'> {
  profile?: { id: string; full_name: string | null; email: string; phone: string | null } | null;
  ticket_type?: { id: string; name: string; price: number } | null;
  ticket?: { id: string; qr_token: string | null; is_active: boolean } | null;
  presence?: AttendeePresence;
}

export interface ExportAttendeeRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  ticket_type_name: string;
  status: RegistrationStatus;
  presence: AttendeePresence;
  qr_token: string | null;
  created_at: string;
}

export async function getEventAttendees(
  eventId: string,
  filters: GetEventAttendeesFilters = {}
): Promise<PaginatedResult<RegistrationWithJoins>> {
  const supabase = createServiceClient();
  const { status, presence, search, page = 1, page_size = 20 } = filters;

  // When presence filter is used, we need to derive it from movements
  let userIdsToFilter: string[] | null = null;
  if (presence) {
    const { data: movements } = await supabase
      .from('event_movements')
      .select('user_id, movement_type, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    const userLastMovement = new Map<string, { movement_type: string }[]>();
    for (const m of movements ?? []) {
      const arr = userLastMovement.get(m.user_id) ?? [];
      arr.push({ movement_type: m.movement_type });
      userLastMovement.set(m.user_id, arr);
    }

    userIdsToFilter = [];
    for (const [userId, movs] of userLastMovement) {
      const p = derivePresence(movs);
      if (p === presence) userIdsToFilter.push(userId);
    }
    if (presence === 'never_arrived') {
      let regQuery = supabase
        .from('registrations')
        .select('user_id')
        .eq('event_id', eventId);
      if (status) regQuery = regQuery.eq('status', status);
      const { data: regs } = await regQuery;
      const registeredUserIds = new Set((regs ?? []).map((r) => r.user_id));
      for (const uid of registeredUserIds) {
        if (!userLastMovement.has(uid)) userIdsToFilter.push(uid);
      }
    }
  }

  let query = supabase
    .from('registrations')
    .select(
      '*, profile:profiles(id, full_name, email, phone), ticket_type:ticket_types(id, name, price), ticket:tickets(id, qr_token, is_active)',
      { count: 'exact' }
    )
    .eq('event_id', eventId);

  if (status) query = query.eq('status', status);
  if (userIdsToFilter !== null) {
    if (userIdsToFilter.length === 0) {
      return { data: [], total: 0, page, page_size, total_pages: 0 };
    }
    query = query.in('user_id', userIdsToFilter);
  }
  if (search?.trim()) {
    const { data: matchingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .or(
        `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`
      );
    const matchingUserIds = (matchingProfiles ?? []).map((p) => p.id);
    if (matchingUserIds.length === 0) {
      return { data: [], total: 0, page, page_size, total_pages: 0 };
    }
    query = query.in('user_id', matchingUserIds);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: registrations, error, count } = await query;

  if (error) throw new Error(`Failed to fetch attendees: ${error.message}`);

  const { data: movements } = await supabase
    .from('event_movements')
    .select('user_id, movement_type')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const userMovements = new Map<string, { movement_type: string }[]>();
  for (const m of movements ?? []) {
    const arr = userMovements.get(m.user_id) ?? [];
    arr.push({ movement_type: m.movement_type });
    userMovements.set(m.user_id, arr);
  }

  const registeredUserIds = new Set((registrations ?? []).map((r) => r.user_id));
  const data: RegistrationWithJoins[] = (registrations ?? []).map((r) => ({
    ...r,
    presence: derivePresence(
      userMovements.get(r.user_id) ?? []
    ) as AttendeePresence,
  }));
  for (const uid of registeredUserIds) {
    if (!userMovements.has(uid) && presence !== 'never_arrived') {
      const reg = data.find((r) => r.user_id === uid);
      if (reg) reg.presence = 'never_arrived' as AttendeePresence;
    }
  }

  const total = count ?? 0;
  return {
    data,
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size) || 1,
  };
}

export async function getAttendeeDetails(
  eventId: string,
  userId: string
): Promise<AttendeeDetails | null> {
  const supabase = createServiceClient();

  const { data: registration, error: regError } = await supabase
    .from('registrations')
    .select(
      '*, profile:profiles(*), ticket_type:ticket_types(*), ticket:tickets(*)'
    )
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (regError || !registration) return null;

  const { data: movements } = await supabase
    .from('event_movements')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const { data: spaceParticipations } = await supabase
    .from('space_movements')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId);

  const ticketId = registration.ticket_id;
  let redeemHistory: { item_name: string; quantity: number; redeemed_at: string }[] = [];
  if (ticketId) {
    const { data: redeemLogs } = await supabase
      .from('redeem_logs')
      .select('redeem_item:redeem_items(name), quantity, redeemed_at')
      .eq('ticket_id', ticketId);
    redeemHistory = (redeemLogs ?? []).map((r) => {
      const item = r.redeem_item as unknown as { name: string } | null;
      return {
        item_name: item?.name ?? 'Unknown',
        quantity: r.quantity as number,
        redeemed_at: r.redeemed_at as string,
      };
    });
  }

  const presence = derivePresence(
    (movements ?? []).map((m) => ({ movement_type: m.movement_type }))
  ) as AttendeePresence;

  return {
    registration: registration as unknown as Registration,
    ticket: registration.ticket ?? null,
    profile: registration.profile,
    presence,
    movements: movements ?? [],
    space_participations: spaceParticipations ?? [],
    redeem_history: redeemHistory,
  };
}

export async function approveRegistration(
  registrationId: string
): Promise<Registration> {
  const supabase = createServiceClient();

  const { data: registration, error: fetchError } = await supabase
    .from('registrations')
    .select('*, event_id, ticket_type_id, user_id')
    .eq('id', registrationId)
    .single();

  if (fetchError || !registration)
    throw new Error(`Registration not found: ${fetchError?.message ?? 'Unknown'}`);

  if (registration.status !== 'pending' && registration.status !== 'waitlisted')
    throw new Error('Registration cannot be approved in current status');

  const ticket = await ticketsService.issueTicket(
    registration.event_id,
    registration.ticket_type_id,
    registration.user_id
  );

  const { data: updated, error } = await supabase
    .from('registrations')
    .update({
      status: 'approved',
      ticket_id: ticket.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve registration: ${error.message}`);
  return updated as Registration;
}

export async function rejectRegistration(
  registrationId: string
): Promise<Registration> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('registrations')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to reject registration: ${error.message}`);
  return data as Registration;
}

export async function cancelRegistration(
  registrationId: string
): Promise<Registration> {
  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from('registrations')
    .select('ticket_id')
    .eq('id', registrationId)
    .single();

  if (registration?.ticket_id) {
    await ticketsService.deactivateTicket(registration.ticket_id);
  }

  const { data, error } = await supabase
    .from('registrations')
    .update({
      status: 'cancelled',
      ticket_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to cancel registration: ${error.message}`);
  return data as Registration;
}

export async function getWaitlistedAttendees(
  eventId: string
): Promise<Registration[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('registrations')
    .select(
      '*, profile:profiles(id, full_name, email, phone), ticket_type:ticket_types(id, name)'
    )
    .eq('event_id', eventId)
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch waitlisted attendees: ${error.message}`);
  return (data ?? []) as Registration[];
}

export async function promoteFromWaitlist(
  registrationId: string
): Promise<Registration> {
  const supabase = createServiceClient();

  const { data: registration, error: fetchError } = await supabase
    .from('registrations')
    .select('*, event_id, ticket_type_id, user_id')
    .eq('id', registrationId)
    .single();

  if (fetchError || !registration)
    throw new Error(`Registration not found: ${fetchError?.message ?? 'Unknown'}`);

  if (registration.status !== 'waitlisted')
    throw new Error('Registration is not waitlisted');

  const available = await ticketsService.getTicketTypeAvailability(
    registration.ticket_type_id
  );
  if (available <= 0)
    throw new Error('No capacity available for this ticket type');

  return approveRegistration(registrationId);
}

export async function exportAttendees(
  eventId: string
): Promise<ExportAttendeeRow[]> {
  const supabase = createServiceClient();

  const { data: registrations, error } = await supabase
    .from('registrations')
    .select(
      'id, user_id, status, created_at, profile:profiles(id, full_name, email, phone), ticket_type:ticket_types(name), ticket:tickets(qr_token)'
    )
    .eq('event_id', eventId)
    .in('status', ['approved', 'confirmed'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch attendees for export: ${error.message}`);

  const { data: movements } = await supabase
    .from('event_movements')
    .select('user_id, movement_type')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const userMovements = new Map<string, { movement_type: string }[]>();
  for (const m of movements ?? []) {
    const arr = userMovements.get(m.user_id) ?? [];
    arr.push({ movement_type: m.movement_type });
    userMovements.set(m.user_id, arr);
  }

  return (registrations ?? []).map((r) => {
    const profile = r.profile as unknown as { full_name: string | null; email: string; phone: string | null } | null;
    const ticketType = r.ticket_type as unknown as { name: string } | null;
    const ticket = r.ticket as unknown as { qr_token: string | null } | null;
    const presence = derivePresence(
      userMovements.get(r.user_id) ?? []
    ) as AttendeePresence;
    return {
      id: r.id,
      user_id: r.user_id,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? '',
      phone: profile?.phone ?? null,
      ticket_type_name: ticketType?.name ?? '',
      status: r.status as RegistrationStatus,
      presence,
      qr_token: ticket?.qr_token ?? null,
      created_at: r.created_at,
    };
  });
}
