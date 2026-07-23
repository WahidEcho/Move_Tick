'use server';

import { revalidatePath } from 'next/cache';
import { getEventManageAccess } from '@/lib/auth';
import {
  updateEvent,
  updateEventSettings,
  publishEvent,
  cancelEvent,
} from '@/services/events.service';
import { getTicketTypes } from '@/services/tickets.service';
import { assertCanPublish } from '@/lib/org-limits';
import { sendAdminOrgAlert } from '@/services/admin-alerts.service';
import { getOrganizationMembers } from '@/services/organizations.service';
import { createNotification } from '@/services/notifications.service';
import type { EventInput, EventSettingsInput } from '@/lib/validations';
import { createServiceClient } from '@/lib/supabase-server';

export interface EventStoryInput {
  media: { media_type: 'image' | 'video'; url: string; poster_url?: string | null; alt_text?: string | null; caption?: string | null }[];
  highlights: { title: string; description?: string | null; icon_key?: string | null }[];
  agenda: { starts_at: string; ends_at?: string | null; title: string; description?: string | null; location?: string | null }[];
  speakers: { name: string; role?: string | null; biography?: string | null; image_url?: string | null; social_url?: string | null }[];
  faqs: { question: string; answer: string }[];
}

export async function replaceEventStoryAction(eventId: string, input: EventStoryInput): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) return { success: false, error: 'Event not found' };
  if ([input.media, input.highlights, input.agenda, input.speakers, input.faqs].some((items) => items.length > 40)) {
    return { success: false, error: 'Each story section is limited to 40 items.' };
  }

  const supabase = createServiceClient();
  const sections = [
    ['event_media', input.media],
    ['event_highlights', input.highlights],
    ['event_agenda_items', input.agenda],
    ['event_speakers', input.speakers],
    ['event_faqs', input.faqs],
  ] as const;

  try {
    for (const [table, values] of sections) {
      const { error: deleteError } = await supabase.from(table).delete().eq('event_id', eventId);
      if (deleteError) throw deleteError;
      if (values.length) {
        const rows = values.map((value, sort_order) => ({ ...value, event_id: eventId, sort_order }));
        const { error: insertError } = await supabase.from(table).insert(rows);
        if (insertError) throw insertError;
      }
    }
    revalidatePath(`/organizer/events/${eventId}/edit`);
    revalidatePath(`/events/${access.event.slug}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save event story' };
  }
}

export async function updateEventAction(
  eventId: string,
  data: EventInput
): Promise<{ success: true } | { success: false; error: string }> {
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  try {
    await updateEvent(eventId, {
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
      // capacity intentionally omitted — derived from ticket types
      // (recomputeEventCapacity in tickets.service).
      doors_open_time: data.doors_open_time || null,
      maps_url: data.maps_url || null,
      facilities: data.facilities ?? [],
      age_restriction: data.age_restriction || null,
      accessibility_notes: data.accessibility_notes || null,
      refund_policy: data.refund_policy || null,
      dress_code: data.dress_code || null,
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
  const access = await getEventManageAccess(eventId);
  if (!access) {
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
  const access = await getEventManageAccess(eventId);
  if (!access) {
    return { success: false, error: 'Event not found' };
  }

  const isAdmin = access.profile.platform_role === 'admin';
  const orgId = access.event.organization_id;
  const orgName = access.event.organization?.name ?? 'Unknown organization';

  try {
    // Platform admins bypass organizer limits entirely — they have override
    // authority (this is also how the admin events list's Publish action
    // reaches the same underlying rule-free path via adminSetEventPublished).
    if (!isAdmin) {
      const ticketTypes = await getTicketTypes(eventId);
      const isPaid = ticketTypes.some((tt) => tt.price > 0);

      let limitResult: { requiresApproval: boolean };
      try {
        limitResult = await assertCanPublish(orgId, isPaid);
      } catch (limitErr) {
        const message = limitErr instanceof Error ? limitErr.message : '';
        if (message.includes('published-event limit')) {
          await sendAdminOrgAlert({
            action: 'Organization reached its published-event limit',
            organizationId: orgId,
            organizationName: orgName,
            eventId,
            eventTitle: access.event.title,
            dashboardPath: '/admin/organizations',
          }).catch(() => {});
        }
        throw limitErr;
      }

      if (limitResult.requiresApproval) {
        const members = await getOrganizationMembers(orgId);
        await Promise.allSettled([
          ...members.map((m) =>
            createNotification({
              userId: m.user_id,
              organizationId: orgId,
              type: 'general',
              title: 'Publish request sent for review',
              message: `"${access.event.title}" needs admin approval before it goes live. We've notified the Move-Tick team.`,
              relatedEntityType: 'event',
              relatedEntityId: eventId,
            })
          ),
          sendAdminOrgAlert({
            action: 'Organization requests event publish approval',
            organizationId: orgId,
            organizationName: orgName,
            eventId,
            eventTitle: access.event.title,
            dashboardPath: '/admin/events',
          }),
        ]);

        return {
          success: false,
          error:
            "Your organization requires admin approval before publishing. We've notified the Move-Tick team — you'll be notified once it's approved.",
        };
      }
    }

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
  const access = await getEventManageAccess(eventId);
  if (!access) {
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
