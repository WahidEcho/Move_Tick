'use server';

import { revalidatePath } from 'next/cache';
import { getEventManageAccess } from '@/lib/auth';
import { getTicketTypes } from '@/services/tickets.service';
import {
  createRedeemItem,
  updateRedeemItem,
  deleteRedeemItem,
  mapRedeemToTicketType,
  removeRedeemMapping,
} from '@/services/redeems.service';
import type {
  CreateRedeemItemData,
  UpdateRedeemItemData,
} from '@/services/redeems.service';

export async function createRedeemItemAction(
  eventId: string,
  data: CreateRedeemItemData
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await createRedeemItem(eventId, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/redeems`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create redeem item',
    };
  }
}

export async function updateRedeemItemAction(
  id: string,
  eventId: string,
  data: UpdateRedeemItemData
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateRedeemItem(id, data);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/redeems`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update redeem item',
    };
  }
}

export async function deleteRedeemItemAction(
  id: string,
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await deleteRedeemItem(id);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/redeems`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete redeem item',
    };
  }
}

export async function mapRedeemAction(
  eventId: string,
  ticketTypeId: string,
  redeemItemId: string,
  quantity: number
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }
  const ticketTypes = await getTicketTypes(eventId);
  if (!ticketTypes.some((tt) => tt.id === ticketTypeId)) {
    return { success: false, error: 'Ticket type not found' };
  }
  try {
    await mapRedeemToTicketType(ticketTypeId, redeemItemId, quantity);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/redeems`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to map redeem to ticket type',
    };
  }
}

export async function removeRedeemMappingAction(
  eventId: string,
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }
  try {
    await removeRedeemMapping(id);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/redeems`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove mapping',
    };
  }
}
