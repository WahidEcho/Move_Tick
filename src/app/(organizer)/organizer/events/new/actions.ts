'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { createEvent } from '@/services/events.service';
import type { EventInput } from '@/lib/validations';

export async function createEventAction(
  data: EventInput
): Promise<{ success: true; eventId: string } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  try {
    const event = await createEvent(org.id, {
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
    revalidatePath('/organizer/overview');
    revalidatePath('/organizer/events');
    return { success: true, eventId: event.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create event',
    };
  }
}
