'use server';

import { revalidatePath } from 'next/cache';
import { getActiveOrganizerOrg } from '@/lib/auth';
import {
  getEvent,
  updateEvent,
  updateEventSettings,
  publishEvent,
  cancelEvent,
} from '@/services/events.service';
import type { EventInput, EventSettingsInput } from '@/lib/validations';

export async function updateEventAction(
  eventId: string,
  data: EventInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateEvent(eventId, {
      title: data.title,
      slug: data.slug,
      description: data.description,
      cover_image_url: data.cover_image_url || null,
      start_date: data.start_date,
      end_date: data.end_date,
      location: data.location ?? null,
      venue: data.venue ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      category: data.category,
      visibility: data.visibility,
      capacity: data.capacity ?? null,
    });
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update event',
    };
  }
}

export async function updateEventSettingsAction(
  eventId: string,
  data: EventSettingsInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateEventSettings(eventId, {
      approval_required: data.approval_required,
      enable_waitlist: data.enable_waitlist,
      show_guest_list: data.show_guest_list,
      show_registered_count: data.show_registered_count,
      show_remaining_seats: data.show_remaining_seats,
      show_attendee_preview: data.show_attendee_preview,
      show_company_badges: data.show_company_badges,
      allow_referrals: data.allow_referrals,
      allow_chat: data.allow_chat,
      allow_networking: data.allow_networking,
    });
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath(`/organizer/events/${eventId}/settings`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update settings',
    };
  }
}

export async function publishEventAction(
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await publishEvent(eventId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to publish event',
    };
  }
}

export async function cancelEventAction(
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  const event = await getEvent(eventId);
  if (!event || event.organization_id !== org.id) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await cancelEvent(eventId);
    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath(`/organizer/events/${eventId}/settings`);
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel event',
    };
  }
}
