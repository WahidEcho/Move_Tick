import { createServiceClient } from '@/lib/supabase-server';
import type {
  Event,
  EventInvitation,
  EventMovement,
  Registration,
  Space,
  SpaceMovement,
} from '@/types/database.types';
import type {
  EventAnalytics,
  InvitationFunnel,
  OrganizerDashboardSummary,
  PlatformAnalytics,
} from '@/types/domain.types';

export interface RegistrationTrendPoint {
  date: string;
  count: number;
}

export interface AttendanceTrendPoint {
  hour: number;
  check_ins: number;
  check_outs: number;
}

export async function getEventAnalytics(eventId: string): Promise<EventAnalytics> {
  const supabase = createServiceClient();

  const [regResult, invitationResult, movementResult, spaceResult, redeemResult] = await Promise.all([
    supabase.from('registrations').select('id, status').eq('event_id', eventId),
    supabase.from('event_invitations').select('status').eq('event_id', eventId),
    supabase.from('event_movements').select('id, ticket_id, movement_type').eq('event_id', eventId),
    supabase.from('spaces').select('id, name, capacity').eq('event_id', eventId).eq('is_active', true),
    supabase
      .from('redeem_logs')
      .select('redeem_item_id, quantity')
      .eq('event_id', eventId),
  ]);

  if (regResult.error) throw new Error(`Failed to fetch registrations: ${regResult.error.message}`);
  if (invitationResult.error) throw new Error(`Failed to fetch invitations: ${invitationResult.error.message}`);
  if (movementResult.error) throw new Error(`Failed to fetch movements: ${movementResult.error.message}`);
  if (spaceResult.error) throw new Error(`Failed to fetch spaces: ${spaceResult.error.message}`);
  if (redeemResult.error) throw new Error(`Failed to fetch redeem logs: ${redeemResult.error.message}`);

  const registrations = regResult.data ?? [];
  const invitations = invitationResult.data ?? [];
  const movements = movementResult.data ?? [];
  const spaces = spaceResult.data ?? [];
  const redeemLogs = redeemResult.data ?? [];

  const total_registrations = registrations.length;
  const approved_attendees = registrations.filter(
    (r) => r.status === 'approved' || r.status === 'confirmed'
  ).length;
  const waitlist_count = registrations.filter((r) => r.status === 'waitlisted').length;

  const checkIns = movements.filter((m) => m.movement_type === 'check_in');
  const checkOuts = movements.filter((m) => m.movement_type === 'check_out');
  const uniqueCheckInTickets = new Set(checkIns.map((m) => m.ticket_id));
  const checked_in = uniqueCheckInTickets.size;

  const ticketCheckInCount = new Map<string, number>();
  const ticketCheckOutCount = new Map<string, number>();
  for (const m of checkIns) {
    ticketCheckInCount.set(m.ticket_id, (ticketCheckInCount.get(m.ticket_id) ?? 0) + 1);
  }
  for (const m of checkOuts) {
    ticketCheckOutCount.set(m.ticket_id, (ticketCheckOutCount.get(m.ticket_id) ?? 0) + 1);
  }

  let currently_inside = 0;
  let left_early = 0;
  let no_shows = 0;
  for (const ticketId of uniqueCheckInTickets) {
    const ins = ticketCheckInCount.get(ticketId) ?? 0;
    const outs = ticketCheckOutCount.get(ticketId) ?? 0;
    if (ins > outs) currently_inside++;
    else if (outs > 0) left_early++;
  }
  no_shows = approved_attendees - checked_in;

  const invitation_funnel: InvitationFunnel = {
    total: invitations.length,
    sent: invitations.filter((i) => ['sent', 'delivered', 'opened', 'accepted', 'declined', 'waitlisted', 'checked_in'].includes(i.status)).length,
    delivered: invitations.filter((i) => ['delivered', 'opened', 'accepted', 'declined', 'waitlisted', 'checked_in'].includes(i.status)).length,
    opened: invitations.filter((i) => ['opened', 'accepted', 'declined', 'waitlisted', 'checked_in'].includes(i.status)).length,
    accepted: invitations.filter((i) => i.status === 'accepted').length,
    declined: invitations.filter((i) => i.status === 'declined').length,
    waitlisted: invitations.filter((i) => i.status === 'waitlisted').length,
    checked_in: invitations.filter((i) => i.status === 'checked_in').length,
    failed: invitations.filter((i) => i.status === 'failed').length,
  };

  const space_summaries: { space_id: string; name: string; current_occupancy: number; capacity: number | null }[] = [];
  for (const space of spaces) {
    const { data: spaceMovements } = await supabase
      .from('space_movements')
      .select('ticket_id, movement_type')
      .eq('space_id', space.id);

    const sm = spaceMovements ?? [];
    const spaceCheckIns = sm.filter((m) => m.movement_type === 'check_in');
    const spaceCheckOuts = sm.filter((m) => m.movement_type === 'check_out');
    const spaceTicketCount = new Map<string, number>();
    for (const m of spaceCheckIns) {
      spaceTicketCount.set(m.ticket_id, (spaceTicketCount.get(m.ticket_id) ?? 0) + 1);
    }
    for (const m of spaceCheckOuts) {
      spaceTicketCount.set(m.ticket_id, (spaceTicketCount.get(m.ticket_id) ?? 0) - 1);
    }
    const current_occupancy = Array.from(spaceTicketCount.values()).filter((v) => v > 0).length;

    space_summaries.push({
      space_id: space.id,
      name: space.name,
      current_occupancy,
      capacity: space.capacity,
    });
  }

  const redeemByItem = new Map<string, { redeemed: number; allowed: number }>();
  for (const log of redeemLogs) {
    const curr = redeemByItem.get(log.redeem_item_id) ?? { redeemed: 0, allowed: 0 };
    redeemByItem.set(log.redeem_item_id, {
      ...curr,
      redeemed: curr.redeemed + log.quantity,
    });
  }

  const { data: redeemItems } = await supabase
    .from('redeem_items')
    .select('id, name')
    .eq('event_id', eventId)
    .eq('is_active', true);

  const { data: balances } = await supabase
    .from('ticket_redeem_balances')
    .select('redeem_item_id, total_allowed')
    .in(
      'redeem_item_id',
      (redeemItems ?? []).map((i) => i.id)
    );

  for (const bal of balances ?? []) {
    const curr = redeemByItem.get(bal.redeem_item_id) ?? { redeemed: 0, allowed: 0 };
    redeemByItem.set(bal.redeem_item_id, {
      ...curr,
      allowed: curr.allowed + bal.total_allowed,
    });
  }

  const redeem_summaries = (redeemItems ?? []).map((item) => {
    const s = redeemByItem.get(item.id) ?? { redeemed: 0, allowed: 0 };
    return {
      item_id: item.id,
      name: item.name,
      total_redeemed: s.redeemed,
      total_allowed: s.allowed,
    };
  });

  return {
    total_registrations,
    approved_attendees,
    waitlist_count,
    checked_in,
    currently_inside,
    left_early,
    no_shows,
    invitation_funnel,
    space_summaries,
    redeem_summaries,
  };
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const supabase = createServiceClient();

  const [appsResult, appsPendingResult, orgsResult, eventsResult, regsResult] = await Promise.all([
    supabase.from('organizer_applications').select('id', { count: 'exact', head: true }),
    supabase.from('organizer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('registrations').select('id', { count: 'exact', head: true }),
  ]);

  const total_applications = appsResult.count ?? 0;
  const pending_applications = appsPendingResult.count ?? 0;
  const total_organizations = orgsResult.count ?? 0;
  const total_events = eventsResult.count ?? 0;
  const total_registrations = regsResult.count ?? 0;

  const { data: distinctAttendees } = await supabase
    .from('registrations')
    .select('user_id')
    .in('status', ['approved', 'confirmed']);

  const uniqueAttendees = new Set((distinctAttendees ?? []).map((r) => r.user_id));
  const total_attendees = uniqueAttendees.size;

  return {
    total_applications,
    pending_applications,
    total_organizations,
    total_events,
    total_attendees,
    total_registrations,
  };
}

export async function getOrganizerDashboardSummary(orgId: string): Promise<OrganizerDashboardSummary> {
  const supabase = createServiceClient();

  const now = new Date().toISOString();
  const [upcomingEventsResult, invResult, staffResult, eventsResult] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('start_date', now).eq('is_cancelled', false),
    supabase.from('event_invitations').select('event_id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('event_staff_assignments').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
    supabase.from('events').select('id, title, capacity').eq('organization_id', orgId),
  ]);

  if (eventsResult.error) throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
  const events = eventsResult.data ?? [];
  const eventIds = events.map((e) => e.id);

  const upcoming_events = upcomingEventsResult.count ?? 0;
  const total_invitations = invResult.count ?? 0;
  const active_staff = staffResult.count ?? 0;

  const { count: totalRegs } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .in('event_id', eventIds);

  const total_registrations = totalRegs ?? 0;

  const capacity_overview: { event_id: string; title: string; capacity: number | null; registered: number }[] = [];
  for (const ev of events) {
    const { count: registered } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', ev.id)
      .in('status', ['approved', 'confirmed', 'pending', 'waitlisted']);
    capacity_overview.push({
      event_id: ev.id,
      title: ev.title,
      capacity: ev.capacity,
      registered: registered ?? 0,
    });
  }

  return {
    upcoming_events,
    total_registrations,
    total_invitations,
    active_staff,
    capacity_overview,
  };
}

export async function getRegistrationTrend(
  eventId: string,
  days: number = 30
): Promise<RegistrationTrendPoint[]> {
  const supabase = createServiceClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('registrations')
    .select('created_at')
    .eq('event_id', eventId)
    .gte('created_at', startStr);

  if (error) throw new Error(`Failed to fetch registration trend: ${error.message}`);

  const byDate = new Map<string, number>();
  for (let d = 0; d <= days; d++) {
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + d);
    byDate.set(dt.toISOString().split('T')[0], 0);
  }

  for (const r of data ?? []) {
    const date = r.created_at.split('T')[0];
    if (date >= startStr) {
      byDate.set(date, (byDate.get(date) ?? 0) + 1);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export async function getAttendanceTrend(eventId: string): Promise<AttendanceTrendPoint[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('event_movements')
    .select('movement_type, scanned_at')
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to fetch attendance trend: ${error.message}`);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const byHour = new Map<number, { check_ins: number; check_outs: number }>();
  for (const h of hours) {
    byHour.set(h, { check_ins: 0, check_outs: 0 });
  }

  for (const m of data ?? []) {
    const hour = new Date(m.scanned_at).getHours();
    const curr = byHour.get(hour) ?? { check_ins: 0, check_outs: 0 };
    if (m.movement_type === 'check_in') {
      byHour.set(hour, { ...curr, check_ins: curr.check_ins + 1 });
    } else {
      byHour.set(hour, { ...curr, check_outs: curr.check_outs + 1 });
    }
  }

  return hours.map((hour) => {
    const v = byHour.get(hour) ?? { check_ins: 0, check_outs: 0 };
    return {
      hour,
      check_ins: v.check_ins,
      check_outs: v.check_outs,
    };
  });
}
