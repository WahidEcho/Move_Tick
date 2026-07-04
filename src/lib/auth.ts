import { createClient, createServiceClient } from './supabase-server';
import { redirect, notFound } from 'next/navigation';
import { getEvent, type EventWithDetails } from '@/services/events.service';
import type { Profile, OrgRole, EventStaffRole, Organization } from '@/types/database.types';

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.platform_role !== 'admin') redirect('/');
  return profile;
}

export async function requireOrganizer(organizationId: string): Promise<{
  profile: Profile;
  role: OrgRole;
}> {
  const profile = await requireAuth();
  const supabase = createServiceClient();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', profile.id)
    .single();

  if (!membership) redirect('/');

  return { profile, role: membership.role as OrgRole };
}

export async function getUserOrganizations(userId: string) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(*)
    `)
    .eq('user_id', userId);

  return (data ?? []).map((m) => ({
    ...(m.organization as unknown as Record<string, unknown>),
    role: m.role as OrgRole,
  }));
}

export async function getActiveOrganizerOrg(): Promise<{
  profile: Profile;
  org: import('@/types/database.types').Organization & { role: OrgRole };
}> {
  const profile = await requireAuth();
  const orgs = await getUserOrganizations(profile.id);
  if (!orgs.length) redirect('/apply-organizer');
  return { profile, org: orgs[0] as import('@/types/database.types').Organization & { role: OrgRole } };
}

export async function getUserEventAssignments(userId: string) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('event_staff_assignments')
    .select(`
      *,
      event:events(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  return data ?? [];
}

export async function checkEventStaffRole(
  userId: string,
  eventId: string,
  roles: EventStaffRole[]
): Promise<boolean> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('event_staff_assignments')
    .select('role')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('is_active', true)
    .in('role', roles);

  return (data ?? []).length > 0;
}

/** The caller's role in an organization, or null if they are not a member. */
export async function getOrgRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as OrgRole) ?? null;
}

/** The caller's (first) active staff role on an event, or null if unassigned. */
export async function getEventStaffRole(
  userId: string,
  eventId: string
): Promise<EventStaffRole | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('event_staff_assignments')
    .select('role')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return (data?.role as EventStaffRole) ?? null;
}

export interface EventAccess {
  profile: Profile;
  event: EventWithDetails;
  /** Non-null when the caller is a member of the event's organization. */
  orgRole: OrgRole | null;
  /** Non-null when the caller is assigned as event staff (and not an org member). */
  staffRole: EventStaffRole | null;
  /** Full event management (org member, or the event_manager staff role). */
  canManage: boolean;
}

/**
 * Gate a per-event organizer page. Access is granted to members of the event's
 * organization OR active event staff (assigned co-organizers). Calls notFound()
 * when the event doesn't exist or the caller has no access. Pass
 * `{ manageOnly: true }` for pages that require full management rights.
 */
export async function requireEventAccess(
  eventId: string,
  opts?: { manageOnly?: boolean }
): Promise<EventAccess> {
  const profile = await requireAuth();
  const event = await getEvent(eventId);
  if (!event) notFound();

  const orgRole = await getOrgRole(profile.id, event.organization_id);
  const staffRole = orgRole ? null : await getEventStaffRole(profile.id, eventId);

  if (!orgRole && !staffRole) notFound();

  const canManage = Boolean(orgRole) || staffRole === 'event_manager';
  if (opts?.manageOnly && !canManage) notFound();

  return { profile, event, orgRole, staffRole, canManage };
}

/**
 * Action-safe variant of requireEventAccess for server actions: returns null
 * instead of redirecting/notFound-ing, and only grants MANAGE access (org
 * member or event_manager staff). Use `access.event.organization_id` where the
 * old getActiveOrganizerOrg() pattern used `org.id`.
 */
export async function getEventManageAccess(eventId: string): Promise<EventAccess | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const event = await getEvent(eventId);
  if (!event) return null;

  const orgRole = await getOrgRole(profile.id, event.organization_id);
  const staffRole = orgRole ? null : await getEventStaffRole(profile.id, eventId);

  const canManage = Boolean(orgRole) || staffRole === 'event_manager';
  if (!canManage) return null;

  return { profile, event, orgRole, staffRole, canManage };
}

export interface OrganizerContext {
  profile: Profile;
  /** First org the user belongs to, or null for assignment-only co-organizers. */
  org: (Organization & { role: OrgRole }) | null;
  /** True when the user has at least one active event staff assignment. */
  hasAssignments: boolean;
}

/**
 * Context for the organizer shell. Unlike getActiveOrganizerOrg, this does NOT
 * bounce users who are only assigned as event staff (co-organizers) — they can
 * still reach the portal to manage their assigned events.
 */
export async function getOrganizerContext(): Promise<OrganizerContext> {
  const profile = await requireAuth();
  const orgs = await getUserOrganizations(profile.id);
  const assignments = await getUserEventAssignments(profile.id);
  const hasAssignments = assignments.length > 0;

  if (!orgs.length && !hasAssignments) redirect('/apply-organizer');

  return {
    profile,
    org: (orgs[0] as (Organization & { role: OrgRole })) ?? null,
    hasAssignments,
  };
}

/**
 * Events the user can manage in the organizer portal: everything owned by their
 * organization plus events they're assigned to as staff. Returns owned + shared
 * separately so the UI can label them.
 */
export async function getAccessibleEvents(userId: string): Promise<{
  assigned: EventWithDetails[];
}> {
  const assignments = await getUserEventAssignments(userId);
  const seen = new Set<string>();
  const assigned: EventWithDetails[] = [];
  for (const a of assignments) {
    const ev = (a as { event?: EventWithDetails }).event;
    if (ev && !seen.has(ev.id)) {
      seen.add(ev.id);
      assigned.push(ev);
    }
  }
  return { assigned };
}
