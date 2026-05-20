'use server';

import { revalidatePath } from 'next/cache';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { getEvent } from '@/services/events.service';
import {
  createTicketType,
  updateTicketType,
  deleteTicketType,
} from '@/services/tickets.service';
import type { CreateTicketTypeData } from '@/services/tickets.service';

export async function createTicketTypeAction(
  eventId: string,
  data: CreateTicketTypeData
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await createTicketType(eventId, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/tickets`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create ticket type',
    };
  }
}

export async function updateTicketTypeAction(
  id: string,
  data: Partial<CreateTicketTypeData>,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await updateTicketType(id, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/tickets`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update ticket type',
    };
  }
}

export async function deleteTicketTypeAction(
  id: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();
  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await deleteTicketType(id);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/tickets`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete ticket type',
    };
  }
}
