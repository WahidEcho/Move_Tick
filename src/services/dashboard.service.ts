import { createServiceClient } from '@/lib/supabase-server';
import { getExpiryThresholdISO } from '@/lib/event-visibility';
import type { OrganizationStatus, UserRole } from '@/types/database.types';

export type DashboardRange = 'today' | '7d' | '30d' | 'all';

function rangeSinceISO(range: DashboardRange): string | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today':
      return new Date(now - day).toISOString();
    case '7d':
      return new Date(now - 7 * day).toISOString();
    case '30d':
      return new Date(now - 30 * day).toISOString();
    case 'all':
      return null;
  }
}

export interface AdminDashboardData {
  range: DashboardRange;
  platform: {
    orgsByStatus: Record<OrganizationStatus, number>;
    usersByRole: Record<UserRole, number>;
    usersDisabled: number;
    eventsTotal: number;
    eventsPublished: number;
    eventsDraft: number;
    eventsCancelled: number;
    eventsHidden: number;
    eventsArchived: number;
    eventsExpired: number;
    newOrgsInRange: number;
    newUsersInRange: number;
  };
  revenue: {
    grossVolumeEgp: number;
    paidOrdersCount: number;
    defaultCommissionPercentage: number;
    defaultFixedFeeEgp: number;
    orgsWithCustomCommission: number;
  };
  eventPerformance: {
    topBySales: { id: string; title: string; orgName: string; revenueEgp: number }[];
    endingSoon: { id: string; title: string; orgName: string; startDate: string }[];
    recentlyExpired: { id: string; title: string; orgName: string; endDate: string }[];
  };
  orgPerformance: {
    topByEvents: { id: string; name: string; eventsCount: number }[];
    suspendedOrHold: { id: string; name: string; status: OrganizationStatus }[];
  };
  alerts: {
    pendingApplications: number;
    failedEmailsInRange: number;
    orgsAtLimit: number;
    draftsAwaitingApproval: number;
    contractsUnsigned: number;
  };
}

const EMPTY_ORG_STATUS: Record<OrganizationStatus, number> = {
  active: 0,
  pending: 0,
  suspended: 0,
  on_hold: 0,
  rejected: 0,
};

const EMPTY_USER_ROLE: Record<UserRole, number> = {
  attendee: 0,
  organizer: 0,
  admin: 0,
  support: 0,
};

export async function getAdminDashboard(range: DashboardRange = '7d'): Promise<AdminDashboardData> {
  const supabase = createServiceClient();
  const since = rangeSinceISO(range);
  const expiryThreshold = await getExpiryThresholdISO();

  const [
    orgsRes,
    profilesRes,
    eventsRes,
    paymentsRes,
    settingsRes,
    applicationsRes,
    failedEmailsRes,
    contractsRes,
  ] = await Promise.all([
    supabase.from('organizations').select('id, name, status, archived_at, commission_percentage, created_at'),
    supabase.from('profiles').select('platform_role, is_disabled, created_at'),
    supabase
      .from('events')
      .select(
        'id, title, organization_id, is_published, is_cancelled, is_hidden, archived_at, start_date, end_date, organization:organizations(id, name)'
      ),
    since
      ? supabase.from('payments').select('event_id, amount_total, status, created_at').eq('status', 'paid').gte('created_at', since)
      : supabase.from('payments').select('event_id, amount_total, status, created_at').eq('status', 'paid'),
    supabase.from('platform_settings').select('commission_percentage, fixed_fee_egp').limit(1).maybeSingle(),
    supabase.from('organizer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    since
      ? supabase.from('email_log').select('id', { count: 'exact', head: true }).eq('delivery_status', 'failed').gte('sent_at', since)
      : supabase.from('email_log').select('id', { count: 'exact', head: true }).eq('delivery_status', 'failed'),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).not('contract_status', 'in', '(signed,completed)'),
  ]);

  const orgs = orgsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const events = eventsRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const liveOrgs = orgs.filter((o) => !o.archived_at);
  const orgsByStatus = { ...EMPTY_ORG_STATUS };
  for (const o of liveOrgs) {
    const status = o.status as OrganizationStatus;
    orgsByStatus[status] = (orgsByStatus[status] ?? 0) + 1;
  }

  const usersByRole = { ...EMPTY_USER_ROLE };
  let usersDisabled = 0;
  for (const p of profiles) {
    const role = p.platform_role as UserRole;
    usersByRole[role] = (usersByRole[role] ?? 0) + 1;
    if (p.is_disabled) usersDisabled++;
  }

  const liveEvents = events.filter((e) => !e.archived_at);
  const eventsPublished = liveEvents.filter((e) => e.is_published && !e.is_cancelled).length;
  const eventsDraft = liveEvents.filter((e) => !e.is_published && !e.is_cancelled).length;
  const eventsCancelled = liveEvents.filter((e) => e.is_cancelled).length;
  const eventsHidden = liveEvents.filter((e) => e.is_hidden).length;
  const eventsArchived = events.length - liveEvents.length;
  const eventsExpired = liveEvents.filter((e) => !e.is_cancelled && e.end_date < expiryThreshold).length;

  const newOrgsInRange = since ? orgs.filter((o) => o.created_at >= since).length : orgs.length;
  const newUsersInRange = since ? profiles.filter((p) => p.created_at >= since).length : profiles.length;

  // Revenue (scaffold): gross paid volume from real payments, alongside the
  // configured commission settings — checkout math itself is unchanged this
  // round, so this is informational, not a computed commission owed.
  const grossVolumeMinor = payments.reduce((sum, p) => sum + (p.amount_total ?? 0), 0);
  const orgsWithCustomCommission = liveOrgs.filter(
    (o) => (o as { commission_percentage?: number | null }).commission_percentage != null
  ).length;

  const revenueByEvent = new Map<string, number>();
  for (const p of payments) {
    revenueByEvent.set(p.event_id, (revenueByEvent.get(p.event_id) ?? 0) + (p.amount_total ?? 0));
  }
  const eventById = new Map(events.map((e) => [e.id, e]));
  const topBySales = [...revenueByEvent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([eventId, revenueMinor]) => {
      const ev = eventById.get(eventId);
      return {
        id: eventId,
        title: ev?.title ?? 'Unknown event',
        orgName: (ev?.organization as { name?: string } | null)?.name ?? '—',
        revenueEgp: revenueMinor / 100,
      };
    });

  const now = new Date().toISOString();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const endingSoon = liveEvents
    .filter((e) => e.is_published && !e.is_cancelled && e.start_date >= now && e.start_date <= in7Days)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      title: e.title,
      orgName: (e.organization as { name?: string } | null)?.name ?? '—',
      startDate: e.start_date,
    }));

  const recentlyExpired = liveEvents
    .filter((e) => !e.is_cancelled && e.end_date < expiryThreshold)
    .sort((a, b) => b.end_date.localeCompare(a.end_date))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      title: e.title,
      orgName: (e.organization as { name?: string } | null)?.name ?? '—',
      endDate: e.end_date,
    }));

  const eventsCountByOrg = new Map<string, number>();
  for (const e of liveEvents) {
    eventsCountByOrg.set(e.organization_id, (eventsCountByOrg.get(e.organization_id) ?? 0) + 1);
  }
  const topByEvents = [...eventsCountByOrg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([orgId, count]) => ({
      id: orgId,
      name: liveOrgs.find((o) => o.id === orgId)?.name ?? '—',
      eventsCount: count,
    }));

  const suspendedOrHold = liveOrgs
    .filter((o) => o.status === 'suspended' || o.status === 'on_hold')
    .slice(0, 10)
    .map((o) => ({ id: o.id, name: o.name, status: o.status }));

  // "Reaching limits" — orgs whose live event count has hit their configured cap.
  const { data: orgLimits } = await supabase
    .from('organizations')
    .select('id, max_events, max_published_events')
    .is('archived_at', null);
  let orgsAtLimit = 0;
  for (const o of orgLimits ?? []) {
    const count = eventsCountByOrg.get(o.id) ?? 0;
    const publishedCount = liveEvents.filter((e) => e.organization_id === o.id && e.is_published).length;
    if ((o.max_events != null && count >= o.max_events) || (o.max_published_events != null && publishedCount >= o.max_published_events)) {
      orgsAtLimit++;
    }
  }

  const { data: approvalOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('requires_publish_approval', true)
    .is('archived_at', null);
  const approvalOrgIds = new Set((approvalOrgs ?? []).map((o) => o.id));
  const draftsAwaitingApproval = liveEvents.filter(
    (e) => !e.is_published && !e.is_cancelled && approvalOrgIds.has(e.organization_id)
  ).length;

  return {
    range,
    platform: {
      orgsByStatus,
      usersByRole,
      usersDisabled,
      eventsTotal: liveEvents.length,
      eventsPublished,
      eventsDraft,
      eventsCancelled,
      eventsHidden,
      eventsArchived,
      eventsExpired,
      newOrgsInRange,
      newUsersInRange,
    },
    revenue: {
      grossVolumeEgp: grossVolumeMinor / 100,
      paidOrdersCount: payments.length,
      defaultCommissionPercentage: settingsRes.data?.commission_percentage ?? 0,
      defaultFixedFeeEgp: settingsRes.data?.fixed_fee_egp ?? 0,
      orgsWithCustomCommission,
    },
    eventPerformance: { topBySales, endingSoon, recentlyExpired },
    orgPerformance: { topByEvents, suspendedOrHold },
    alerts: {
      pendingApplications: applicationsRes.count ?? 0,
      failedEmailsInRange: failedEmailsRes.count ?? 0,
      orgsAtLimit,
      draftsAwaitingApproval,
      contractsUnsigned: contractsRes.count ?? 0,
    },
  };
}
