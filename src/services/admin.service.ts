import { createServiceClient } from '@/lib/supabase-server';
import { logAdminAction } from './audit.service';
import type { Event } from '@/types/database.types';

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
