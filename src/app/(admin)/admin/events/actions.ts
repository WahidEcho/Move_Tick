'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  adminSetEventHidden,
  adminSetEventPublished,
  adminArchiveEvent,
  adminRestoreEvent,
  adminChangeEventOrganizer,
} from '@/services/admin.service';
import { getOrganizations } from '@/services/organizations.service';
import { getEventsForAdmin, getRegistrationCountsByEvent } from '@/services/events.service';
import { getExpiryThresholdISO } from '@/lib/event-visibility';
import { toCSV } from '@/lib/csv';

export async function setEventHiddenAction(eventId: string, hidden: boolean, reason?: string) {
  const profile = await requireAdmin();
  await adminSetEventHidden(eventId, hidden, profile.id, reason || null);
  revalidatePath('/admin/events');
  return { success: true };
}

export async function setEventPublishedAction(eventId: string, published: boolean, reason?: string) {
  const profile = await requireAdmin();
  await adminSetEventPublished(eventId, published, profile.id, reason || null);
  revalidatePath('/admin/events');
  return { success: true };
}

export async function archiveEventAction(eventId: string, reason: string) {
  const profile = await requireAdmin();
  await adminArchiveEvent(eventId, profile.id, reason);
  revalidatePath('/admin/events');
  return { success: true };
}

export async function restoreEventAction(eventId: string, reason?: string) {
  const profile = await requireAdmin();
  await adminRestoreEvent(eventId, profile.id, reason || null);
  revalidatePath('/admin/events');
  return { success: true };
}

export async function changeEventOrganizerAction(eventId: string, newOrganizationId: string, reason?: string) {
  const profile = await requireAdmin();
  await adminChangeEventOrganizer(eventId, newOrganizationId, profile.id, reason || null);
  revalidatePath('/admin/events');
  return { success: true };
}

export async function getOrganizationOptions() {
  await requireAdmin();
  const { data } = await getOrganizations({ page_size: 500 });
  return data.map((org) => ({ id: org.id, name: org.name }));
}

export async function exportEventsAction(): Promise<{ csv: string; error?: string }> {
  await requireAdmin();
  try {
    const [{ data: events }, threshold] = await Promise.all([
      getEventsForAdmin({ page_size: 10000 }),
      getExpiryThresholdISO(),
    ]);
    const counts = await getRegistrationCountsByEvent(events.map((e) => e.id));

    const statusOf = (e: (typeof events)[number]) => {
      if (e.archived_at) return 'archived';
      if (e.is_cancelled) return 'cancelled';
      if (e.is_hidden) return 'hidden';
      if (e.end_date < threshold) return 'expired';
      return e.is_published ? 'published' : 'draft';
    };

    const headers = [
      'Title',
      'Organization',
      'Status',
      'Visibility',
      'Start Date',
      'End Date',
      'City',
      'Category',
      'Registrations',
      'Created At',
    ];
    const rows = events.map((e) => [
      e.title,
      e.organization?.name ?? '',
      statusOf(e),
      e.visibility,
      e.start_date,
      e.end_date,
      e.city ?? '',
      e.category ?? '',
      counts[e.id] ?? 0,
      e.created_at,
    ]);

    return { csv: toCSV(headers, rows) };
  } catch (e) {
    return { csv: '', error: e instanceof Error ? e.message : 'Export failed' };
  }
}
