'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getActiveOrganizerOrg } from '@/lib/auth';
import { createEvent } from '@/services/events.service';
import { assertCanCreateEvent } from '@/lib/org-limits';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';
import type { EventInput } from '@/lib/validations';

export async function createEventAction(
  data: EventInput
): Promise<{ success: true; eventId: string } | { success: false; error: string }> {
  const { org } = await getActiveOrganizerOrg();

  try {
    try {
      await assertCanCreateEvent(org.id);
    } catch (limitErr) {
      const message = limitErr instanceof Error ? limitErr.message : '';
      if (message.includes('event limit')) {
        await sendAdminOrgAlert({
          action: 'Organization reached its event limit',
          organizationId: org.id,
          organizationName: org.name,
          dashboardPath: '/admin/organizations',
        }).catch(() => {});
      }
      throw limitErr;
    }

    const event = await createEvent(org.id, {
      title: data.title,
      slug: data.slug,
      description: data.description,
      short_summary: data.short_summary || null,
      cover_image_url: data.cover_image_url || null,
      promo_video_url: data.promo_video_url || null,
      promo_video_poster_url: data.promo_video_poster_url || null,
      start_date: data.start_date,
      end_date: data.end_date,
      location: data.location ?? null,
      venue: data.venue ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      category: data.category,
      visibility: data.visibility,
      // capacity is derived from ticket types once they're added
      // (recomputeEventCapacity in tickets.service).
      capacity: null,
      doors_open_time: data.doors_open_time || null,
      maps_url: data.maps_url || null,
      facilities: data.facilities ?? [],
      age_restriction: data.age_restriction || null,
      accessibility_notes: data.accessibility_notes || null,
      refund_policy: data.refund_policy || null,
      dress_code: data.dress_code || null,
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
