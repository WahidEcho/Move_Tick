import { createServiceClient } from '@/lib/supabase-server';
import { logAdminAction } from './audit.service';
import { updateOrganization, type UpdateOrganizationData } from './organizations.service';
import type { Event, Json, Organization, OrganizationStatus } from '@/types/database.types';

/**
 * Super-admin mutations for events. Every function assumes the caller has
 * already verified the actor is a platform admin (requireAdmin()) — this
 * layer only performs the mutation and appends an audit_log entry. Actual
 * event *editing* (title, dates, description, ticket types, spaces, staff
 * assignment, etc.) reuses the existing organizer event-management UI:
 * requireEventAccess() grants platform admins full manage access to any
 * event, so /organizer/events/{id}/... works for admins without a parallel
 * admin-only UI.
 */

async function getEventRow(id: string): Promise<Event | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
  return data as Event | null;
}

export async function adminSetEventHidden(
  eventId: string,
  hidden: boolean,
  actorId: string,
  reason?: string | null
): Promise<Event> {
  const supabase = createServiceClient();
  const before = await getEventRow(eventId);

  const { data, error } = await supabase
    .from('events')
    .update({ is_hidden: hidden, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to ${hidden ? 'hide' : 'unhide'} event: ${error.message}`);

  await logAdminAction({
    actorId,
    action: hidden ? 'event.hide' : 'event.unhide',
    targetType: 'event',
    targetId: eventId,
    previousValue: { is_hidden: before?.is_hidden ?? null },
    newValue: { is_hidden: hidden },
    reason: reason ?? null,
  });

  return data as Event;
}

export async function adminSetEventPublished(
  eventId: string,
  published: boolean,
  actorId: string,
  reason?: string | null
): Promise<Event> {
  const supabase = createServiceClient();
  const before = await getEventRow(eventId);

  const { data, error } = await supabase
    .from('events')
    .update({ is_published: published, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to ${published ? 'publish' : 'unpublish'} event: ${error.message}`);

  await logAdminAction({
    actorId,
    action: published ? 'event.publish' : 'event.unpublish',
    targetType: 'event',
    targetId: eventId,
    previousValue: { is_published: before?.is_published ?? null },
    newValue: { is_published: published },
    reason: reason ?? null,
  });

  return data as Event;
}

/** Soft delete: archives the event (hidden everywhere public) without touching tickets/registrations/analytics. */
export async function adminArchiveEvent(
  eventId: string,
  actorId: string,
  reason?: string | null
): Promise<Event> {
  const supabase = createServiceClient();
  const before = await getEventRow(eventId);

  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: new Date().toISOString(), is_hidden: true, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to archive event: ${error.message}`);

  await logAdminAction({
    actorId,
    action: 'event.archive',
    targetType: 'event',
    targetId: eventId,
    previousValue: { archived_at: before?.archived_at ?? null },
    newValue: { archived_at: data.archived_at },
    reason: reason ?? null,
  });

  return data as Event;
}

export async function adminRestoreEvent(eventId: string, actorId: string, reason?: string | null): Promise<Event> {
  const supabase = createServiceClient();
  const before = await getEventRow(eventId);

  const { data, error } = await supabase
    .from('events')
    .update({ archived_at: null, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to restore event: ${error.message}`);

  await logAdminAction({
    actorId,
    action: 'event.restore',
    targetType: 'event',
    targetId: eventId,
    previousValue: { archived_at: before?.archived_at ?? null },
    newValue: { archived_at: null },
    reason: reason ?? null,
  });

  return data as Event;
}

export async function adminChangeEventOrganizer(
  eventId: string,
  newOrganizationId: string,
  actorId: string,
  reason?: string | null
): Promise<Event> {
  const supabase = createServiceClient();
  const before = await getEventRow(eventId);

  const { data, error } = await supabase
    .from('events')
    .update({ organization_id: newOrganizationId, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(`Failed to change event organizer: ${error.message}`);

  await logAdminAction({
    actorId,
    action: 'event.change_organizer',
    targetType: 'event',
    targetId: eventId,
    previousValue: { organization_id: before?.organization_id ?? null },
    newValue: { organization_id: newOrganizationId },
    reason: reason ?? null,
  });

  return data as Event;
}

/**
 * Super-admin mutations for organizations. Same pattern as the event
 * functions above: pure mutation + audit_log entry, no auth check (the
 * actions.ts layer already called requireAdmin()). Notifications/admin
 * alerts for status changes live in actions.ts, not here.
 */

async function getOrgRow(id: string): Promise<Organization | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  return data as Organization | null;
}

/** Edits any combination of an org's basic info, contact, limits, or commission fields. */
export async function adminUpdateOrganization(
  orgId: string,
  data: UpdateOrganizationData,
  actorId: string,
  reason?: string | null
): Promise<Organization> {
  const before = await getOrgRow(orgId);
  const org = await updateOrganization(orgId, data);

  await logAdminAction({
    actorId,
    action: 'organization.update',
    targetType: 'organization',
    targetId: orgId,
    previousValue: before
      ? (Object.fromEntries(Object.keys(data).map((k) => [k, (before as unknown as Record<string, unknown>)[k] ?? null])) as Json)
      : null,
    newValue: data as Json,
    reason: reason ?? null,
  });

  return org;
}

/**
 * Suspend/hold/reactivate/reject. Syncs the legacy is_active flag, and — when
 * the org has hide_events_on_suspend enabled — hides its live events on
 * suspend/hold (never on reject, since a rejected org never had live events).
 */
export async function adminSetOrgStatus(
  orgId: string,
  status: OrganizationStatus,
  actorId: string,
  reason?: string | null
): Promise<Organization> {
  const supabase = createServiceClient();
  const before = await getOrgRow(orgId);
  if (!before) throw new Error('Organization not found');

  const { data, error } = await supabase
    .from('organizations')
    .update({
      status,
      is_active: status === 'active',
      suspended_reason: status === 'suspended' || status === 'on_hold' ? (reason ?? null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update organization status: ${error.message}`);

  if ((status === 'suspended' || status === 'on_hold') && before.hide_events_on_suspend) {
    await supabase
      .from('events')
      .update({ is_hidden: true, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .is('archived_at', null);
  }

  await logAdminAction({
    actorId,
    action: `organization.set_status`,
    targetType: 'organization',
    targetId: orgId,
    previousValue: { status: before.status },
    newValue: { status },
    reason: reason ?? null,
  });

  return data as Organization;
}

/**
 * Soft delete: never removes events/tickets/users. Suspends the org, hides
 * ALL its live events unconditionally (stronger than a normal suspend, which
 * only hides events if hide_events_on_suspend is set), and marks archived_at.
 */
export async function adminArchiveOrganization(
  orgId: string,
  actorId: string,
  reason: string | null
): Promise<Organization> {
  const supabase = createServiceClient();
  const before = await getOrgRow(orgId);
  if (!before) throw new Error('Organization not found');

  const { data, error } = await supabase
    .from('organizations')
    .update({
      archived_at: new Date().toISOString(),
      status: 'suspended' as OrganizationStatus,
      is_active: false,
      suspended_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw new Error(`Failed to archive organization: ${error.message}`);

  await supabase
    .from('events')
    .update({ is_hidden: true, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .is('archived_at', null);

  await logAdminAction({
    actorId,
    action: 'organization.archive',
    targetType: 'organization',
    targetId: orgId,
    previousValue: { archived_at: before.archived_at, status: before.status },
    newValue: { archived_at: data.archived_at, status: data.status },
    reason: reason ?? null,
  });

  return data as Organization;
}

export async function adminRestoreOrganization(
  orgId: string,
  actorId: string,
  reason?: string | null
): Promise<Organization> {
  const supabase = createServiceClient();
  const before = await getOrgRow(orgId);
  if (!before) throw new Error('Organization not found');

  const { data, error } = await supabase
    .from('organizations')
    .update({
      archived_at: null,
      status: 'active' as OrganizationStatus,
      is_active: true,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) throw new Error(`Failed to restore organization: ${error.message}`);

  await logAdminAction({
    actorId,
    action: 'organization.restore',
    targetType: 'organization',
    targetId: orgId,
    previousValue: { archived_at: before.archived_at, status: before.status },
    newValue: { archived_at: null, status: 'active' },
    reason: reason ?? null,
  });

  return data as Organization;
}
