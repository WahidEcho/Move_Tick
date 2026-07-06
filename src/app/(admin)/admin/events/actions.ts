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
