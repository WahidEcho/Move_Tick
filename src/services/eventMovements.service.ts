import { createServiceClient } from '@/lib/supabase-server';
import type { EventMovement, MovementType, AttendeePresence } from '@/types/database.types';
import type { PaginatedResult } from '@/types/domain.types';
import { derivePresence } from '@/lib/helpers';

export interface GetEventMovementsFilters {
  page?: number;
  page_size?: number;
  user_id?: string;
  movement_type?: MovementType;
}

export interface LiveAttendanceSummary {
  currently_inside: number;
  total_checked_in: number;
  total_left: number;
  never_arrived: number;
  re_entries: number;
}

function determineNextMovementType(
  movements: { movement_type: string }[]
): MovementType {
  if (movements.length === 0) return 'check_in';
  const last = movements[movements.length - 1];
  return last.movement_type === 'check_in' ? 'check_out' : 'check_in';
}

export async function recordMovement(
  eventId: string,
  ticketId: string,
  userId: string,
  scannedBy?: string | null
): Promise<EventMovement> {
  const supabase = createServiceClient();

  const { data: movements } = await supabase
    .from('event_movements')
    .select('movement_type')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const movementType = determineNextMovementType(movements ?? []);

  const { data, error } = await supabase
    .from('event_movements')
    .insert({
      event_id: eventId,
      ticket_id: ticketId,
      user_id: userId,
      movement_type: movementType,
      scanned_by: scannedBy ?? null,
      scanned_at: new Date().toISOString(),
      is_system_generated: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record movement: ${error.message}`);
  return data as EventMovement;
}

export async function processQRScan(
  eventId: string,
  qrToken: string,
  scannedBy?: string | null
): Promise<EventMovement> {
  const supabase = createServiceClient();

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, event_id, user_id, is_active')
    .eq('qr_token', qrToken)
    .single();

  if (ticketError || !ticket)
    throw new Error('Ticket not found');
  if (ticket.event_id !== eventId)
    throw new Error('Ticket does not belong to this event');
  if (!ticket.is_active)
    throw new Error('Ticket is not active');

  return recordMovement(eventId, ticket.id, ticket.user_id, scannedBy);
}

export async function getEventMovements(
  eventId: string,
  filters: GetEventMovementsFilters = {}
): Promise<PaginatedResult<EventMovement>> {
  const supabase = createServiceClient();
  const { page = 1, page_size = 20, user_id, movement_type } = filters;

  let query = supabase
    .from('event_movements')
    .select('*', { count: 'exact' })
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (movement_type) query = query.eq('movement_type', movement_type);

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch movements: ${error.message}`);

  return {
    data: (data ?? []) as EventMovement[],
    total: count ?? 0,
    page,
    page_size,
    total_pages: Math.ceil((count ?? 0) / page_size) || 1,
  };
}

export async function getAttendeeMovements(
  eventId: string,
  userId: string
): Promise<EventMovement[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_movements')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch attendee movements: ${error.message}`);
  return (data ?? []) as EventMovement[];
}

export async function getMovementsByTicketId(
  ticketId: string
): Promise<EventMovement[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_movements')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch ticket movements: ${error.message}`);
  return (data ?? []) as EventMovement[];
}

export async function getAttendeePresence(
  eventId: string,
  userId: string
): Promise<AttendeePresence> {
  const movements = await getAttendeeMovements(eventId, userId);
  return derivePresence(
    movements.map((m) => ({ movement_type: m.movement_type }))
  ) as AttendeePresence;
}

export async function getLiveAttendanceSummary(
  eventId: string
): Promise<LiveAttendanceSummary> {
  const supabase = createServiceClient();

  const { data: movements } = await supabase
    .from('event_movements')
    .select('user_id, movement_type')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const { data: registrations } = await supabase
    .from('registrations')
    .select('user_id')
    .eq('event_id', eventId)
    .in('status', ['approved', 'confirmed']);

  const registeredUserIds = new Set(
    (registrations ?? []).map((r) => r.user_id)
  );
  const userMovements = new Map<string, { movement_type: string }[]>();
  for (const m of movements ?? []) {
    const arr = userMovements.get(m.user_id) ?? [];
    arr.push({ movement_type: m.movement_type });
    userMovements.set(m.user_id, arr);
  }

  let currentlyInside = 0;
  let totalCheckedIn = 0;
  let totalLeft = 0;
  let neverArrived = 0;
  let reEntries = 0;

  for (const userId of registeredUserIds) {
    const movs = userMovements.get(userId) ?? [];
    if (movs.length === 0) {
      neverArrived++;
      continue;
    }
    totalCheckedIn++;
    const presence = derivePresence(movs);
    if (presence === 'inside_event') {
      currentlyInside++;
    } else {
      totalLeft++;
    }
    const checkIns = movs.filter((m) => m.movement_type === 'check_in').length;
    if (checkIns > 1) reEntries += checkIns - 1;
  }

  return {
    currently_inside: currentlyInside,
    total_checked_in: totalCheckedIn,
    total_left: totalLeft,
    never_arrived: neverArrived,
    re_entries: reEntries,
  };
}

export async function autoCheckoutAll(eventId: string): Promise<number> {
  const supabase = createServiceClient();

  const summary = await getLiveAttendanceSummary(eventId);
  if (summary.currently_inside === 0) return 0;

  const { data: movements } = await supabase
    .from('event_movements')
    .select('user_id, ticket_id')
    .eq('event_id', eventId)
    .eq('movement_type', 'check_in')
    .order('created_at', { ascending: false });

  const lastCheckInByUser = new Map<string, { ticket_id: string }>();
  for (const m of movements ?? []) {
    if (!lastCheckInByUser.has(m.user_id)) {
      lastCheckInByUser.set(m.user_id, { ticket_id: m.ticket_id });
    }
  }

  const { data: allMovements } = await supabase
    .from('event_movements')
    .select('user_id, movement_type, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const userLastMovement = new Map<string, string>();
  for (const m of allMovements ?? []) {
    userLastMovement.set(m.user_id, m.movement_type);
  }

  const toCheckOut: { ticket_id: string; user_id: string }[] = [];
  for (const [userId, lastType] of userLastMovement) {
    if (lastType === 'check_in') {
      const info = lastCheckInByUser.get(userId);
      if (info) toCheckOut.push({ ticket_id: info.ticket_id, user_id: userId });
    }
  }

  const inserted: EventMovement[] = [];
  for (const { ticket_id, user_id } of toCheckOut) {
    const { data } = await supabase
      .from('event_movements')
      .insert({
        event_id: eventId,
        ticket_id,
        user_id,
        movement_type: 'check_out',
        scanned_by: null,
        scanned_at: new Date().toISOString(),
        is_system_generated: true,
      })
      .select()
      .single();
    if (data) inserted.push(data as EventMovement);
  }

  return inserted.length;
}
