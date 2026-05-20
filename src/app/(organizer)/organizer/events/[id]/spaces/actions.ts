'use server';

import { revalidatePath } from 'next/cache';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import {
  createSpace,
  updateSpace,
  archiveSpace,
} from '@/services/spaces.service';
import type { CreateSpaceData } from '@/services/spaces.service';

export async function createSpaceAction(
  eventId: string,
  data: CreateSpaceData
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await createSpace(eventId, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/spaces`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create space',
    };
  }
}

export async function updateSpaceAction(
  id: string,
  eventId: string,
  data: Partial<CreateSpaceData>
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await updateSpace(id, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/spaces`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update space',
    };
  }
}

export async function archiveSpaceAction(
  id: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await archiveSpace(id);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/spaces`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to archive space',
    };
  }
}
